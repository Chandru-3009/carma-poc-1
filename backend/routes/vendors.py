"""Vendor-related routes"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.openai_service import openai_client
import json

router = APIRouter(
    prefix="/api",
    tags=["Vendors"]
)


class SubcontractorReplyRequest(BaseModel):
    subcontractor_data: dict


@router.post("/vendors/generate-reply")
async def generate_subcontractor_reply(request: SubcontractorReplyRequest):
    """Generate AI-powered reply for non-responsive subcontractor"""
    row_data = request.subcontractor_data
    
    try:
        prompt = f"""You are an AI Assistant for construction project management.
Compose a professional and context-aware email reply for the subcontractor conversation below.

DETAILS:
- Project: {row_data.get('project_guess', 'Unknown')}
- Subject: {row_data.get('thread_subject', 'Follow-up')}
- Issue: {row_data.get('issue_detected', '')}
- Impact Area: {row_data.get('impact_area', '')}
- Risk Level: {row_data.get('risk_level', '')}
- Recommended Action: {row_data.get('recommended_action', '')}

Tone: Polite, professional, collaborative. The goal is to follow up clearly while maintaining good vendor relationships.

OUTPUT FORMAT:
Return ONLY a valid JSON object (no markdown, no code blocks) with this structure:
{{
  "subject": "Reply Subject",
  "body": "AI-generated reply email content"
}}"""
        
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional construction project email assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        ai_response = completion.choices[0].message.content
        
        try:
            clean_response = ai_response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            ai_reply = json.loads(clean_response)
            return JSONResponse(ai_reply)
        
        except json.JSONDecodeError:
            return JSONResponse({
                "subject": f"Re: {row_data.get('thread_subject', 'Follow-up')}",
                "body": ai_response[:500]
            })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI reply: {str(e)}")

