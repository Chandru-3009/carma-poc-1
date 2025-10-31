"""Report-related routes"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.openai_service import openai_client
from services.email_service import fetch_gmail_emails_internal
from services.config import DATA_DIR, OUTPUT_DIR
import json
import re
from pathlib import Path

router = APIRouter(
    prefix="/api",
    tags=["Reports"]
)


class WeeklyReportRequest(BaseModel):
    project_name: str
    start_date: str
    end_date: str


@router.post("/reports/weekly")
def generate_weekly_report(request: WeeklyReportRequest):
    """Generate a weekly AI project report by analyzing emails"""
    
    try:
        emails_file = DATA_DIR / "emails_cleaned.json"
        if not emails_file.exists():
            raise HTTPException(status_code=404, detail="Emails file not found. Please fetch emails first using /api/emails/fetch")
        
        with open(emails_file, 'r', encoding='utf-8') as f:
            all_emails = json.load(f)
        
        filtered_emails = []
        project_name_lower = request.project_name.lower()
        
        for email in all_emails:
            email_date_str = email.get("date", "")
            
            try:
                if email_date_str:
                    date_match = re.search(r'(\d{1,2})\s+(\w{3})\s+(\d{4})', email_date_str)
                    if date_match:
                        pass
            except:
                pass
            
            subject = email.get("subject", "").lower()
            body = email.get("body", "").lower()
            
            if project_name_lower in subject or project_name_lower in body:
                filtered_emails.append(email)
        
        if not filtered_emails:
            filtered_emails = all_emails[:10]
        
        system_prompt = """You are an AI Project Manager Assistant.
You analyze construction project emails and generate weekly progress reports.
You must reason step-by-step internally (chain-of-thought),
but output only the final structured JSON strictly following the schema."""

        schema = """
{
  "project_name": "string",
  "week_range": "string",
  "progress_highlights": ["string"],
  "active_issues": ["string"],
  "subcontractor_performance": {
    "responsive": ["string"],
    "attention_needed": ["string"],
    "average_response_time_hours": number
  },
  "schedule_status": {
    "overall": "On Track | Behind | Ahead",
    "critical_path_float_days": number,
    "substantial_completion_date": "YYYY-MM-DD"
  },
  "upcoming_milestones": ["string"],
  "budget_and_changes": {
    "change_orders_this_week": number,
    "contingency_remaining_percent": number
  },
  "ai_summary_metadata": {
    "confidence_score": number (0-1),
    "key_tags": ["string"],
    "generated_at": "YYYY-MM-DDTHH:MM:SSZ"
  }
}
"""

        few_shot_example = """EXAMPLE 1 OUTPUT:
{
  "project_name": "Skyline Tower",
  "week_range": "Oct 10 - Oct 15, 2025",
  "progress_highlights": [
    "Concrete slab pour for Level 5 completed on schedule.",
    "Window frame installation began on north façade."
  ],
  "active_issues": [
    "HVAC duct delay reported due to late shipment."
  ],
  "subcontractor_performance": {
    "responsive": ["ABC Electrical"],
    "attention_needed": ["HVAC Solutions"],
    "average_response_time_hours": 8
  },
  "schedule_status": {
    "overall": "Slightly Behind",
    "critical_path_float_days": -1,
    "substantial_completion_date": "2026-02-12"
  },
  "upcoming_milestones": [
    "Oct 18: Waterproofing inspection",
    "Oct 20: Interior wall framing Level 6"
  ],
  "budget_and_changes": {
    "change_orders_this_week": 1,
    "contingency_remaining_percent": 4.8
  },
  "ai_summary_metadata": {
    "confidence_score": 0.91,
    "key_tags": ["schedule", "delay", "progress"],
    "generated_at": "2025-10-15T17:30:00Z"
  }
}"""

        user_prompt = f"""PROJECT: {request.project_name}
DATE RANGE: {request.start_date} - {request.end_date}

EMAIL DATA:
{json.dumps(filtered_emails, indent=2)[:5000]}...

TASK:
1. Identify key progress updates from the emails.
2. Summarize active issues or risks mentioned.
3. Evaluate subcontractor performance based on email response patterns.
4. Assess schedule and budget status from email communications.
5. Predict upcoming milestones based on current progress.
6. Return the result strictly in the JSON schema below.

{few_shot_example}

NOW ANALYZE AND OUTPUT JSON FOR PROJECT: {request.project_name}
JSON SCHEMA:
{schema}
"""

        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=1500
        )
        
        ai_response = completion.choices[0].message.content
        
        try:
            clean_response = ai_response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            report_data = json.loads(clean_response)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
        
        weekly_reports_dir = OUTPUT_DIR / "weekly_reports"
        weekly_reports_dir.mkdir(exist_ok=True)
        
        safe_project_name = re.sub(r'[^a-zA-Z0-9_-]', '_', request.project_name)
        report_filename = f"{safe_project_name}_{request.start_date}_{request.end_date}.json"
        report_file = weekly_reports_dir / report_filename
        
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        summary_lines = [
            f"**{report_data.get('project_name', request.project_name)} – WEEKLY STATUS REPORT**",
            f"\n**Week:** {report_data.get('week_range', request.start_date + ' - ' + request.end_date)}",
            "\n**Progress Highlights:**"
        ]
        
        for highlight in report_data.get('progress_highlights', [])[:5]:
            summary_lines.append(f"• {highlight}")
        
        if report_data.get('active_issues'):
            summary_lines.append("\n**Active Issues:**")
            for issue in report_data.get('active_issues', [])[:5]:
                summary_lines.append(f"• {issue}")
        
        summary_lines.append(f"\n**Schedule Status:** {report_data.get('schedule_status', {}).get('overall', 'Unknown')}")
        summary_lines.append(f"**AI Confidence:** {report_data.get('ai_summary_metadata', {}).get('confidence_score', 0):.2f}")
        
        report_summary = "\n".join(summary_lines)
        
        return JSONResponse({
            "status": "success",
            "project_name": request.project_name,
            "report_file": str(report_file),
            "report_summary": report_summary,
            "ai_confidence": report_data.get('ai_summary_metadata', {}).get('confidence_score', 0),
            "full_report": report_data
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weekly report generation failed: {str(e)}")

