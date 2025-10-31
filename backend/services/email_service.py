"""Email-related service functions"""
from fastapi import HTTPException
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from bs4 import BeautifulSoup
from services.openai_service import openai_client
from services.prompts import FILTER_PROMPT
from services.config import GMAIL_SCOPES, DATA_DIR, OUTPUT_DIR
import html
import json
import base64
import re
from pathlib import Path


async def ai_semantic_filter(email: dict, target_category: str) -> bool:
    """Use AI to determine if email semantically matches the target category"""
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": FILTER_PROMPT.format(
                    category=target_category,
                    subject=email.get("subject", ""),
                    body=email.get("body", "")[:500]
                )}
            ],
            temperature=0.1,
            max_tokens=10
        )
        result = response.choices[0].message.content.strip().lower()
        return result.startswith("yes")
    except Exception:
        # Fallback to keyword matching if AI fails
        keywords = {
            "rfi": ["rfi", "request for information", "clarification", "need to confirm", "please clarify"],
            "material delay": ["delay", "delayed", "shipment", "delivery", "supply", "fabrication"],
            "schedule update": ["schedule", "timeline", "milestone", "progress", "completion"],
            "submittal": ["submittal", "shop drawing", "product data", "samples", "documentation package"],
            "coordination": ["coordination", "conflict", "meeting", "coordinate", "conflicting"],
            "general": []
        }
        cat_lower = target_category.lower()
        search_text = f"{email.get('subject', '')} {email.get('body', '')}".lower()
        if cat_lower in keywords:
            return any(keyword in search_text for keyword in keywords[cat_lower])
        return False


def clean_email_body(raw_body: str, max_length: int = 1000) -> str:
    """Clean HTML email body to readable text"""
    if not raw_body:
        return ""
    
    try:
        soup = BeautifulSoup(raw_body, "html.parser")
        for tag in soup(["script", "style"]):
            tag.extract()
        
        text = soup.get_text(separator=" ", strip=True)
        text = html.unescape(text)
        text = " ".join(text.split())
        
        if len(text) > max_length:
            text = text[:max_length] + "..."
        
        return text
    
    except Exception as e:
        # Fallback: basic HTML tag removal with regex
        text = re.sub(r'<[^>]+>', ' ', raw_body)
        text = html.unescape(text)
        text = " ".join(text.split())
        return text[:max_length] if len(text) > max_length else text


def extract_email_address(sender: str) -> str:
    """Extract clean email address from sender field"""
    if not sender:
        return ""
    
    if "<" in sender and ">" in sender:
        email = sender.split("<")[1].split(">")[0]
        return email.strip()
    
    return sender.strip()


def normalize_subject(subject: str) -> str:
    """Normalize email subject by removing Re:/Fwd: prefixes for thread grouping"""
    if not subject:
        return ""
    
    normalized = subject.lower().strip()
    prefixes = ["re:", "fwd:", "fw:", "re [", "fwd ["]
    
    for prefix in prefixes:
        if normalized.startswith(prefix):
            normalized = normalized[len(prefix):].strip()
    
    return normalized


def group_emails_into_threads(emails: list) -> dict:
    """Group emails by normalized subject to identify threads"""
    threads = {}
    
    for email in emails:
        subject = email.get("subject", "")
        normalized = normalize_subject(subject)
        key = normalized if normalized else subject
        
        if key not in threads:
            threads[key] = []
        
        threads[key].append(email)
    
    # Sort each thread by date ascending
    for thread_key in threads:
        threads[thread_key].sort(key=lambda x: x.get("date", ""))
    
    return threads


def get_gmail_service():
    """Get authenticated Gmail service - shared helper for all Gmail operations"""
    creds = None
    creds_path = Path(__file__).parent.parent / "credentials.json"
    token_path = Path(__file__).parent.parent / "token.json"
    print("path--->", creds_path)

    # Step 1: Load existing credentials or generate a new token
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), GMAIL_SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not creds_path.exists():
                raise HTTPException(
                    status_code=400,
                    detail="credentials.json not found. Please download it from Google Cloud Console and place it in the backend directory."
                )
            
            # Load credentials and validate
            try:
                with open(creds_path, 'r') as f:
                    client_config = json.load(f)
                
                print(f"DEBUG: Credentials file contains: {list(client_config.keys())}")
                
                # Check if it's a service account (not supported for user-based OAuth)
                if 'type' in client_config and client_config.get('type') == 'service_account':
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "❌ Service Account credentials detected!\n\n"
                            "Service accounts cannot be used for Gmail API user access.\n"
                            "You need OAuth Desktop App credentials instead.\n\n"
                            "📋 How to fix:\n"
                            "1. Go to: https://console.cloud.google.com/apis/credentials\n"
                            "2. Click 'Create Credentials' → 'OAuth client ID'\n"
                            "3. **IMPORTANT**: Select 'Desktop app' (NOT Service account)\n"
                            "4. Configure OAuth consent screen if prompted\n"
                            "5. Download the credentials file\n"
                            "6. Replace credentials.json with the downloaded file\n\n"
                            "The correct credentials.json should have an 'installed' key at the root level."
                        )
                    )
                
                # Validate client config type
                if 'installed' not in client_config and 'web' not in client_config:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Invalid credentials.json format. Found keys: {list(client_config.keys())}.\n\n"
                            "The file must contain either:\n"
                            "- 'installed' (for Desktop OAuth app) ✓\n"
                            "- 'web' (for Web OAuth app)\n\n"
                            "You currently have: Service Account credentials (not supported)\n\n"
                            "Please download Desktop OAuth app credentials from Google Cloud Console."
                        )
                    )
                
                # Use InstalledAppFlow for desktop app credentials
                if 'installed' in client_config:
                    flow = InstalledAppFlow.from_client_config(client_config, GMAIL_SCOPES)
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Web application credentials detected. Please use 'Desktop app' credentials instead. "
                            "Steps to fix:\n"
                            "1. Go to Google Cloud Console → APIs & Services → Credentials\n"
                            "2. Click 'Create Credentials' → 'OAuth client ID'\n"
                            "3. Select 'Desktop app' (NOT Web application)\n"
                            "4. Download and replace credentials.json"
                        )
                    )
                
                creds = flow.run_local_server(port=0)
                
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid JSON in credentials.json file: {str(e)}. Please check the file format."
                )
        
        # Save credentials for future use
        with open(token_path, "w") as token:
            token.write(creds.to_json())

    # Step 2: Connect to Gmail API
    service = build("gmail", "v1", credentials=creds)
    return service


def fetch_gmail_emails_internal():
    """Internal function to fetch Gmail emails - returns data without HTTP response"""
    service = get_gmail_service()

    try:
        # Step 3: Fetch recent messages
        results = service.users().messages().list(userId="me", maxResults=10).execute()
        messages = results.get("messages", [])

        emails = []

        # Step 4: Parse each email
        for msg in messages:
            msg_data = service.users().messages().get(userId="me", id=msg["id"]).execute()
            payload = msg_data.get("payload", {})
            headers = payload.get("headers", [])
            subject = next((h["value"] for h in headers if h["name"] == "Subject"), "")
            sender = next((h["value"] for h in headers if h["name"] == "From"), "")
            date = next((h["value"] for h in headers if h["name"] == "Date"), "")
            snippet = msg_data.get("snippet", "")

            # Decode email body if available
            raw_body = ""
            parts = payload.get("parts", [])
            if parts:
                # Check for HTML first, then plain text
                html_body = ""
                plain_body = ""
                for part in parts:
                    mime_type = part.get("mimeType", "")
                    data = part.get("body", {}).get("data")
                    if data:
                        decoded = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
                        if mime_type == "text/html":
                            html_body = decoded
                        elif mime_type == "text/plain":
                            plain_body = decoded
                
                raw_body = html_body if html_body else plain_body
            else:
                # Single part message
                body_data = payload.get("body", {}).get("data")
                if body_data:
                    raw_body = base64.urlsafe_b64decode(body_data).decode("utf-8", errors="ignore")

            # Clean the email body
            cleaned_body = clean_email_body(raw_body)
            
            # Clean sender email address
            clean_sender = extract_email_address(sender)
            
            # Clean snippet
            clean_snippet = html.unescape(snippet)

            # Format and add to emails list
            emails.append({
                "id": msg["id"],
                "from": clean_sender,
                "subject": subject,
                "date": date,
                "snippet": clean_snippet,
                "body": cleaned_body,
                "clean_status": "ok"
            })

        # Step 5: Save cleaned emails to JSON file
        emails_file = DATA_DIR / "emails_cleaned.json"
        with open(emails_file, "w", encoding="utf-8") as f:
            json.dump(emails, f, indent=2, ensure_ascii=False)

        return emails
    
    except Exception as e:
        raise Exception(f"Failed to fetch Gmail messages: {str(e)}")

