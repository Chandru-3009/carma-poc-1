"""Email-related routes"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from services.email_service import (
    fetch_gmail_emails_internal,
    group_emails_into_threads,
    ai_semantic_filter
)
from services.openai_service import openai_client
from services.prompts import SYSTEM_PROMPT
from services.config import DATA_DIR, OUTPUT_DIR
import json
from pathlib import Path

router = APIRouter(
    prefix="/api",
    tags=["Emails"]
)


class SummarizeRequest(BaseModel):
    project: str
    category: str = "All"
    priority: str | None = None
    role: str | None = None


class AIReplyRequest(BaseModel):
    email: dict


class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str


@router.get("/emails/fetch")
def fetch_gmail_emails():
    """Fetch 10 recent Gmail messages and save to JSON file"""
    emails = fetch_gmail_emails_internal()
    
    return JSONResponse({
        "status": "success",
        "count": len(emails),
        "emails": emails,
        "file_path": "data/emails_cleaned.json"
    })


async def _summarize_emails(project: str, category: str = "All", priority: str = None, role: str = None):
    """Core summarization logic with AI-based semantic filtering"""
    # Load emails from demo_emails.json
    demo_file = DATA_DIR / "demo_emails.json"
    emails = []
    
    if demo_file.exists():
        with open(demo_file, 'r', encoding='utf-8') as f:
            demo_data = json.load(f)
        
        project_data = next((p for p in demo_data.get("projects", []) if p.get("project_name") == project), None)
        if project_data:
            emails = project_data.get("emails", [])
    
    # Fallback to project-specific JSON file
    if not emails:
        project_file = DATA_DIR / f"{project.lower().replace(' ', '_')}.json"
        if project_file.exists():
            with open(project_file, 'r', encoding='utf-8') as f:
                emails = json.load(f)
    
    if not emails:
        raise HTTPException(status_code=404, detail=f"Project data not found: {project}")
    
    # Apply basic filters first
    def norm(s):
        return (s or "").strip().lower()
    
    if priority:
        emails = [e for e in emails if norm(e.get("priority", "")) == norm(priority)]
    
    if role:
        emails = [e for e in emails if role in (e.get("role_visibility", []) or [])]
    
    # AI-based semantic category filtering
    if category and norm(category) != "all":
        filtered_emails = []
        for email in emails:
            if await ai_semantic_filter(email, category):
                filtered_emails.append(email)
        emails = filtered_emails
    
    if not emails:
        return JSONResponse({
            "success": True,
            "message": "No emails match the selected filters",
            "count": 0,
            "project": project,
            "summaries": []
        })
    
    # Process each email through OpenAI
    summaries = []
    for email in emails:
        try:
            completion = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Subject: {email['subject']}\n\nBody: {email['body']}"}
                ],
                temperature=0.3,
                max_tokens=300
            )
            
            ai_response = completion.choices[0].message.content
            
            try:
                clean_response = ai_response.replace("```json", "").replace("```", "").strip()
                clean_response = clean_response.lstrip().lstrip('{').rstrip().rstrip('}')
                if not clean_response.startswith('{'):
                    clean_response = '{' + clean_response
                if not clean_response.endswith('}'):
                    clean_response = clean_response + '}'
                ai_data = json.loads(clean_response)
            except json.JSONDecodeError as e:
                ai_data = {
                    "category": "General",
                    "summary": ai_response[:200] if ai_response else "Unable to generate summary",
                    "action_required": "Review required",
                    "priority": email.get("priority", "Medium"),
                    "due_date": email.get("due_date", "")
                }
            
            summaries.append({
                "id": email.get("id", ""),
                "from": email.get("from", ""),
                "to": email.get("to", ""),
                "subject": email.get("subject", ""),
                "body": email.get("body", ""),
                **ai_data
            })
        except Exception as e:
            summaries.append({
                "id": email.get("id", ""),
                "from": email.get("from", ""),
                "to": email.get("to", ""),
                "subject": email.get("subject", ""),
                "body": email.get("body", ""),
                "category": "General",
                "summary": f"Error processing: {str(e)[:100]}",
                "action_required": "Manual review needed",
                "priority": email.get("priority", "Medium"),
                "due_date": email.get("due_date", "")
            })
    
    # Save to output file
    output_file = OUTPUT_DIR / f"{project.lower().replace(' ', '_')}_summarized.json"
    
    # Load existing summaries to merge
    existing_summaries = []
    if output_file.exists():
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                existing_summaries = json.load(f)
        except:
            existing_summaries = []
    
    existing_dict = {}
    for s in existing_summaries:
        email_id = s.get("id") or s.get("from", "") + s.get("subject", "")
        existing_dict[email_id] = s
    
    for s in summaries:
        email_id = s.get("id") or s.get("from", "") + s.get("subject", "")
        existing_dict[email_id] = s
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(list(existing_dict.values()), f, indent=2, ensure_ascii=False)
    
    return JSONResponse({
        "success": True,
        "message": "Summarization complete",
        "count": len(summaries),
        "project": project,
        "summaries": summaries
    })


@router.get("/summarize")
async def summarize_inbox_get(
    project: str = Query(..., description="Project name to summarize emails for"),
    category: Optional[str] = Query("All", description="Filter by category (uses AI semantic matching)"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    role: Optional[str] = Query(None, description="Filter by role visibility")
):
    """Summarize emails for a specific project with optional filters (GET endpoint)"""
    return await _summarize_emails(project, category or "All", priority, role)


@router.post("/summarize")
async def summarize_inbox_post(request: SummarizeRequest):
    """Summarize emails for a specific project with optional filters (POST endpoint)"""
    return await _summarize_emails(request.project, request.category or "All", request.priority, request.role)


@router.get("/data")
async def get_summarized_data(project: str, category: str = "All"):
    """Get summarized data for a project, optionally filtered by category"""
    output_file = OUTPUT_DIR / f"{project.lower().replace(' ', '_')}_summarized.json"
    
    if not output_file.exists():
        return []
    
    with open(output_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if category == "All" or not category:
        return data
    
    filtered = [item for item in data if item.get("category", "").lower() == category.lower()]
    return filtered


@router.get("/data/projects")
async def get_demo_projects():
    demo_file = DATA_DIR / "demo_emails.json"
    if not demo_file.exists():
        return []
    with open(demo_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get("projects", [])


@router.get("/data/categories")
async def get_categories():
    file_path = DATA_DIR / "categories.json"
    if not file_path.exists():
        return ["All", "RFI", "Material Delay", "Schedule Update", "General", "Submittal", "Coordination"]
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


@router.get("/data/roles")
async def get_roles():
    file_path = DATA_DIR / "roles.json"
    if not file_path.exists():
        return []
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


@router.get("/data/emails")
async def get_emails(project: str | None = None, category: str | None = None, priority: str | None = None, role: str | None = None):
    """Return filtered emails from demo_emails.json."""
    demo_file = DATA_DIR / "demo_emails.json"
    if not demo_file.exists():
        return []
    with open(demo_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    emails = []
    for p in data.get("projects", []):
        if project:
            match = project == p.get("project_id") or project == p.get("project_name")
            if not match:
                continue
        for e in p.get("emails", []):
            enriched = {**e, "project_id": p.get("project_id"), "project_name": p.get("project_name")}
            emails.append(enriched)

    def norm(s):
        return (s or "").strip().lower()

    if category and norm(category) != "all":
        emails = [e for e in emails if norm(e.get("category")) == norm(category)]
    if priority:
        emails = [e for e in emails if norm(e.get("priority")) == norm(priority)]
    if role:
        emails = [e for e in emails if role in (e.get("role_visibility") or [])]

    return emails


@router.post("/ai/reply")
async def generate_ai_reply(request: AIReplyRequest):
    """Generate AI-powered reply suggestions for an email"""
    email = request.email
    
    try:
        subject = email.get("subject", "")
        summary = email.get("summary", "")
        body = email.get("body", "")
        from_email = email.get("from", "")
        category = email.get("category", "")
        
        prompt = f"""You are an AI assistant for a construction company project management team.
        
Based on the following email, generate 3 professional, concise reply options that are contextually appropriate for construction project management.

Email Details:
- From: {from_email}
- Subject: {subject}
- Category: {category}
- Summary: {summary}
- Body: {body[:500]}

Generate 3 reply options that:
1. Are professional and appropriate for construction project communication
2. Address the key points or questions in the email
3. Are concise (2-4 sentences each)
4. Vary in tone (professional, helpful, action-oriented)

Return ONLY a JSON array of 3 reply strings, like this:
["Reply option 1", "Reply option 2", "Reply option 3"]

Do not include any markdown formatting, just the JSON array."""
        
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates professional email replies for construction project management."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=400
        )
        
        ai_response = completion.choices[0].message.content
        
        try:
            clean_response = ai_response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            replies = json.loads(clean_response)
            
            if isinstance(replies, list) and len(replies) > 0:
                return JSONResponse({"replies": replies[:3]})
            else:
                if isinstance(replies, str):
                    replies = [replies]
        except json.JSONDecodeError:
            lines = [line.strip() for line in ai_response.split('\n') if line.strip()]
            replies = [line for line in lines if line and not line.startswith('#') and len(line) > 20][:3]
            
            if not replies:
                replies = [ai_response[:300]]
        
        return JSONResponse({"replies": replies})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI replies: {str(e)}")


@router.post("/sendEmail")
async def send_email(request: SendEmailRequest):
    """Mock email sending endpoint - logs the email"""
    try:
        email_data = {
            "to": request.to,
            "subject": request.subject,
            "body": request.body,
            "status": "sent",
            "timestamp": str(OUTPUT_DIR / "sent_emails.log")
        }
        
        print(f"\n{'='*60}")
        print(f"EMAIL SENT (Mock)")
        print(f"{'='*60}")
        print(f"To: {request.to}")
        print(f"Subject: {request.subject}")
        print(f"Body:\n{request.body}")
        print(f"{'='*60}\n")
        
        log_file = OUTPUT_DIR / "sent_emails.log"
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"\n{json.dumps(email_data, ensure_ascii=False, indent=2)}\n")
        
        return JSONResponse({
            "status": "sent",
            "to": request.to,
            "subject": request.subject,
            "message": "Email sent successfully (mock)"
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/emails/analyze")
def analyze_emails():
    """Analyze Gmail emails and return AI-powered insights"""
    
    try:
        # Step 1: Fetch emails
        emails = fetch_gmail_emails_internal()
        
        # Step 2: Group emails into threads
        threads = group_emails_into_threads(emails)
        
        # Step 3: Analyze each thread with AI
        analyses = []
        for thread_key, thread_emails in threads.items():
            if thread_emails:
                analysis = analyze_email_thread_with_ai(thread_emails)
                analyses.append(analysis)
        
        # Step 4: Save analysis results
        analysis_file = OUTPUT_DIR / "ai_inbox_analysis.json"
        with open(analysis_file, "w", encoding="utf-8") as f:
            json.dump(analyses, f, indent=2, ensure_ascii=False)
        
        # Step 5: Return results
        return JSONResponse({
            "status": "success",
            "thread_count": len(analyses),
            "total_emails": len(emails),
            "analyses": analyses,
            "file_path": str(analysis_file)
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email analysis failed: {str(e)}")


def analyze_email_thread_with_ai(thread_emails: list) -> dict:
    """Analyze an email thread using AI with few-shot chain-of-thought reasoning"""
    
    system_prompt = """You are an AI analyst that reviews construction project email threads and identifies communication patterns, responsiveness issues, and schedule risks.

Think step-by-step internally but output only valid JSON matching the schema provided. Do not include explanations or reasoning in your response."""

    user_prompt = """You will receive a single email thread as an array of objects. Each object has: id, from, subject, date, snippet, body.

TASK:
1. Group all related emails.
2. Determine if follow-up behavior exists (repeated requests from same sender).
3. Check if there is any reply from the recipient.
4. Infer project context and risk level.
5. Output structured JSON ONLY matching the schema below.

FEW-SHOT EXAMPLES:

EXAMPLE 1 INPUT:
[
  {"from":"pm@builder.com","subject":"RFI #205 - Ceiling Type Confirmation","date":"2025-09-10 10:00","body":"Please confirm ceiling type for Corridor A."},
  {"from":"architect@consultant.com","subject":"Re: RFI #205 - Ceiling Type Confirmation","date":"2025-09-11 12:00","body":"Confirmed: ACT ceiling as per Section 095123."}
]

EXAMPLE 1 OUTPUT:
{
  "thread_subject": "RFI #205 - Ceiling Type Confirmation",
  "project_guess": "Corridor A",
  "participants": {
    "from_domain": "builder.com",
    "to_domain": "consultant.com",
    "senders": ["pm@builder.com"],
    "receivers": ["architect@consultant.com"]
  },
  "counts": { "total_emails": 2, "follow_up_count": 1, "unanswered_emails": 0 },
  "timeline": { "first_email_date": "2025-09-10", "last_email_date": "2025-09-11", "days_between_first_and_last": 1 },
  "response_detected": true,
  "issue_detected": "RFI answered promptly",
  "impact_area": "Design Clarification",
  "risk_level": "LOW",
  "reason": "Consultant responded within 1 day.",
  "recommended_action": "Close RFI in project log.",
  "kpis": { "avg_gap_days": 1.0, "last_gap_days": 1.0 }
}

EXAMPLE 2 INPUT:
[
  {"from":"sarah.chen@carma-build.com","subject":"Ship Date Needed for Penthouse A Custom Casework","date":"2025-10-18 10:42","body":"Requesting ship date for Penthouse A cabinetry."},
  {"from":"sarah.chen@carma-build.com","subject":"Follow-Up – Ship Date for Penthouse A Casework","date":"2025-10-21 09:05","body":"Following up on ship date request."},
  {"from":"sarah.chen@carma-build.com","subject":"URGENT – Penthouse A Casework Ship Date Required","date":"2025-10-24 08:14","body":"Third request. Coordination meeting on Friday; need confirmation."}
]

EXAMPLE 2 OUTPUT:
{
  "thread_subject": "Ship Date Needed for Penthouse A Custom Casework",
  "project_guess": "Penthouse A",
  "participants": {
    "from_domain": "carma-build.com",
    "to_domain": "elitemillwork.com",
    "senders": ["sarah.chen@carma-build.com"],
    "receivers": []
  },
  "counts": { "total_emails": 3, "follow_up_count": 3, "unanswered_emails": 3 },
  "timeline": { "first_email_date": "2025-10-18", "last_email_date": "2025-10-24", "days_between_first_and_last": 6 },
  "response_detected": false,
  "issue_detected": "Non-responsive subcontractor",
  "impact_area": "Procurement/Schedule",
  "risk_level": "HIGH",
  "reason": "Multiple follow-ups with no reply from vendor; possible delay.",
  "recommended_action": "Escalate to vendor leadership and PM; mark procurement risk.",
  "kpis": { "avg_gap_days": 2.0, "last_gap_days": 3.0 }
}

NOW ANALYZE THIS THREAD:
"""

    thread_data = json.dumps(thread_emails, indent=2)
    full_prompt = user_prompt + thread_data

    try:
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_prompt}
            ],
            temperature=0.2,
            max_tokens=1000
        )
        
        ai_response = completion.choices[0].message.content
        
        try:
            clean_response = ai_response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            analysis = json.loads(clean_response)
            return analysis
        except json.JSONDecodeError:
            return {
                "thread_subject": thread_emails[0].get("subject", "") if thread_emails else "",
                "project_guess": "Unknown",
                "participants": {},
                "counts": {"total_emails": len(thread_emails), "follow_up_count": 0, "unanswered_emails": 0},
                "timeline": {},
                "response_detected": False,
                "issue_detected": "AI parsing error",
                "impact_area": "Unknown",
                "risk_level": "UNKNOWN",
                "reason": "Failed to parse AI response",
                "recommended_action": "Manual review required",
                "kpis": {"avg_gap_days": 0, "last_gap_days": 0}
            }
    
    except Exception as e:
        print(f"AI analysis error: {str(e)}")
        return {
            "thread_subject": thread_emails[0].get("subject", "") if thread_emails else "",
            "project_guess": "Unknown",
            "participants": {},
            "counts": {"total_emails": len(thread_emails), "follow_up_count": 0, "unanswered_emails": 0},
            "timeline": {},
            "response_detected": False,
            "issue_detected": f"AI call failed: {str(e)}",
            "impact_area": "Unknown",
            "risk_level": "UNKNOWN",
            "reason": "OpenAI API error",
            "recommended_action": "Retry or manual review",
            "kpis": {"avg_gap_days": 0, "last_gap_days": 0}
        }

