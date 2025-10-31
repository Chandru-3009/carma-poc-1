"""Email routes with attachment handling"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from services.email_service import get_gmail_service, clean_email_body, extract_email_address
from services.config import DATA_DIR
import html
import json
import base64
from pathlib import Path

router = APIRouter(
    prefix="/api",
    tags=["Emails with Attachments"]
)


@router.get("/emails/fetch-with-attachments")
def fetch_gmail_emails_with_attachments():
    """
    Fetch the latest Gmail emails (max 10) and download attachments if present.
    Save attachments to /data/attachments/.
    """
    service = get_gmail_service()

    try:
        # Fetch recent messages
        results = service.users().messages().list(userId="me", maxResults=10).execute()
        messages = results.get("messages", [])

        emails = []

        # Parse each email
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
                body_data = payload.get("body", {}).get("data")
                if body_data:
                    raw_body = base64.urlsafe_b64decode(body_data).decode("utf-8", errors="ignore")

            # Clean the email body
            cleaned_body = clean_email_body(raw_body)
            
            # Clean sender email address
            clean_sender = extract_email_address(sender)
            
            # Clean snippet
            clean_snippet = html.unescape(snippet)

            # Process attachments
            attachments_list = []
            try:
                for part in payload.get("parts", []):
                    if part.get("filename") and part.get("body", {}).get("attachmentId"):
                        filename = part.get("filename")
                        attachment_id = part.get("body", {}).get("attachmentId")
                        mime_type = part.get("mimeType", "")
                        
                        # Download attachment
                        attachment = service.users().messages().attachments().get(
                            userId="me",
                            messageId=msg["id"],
                            id=attachment_id
                        ).execute()
                        
                        # Decode Base64 data
                        file_data = base64.urlsafe_b64decode(attachment["data"].encode("UTF-8"))
                        
                        # Save file
                        attachments_dir = DATA_DIR / "attachments"
                        attachments_dir.mkdir(parents=True, exist_ok=True)
                        file_path = attachments_dir / filename
                        
                        with open(file_path, "wb") as f:
                            f.write(file_data)
                        
                        # Add to attachments list
                        attachments_list.append({
                            "filename": filename,
                            "path": str(file_path),
                            "mimeType": mime_type,
                            "size_kb": round(len(file_data) / 1024, 2)
                        })
                        
                        print(f"📎 Attachment saved: {filename} ({len(file_data)} bytes)")
                
                if attachments_list:
                    print(f"📎 {len(attachments_list)} attachments fetched for email: {subject}")
            
            except Exception as e:
                print(f"Warning: Failed to process attachments for email {subject}: {str(e)}")
                # Continue processing even if attachment download fails

            # Format and add to emails list
            email_obj = {
                "id": msg["id"],
                "from": clean_sender,
                "subject": subject,
                "date": date,
                "snippet": clean_snippet,
                "body": cleaned_body,
                "clean_status": "ok",
                "attachments": attachments_list,
                "has_attachments": len(attachments_list) > 0
            }
            
            emails.append(email_obj)

        # Save emails with attachments to JSON file
        emails_file = DATA_DIR / "emails_with_attachments.json"
        with open(emails_file, "w", encoding="utf-8") as f:
            json.dump(emails, f, indent=2, ensure_ascii=False)

        return JSONResponse({
            "status": "success",
            "count": len(emails),
            "total_attachments": sum(len(email["attachments"]) for email in emails),
            "emails": emails,
            "file_path": str(emails_file)
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Gmail messages with attachments: {str(e)}")

