from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI
from dotenv import load_dotenv
import json
import os
from pathlib import Path

load_dotenv()

app = FastAPI(title="Carma Construction AI API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Enhanced AI prompt for classification and summarization
SYSTEM_PROMPT = """You are an AI assistant for a construction project management system.

Analyze the following email and:
1. Determine which category it belongs to (choose from):
   - RFI: Requests for Information, clarification questions, technical queries
   - Material Delay: Delivery delays, shipment issues, supply chain problems
   - Schedule Update: Progress updates, timeline changes, milestone reports
   - Submittal: Product data sheets, shop drawings, material samples, documentation packages
   - Coordination: Trade coordination, conflicts, meetings, collaborative discussions
   - General: General communications, updates, announcements, administrative messages

2. Summarize the email in 1-2 concise sentences.

3. Identify the next required action or follow-up needed.

4. Assess priority (High, Medium, Low) based on urgency and impact.

5. Extract or infer due date if mentioned (format: YYYY-MM-DD), otherwise return empty string.

Return your answer as valid JSON only (no markdown, no code blocks):
{
  "category": "Category name",
  "summary": "Short summary of the email",
  "action_required": "Next step or follow-up action",
  "priority": "High | Medium | Low",
  "due_date": "YYYY-MM-DD or empty string"
}"""

# Semantic filtering prompt
FILTER_PROMPT = """You are analyzing an email to determine if it matches a specific category.

Category to match: {category}

Email subject: {subject}
Email body: {body}

Categories:
- RFI: Requests for Information, clarification questions, technical queries
- Material Delay: Delivery delays, shipment issues, supply chain problems  
- Schedule Update: Progress updates, timeline changes, milestone reports
- Submittal: Product data sheets, shop drawings, material samples, documentation packages
- Coordination: Trade coordination, conflicts, meetings, collaborative discussions
- General: General communications, updates, announcements, administrative messages

Respond with ONLY "yes" or "no" - does this email semantically match the category "{category}"?"""

# Base paths
DATA_DIR = Path(__file__).parent / "data"
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


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


async def ai_semantic_filter(email: dict, target_category: str) -> bool:
    """Use AI to determine if email semantically matches the target category"""
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": FILTER_PROMPT.format(
                    category=target_category,
                    subject=email.get("subject", ""),
                    body=email.get("body", "")[:500]  # Limit body length for efficiency
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


@app.get("/api/projects")
async def get_projects():
    """Return list of available projects"""
    demo_file = DATA_DIR / "demo_emails.json"
    if not demo_file.exists():
        return []
    with open(demo_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return [p.get("project_name") for p in data.get("projects", [])]


@app.get("/api/summarize")
async def summarize_inbox_get(
    project: str = Query(..., description="Project name to summarize emails for"),
    category: Optional[str] = Query("All", description="Filter by category (uses AI semantic matching)"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    role: Optional[str] = Query(None, description="Filter by role visibility")
):
    """Summarize emails for a specific project with optional filters (GET endpoint)"""
    return await _summarize_emails(project, category or "All", priority, role)


@app.post("/api/summarize")
async def summarize_inbox_post(request: SummarizeRequest):
    """Summarize emails for a specific project with optional filters (POST endpoint)"""
    return await _summarize_emails(request.project, request.category or "All", request.priority, request.role)


async def _summarize_emails(project: str, category: str = "All", priority: str = None, role: str = None):
    """Core summarization logic with AI-based semantic filtering"""
    # Load emails from demo_emails.json
    demo_file = DATA_DIR / "demo_emails.json"
    emails = []
    
    if demo_file.exists():
        with open(demo_file, 'r', encoding='utf-8') as f:
            demo_data = json.load(f)
        
        # Find project in demo data
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
    
    # AI-based semantic category filtering (if category is specified)
    if category and norm(category) != "all":
        filtered_emails = []
        for email in emails:
            # Use AI to determine semantic match
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
    
    # Process each email through OpenAI for classification and summarization
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
            
            # Parse AI response
            try:
                clean_response = ai_response.replace("```json", "").replace("```", "").strip()
                # Remove any leading/trailing whitespace and newlines
                clean_response = clean_response.lstrip().lstrip('{').rstrip().rstrip('}')
                if not clean_response.startswith('{'):
                    clean_response = '{' + clean_response
                if not clean_response.endswith('}'):
                    clean_response = clean_response + '}'
                ai_data = json.loads(clean_response)
            except json.JSONDecodeError as e:
                # Fallback parsing
                ai_data = {
                    "category": "General",
                    "summary": ai_response[:200] if ai_response else "Unable to generate summary",
                    "action_required": "Review required",
                    "priority": email.get("priority", "Medium"),
                    "due_date": email.get("due_date", "")
                }
            
            # Merge AI output with email data, including original body for reply generation
            summaries.append({
                "id": email.get("id", ""),
                "from": email.get("from", ""),
                "to": email.get("to", ""),
                "subject": email.get("subject", ""),
                "body": email.get("body", ""),  # Include original body for reply context
                **ai_data
            })
        except Exception as e:
            summaries.append({
                "id": email.get("id", ""),
                "from": email.get("from", ""),
                "to": email.get("to", ""),
                "subject": email.get("subject", ""),
                "body": email.get("body", ""),  # Include original body for reply context
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
    
    # Create a dictionary keyed by email id for merging
    existing_dict = {}
    for s in existing_summaries:
        email_id = s.get("id") or s.get("from", "") + s.get("subject", "")
        existing_dict[email_id] = s
    
    # Update with new summaries
    for s in summaries:
        email_id = s.get("id") or s.get("from", "") + s.get("subject", "")
        existing_dict[email_id] = s
    
    # Save merged results
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(list(existing_dict.values()), f, indent=2, ensure_ascii=False)
    
    return JSONResponse({
        "success": True,
        "message": "Summarization complete",
        "count": len(summaries),
        "project": project,
        "summaries": summaries
    })


@app.get("/api/data")
async def get_summarized_data(project: str, category: str = "All"):
    """Get summarized data for a project, optionally filtered by category"""
    output_file = OUTPUT_DIR / f"{project.lower().replace(' ', '_')}_summarized.json"
    
    if not output_file.exists():
        return []
    
    with open(output_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if category == "All" or not category:
        return data
    
    # Filter by category
    filtered = [item for item in data if item.get("category", "").lower() == category.lower()]
    return filtered


# --- Demo data API for filters ---
@app.get("/api/data/projects")
async def get_demo_projects():
    demo_file = DATA_DIR / "demo_emails.json"
    if not demo_file.exists():
        return []
    with open(demo_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get("projects", [])


@app.get("/api/data/categories")
async def get_categories():
    file_path = DATA_DIR / "categories.json"
    if not file_path.exists():
        return ["All", "RFI", "Material Delay", "Schedule Update", "General", "Submittal", "Coordination"]
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


@app.get("/api/data/roles")
async def get_roles():
    file_path = DATA_DIR / "roles.json"
    if not file_path.exists():
        return []
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


@app.get("/api/data/emails")
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

    # Apply additional filters
    def norm(s):
        return (s or "").strip().lower()

    if category and norm(category) != "all":
        emails = [e for e in emails if norm(e.get("category")) == norm(category)]
    if priority:
        emails = [e for e in emails if norm(e.get("priority")) == norm(priority)]
    if role:
        emails = [e for e in emails if role in (e.get("role_visibility") or [])]

    return emails


@app.post("/api/ai/reply")
async def generate_ai_reply(request: AIReplyRequest):
    """Generate AI-powered reply suggestions for an email"""
    email = request.email
    
    try:
        # Build context from email data
        subject = email.get("subject", "")
        summary = email.get("summary", "")
        body = email.get("body", "")
        from_email = email.get("from", "")
        category = email.get("category", "")
        
        # Create a prompt for AI reply generation
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
        
        # Parse AI response
        try:
            # Clean response
            clean_response = ai_response.strip()
            # Remove markdown code blocks if present
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            # Try to parse as JSON array
            replies = json.loads(clean_response)
            
            # Ensure it's a list
            if isinstance(replies, list) and len(replies) > 0:
                return JSONResponse({"replies": replies[:3]})  # Return max 3 replies
            else:
                # If not a list, split by newlines or create single reply
                if isinstance(replies, str):
                    replies = [replies]
        except json.JSONDecodeError:
            # Fallback: try to extract replies from text
            lines = [line.strip() for line in ai_response.split('\n') if line.strip()]
            replies = [line for line in lines if line and not line.startswith('#') and len(line) > 20][:3]
            
            if not replies:
                # Last resort: use the full response as a single reply
                replies = [ai_response[:300]]
        
        return JSONResponse({"replies": replies})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI replies: {str(e)}")


@app.post("/api/sendEmail")
async def send_email(request: SendEmailRequest):
    """Mock email sending endpoint - logs the email"""
    try:
        # In a real implementation, this would send an email via SMTP or email service
        # For now, we'll just log it
        
        email_data = {
            "to": request.to,
            "subject": request.subject,
            "body": request.body,
            "status": "sent",
            "timestamp": str(Path(__file__).parent / "output" / "sent_emails.log")
        }
        
        # Log to console (in production, send actual email)
        print(f"\n{'='*60}")
        print(f"EMAIL SENT (Mock)")
        print(f"{'='*60}")
        print(f"To: {request.to}")
        print(f"Subject: {request.subject}")
        print(f"Body:\n{request.body}")
        print(f"{'='*60}\n")
        
        # Optionally save to a log file
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


@app.get("/api/non-responsive-subcontractors")
async def get_non_responsive_subcontractors(project: Optional[str] = None):
    """Get non-responsive subcontractors data"""
    data_file = DATA_DIR / "non_responsive_subcontractors.json"
    
    if not data_file.exists():
        return []
    
    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Filter by project if specified
    if project:
        data = [item for item in data if item.get("project_guess", "").lower() == project.lower()]
    
    return data


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Carma API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)

