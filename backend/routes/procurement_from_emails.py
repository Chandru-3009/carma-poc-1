"""Procurement extraction from Gmail emails"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.email_service import fetch_gmail_emails_internal
from services.openai_service import openai_client
from services.config import DATA_DIR
import json
from pathlib import Path


router = APIRouter(
    prefix="/api",
    tags=["Procurement From Emails"]
)


class ExtractRequest(BaseModel):
    projects: list[str] | None = None


def _get_store_path() -> Path:
    return DATA_DIR / "procurement_from_emails.json"


def _load_store() -> list:
    store_path = _get_store_path()
    if not store_path.exists():
        store_path.parent.mkdir(parents=True, exist_ok=True)
        with open(store_path, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        return []
    try:
        with open(store_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return []
    except Exception:
        return []


def _save_store(records: list) -> None:
    store_path = _get_store_path()
    store_path.parent.mkdir(parents=True, exist_ok=True)
    with open(store_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def _analyze_email_with_ai(email: dict) -> dict:
    """Call OpenAI to extract procurement fields from a single email."""
    system_prompt = (
        "You are an AI that extracts structured procurement data from construction emails. "
        "Return ONLY valid JSON matching the schema with correct types."
    )

    schema_example = {
        "project_name": "Penthouse A",
        "material_equipment": "Custom Casework",
        "lead_time_days": 40,
        "quantity": 5,
        "unit": "Sets",
        "vendor_name": "Elite Millwork",
        "delivery_date": "Pending",
        "status": "Pending",
        "remarks": "Awaiting vendor confirmation on delivery date.",
        "ai_analysis": {
            "impact": "Schedule Risk - Missing delivery dates may delay interior fit-out progress.",
            "recommendation": "Follow up with vendor immediately and escalate if no update within 2 days.",
            "confidence_score": 0.87
        }
    }

    user_prompt = (
        "Extract the following JSON from this email (subject and body). The project name will be either in subject or in email signature. "
        "If a value is not present, infer conservatively or set a reasonable placeholder like 'Pending' or 0. "
        "Ensure lead_time_days and quantity are numbers, confidence_score is a float 0-1.\n\n"
        f"SCHEMA EXAMPLE (match keys/types, not values):\n{json.dumps(schema_example, indent=2)}\n\n"
        f"EMAIL SUBJECT: {email.get('subject','')}\n"
        f"EMAIL BODY: {email.get('body','')[:4000]}\n\n"
        "Return JSON only. No markdown."
    )

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=600
        )
    except Exception as e:
        error_msg = str(e)
        # Check for permission/scope errors
        if "401" in error_msg or "insufficient permissions" in error_msg.lower() or "missing scopes" in error_msg.lower():
            raise HTTPException(
                status_code=401,
                detail=(
                    "OpenAI API Key Permissions Error:\n\n"
                    "Your API key doesn't have the required permissions (missing scope: model.request).\n\n"
                    "To fix this:\n"
                    "1. Go to https://platform.openai.com/api-keys\n"
                    "2. If using a restricted API key, ensure it has 'model.request' scope enabled\n"
                    "3. If your API key belongs to an organization, ensure you have 'Reader', 'Writer', or 'Owner' role\n"
                    "4. If your API key belongs to a project, ensure you have 'Member' or 'Owner' role\n"
                    "5. Alternatively, create a new unrestricted API key for testing\n\n"
                    f"Original error: {error_msg}"
                )
            )
        # Re-raise other errors
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI API Error: {error_msg}"
        )

    ai_text = response.choices[0].message.content or "{}"

    # Strip potential markdown fences
    clean = ai_text.strip()
    if clean.startswith("```"):
        try:
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
            clean = clean.strip()
        except Exception:
            clean = ai_text

    try:
        data = json.loads(clean)
    except json.JSONDecodeError:
        # Fallback minimal structure
        data = {
            "project_name": "",
            "material_equipment": "",
            "lead_time_days": 0,
            "quantity": 0,
            "unit": "",
            "vendor_name": "",
            "delivery_date": "Pending",
            "status": "Pending",
            "remarks": "AI parsing failed; requires manual review.",
            "ai_analysis": {
                "impact": "",
                "recommendation": "",
                "confidence_score": 0.0
            }
        }

    # Type coercions/sanity
    try:
        data["lead_time_days"] = int(data.get("lead_time_days") or 0)
    except Exception:
        data["lead_time_days"] = 0
    try:
        data["quantity"] = int(data.get("quantity") or 0)
    except Exception:
        data["quantity"] = 0
    ai_meta = data.get("ai_analysis") or {}
    try:
        ai_meta["confidence_score"] = float(ai_meta.get("confidence_score") or 0.0)
    except Exception:
        ai_meta["confidence_score"] = 0.0
    data["ai_analysis"] = ai_meta

    return data


@router.post("/procurement/emails/extract")
def extract_procurement_from_emails(request: ExtractRequest):
    """Read/initialize store, fetch Gmail, analyze unprocessed emails, persist and return array."""
    try:
        # Load existing records and processed ids
        records = _load_store()
        processed_ids = {r.get("id") for r in records if r.get("id")}

        # Fetch recent Gmail emails
        emails = fetch_gmail_emails_internal()

        # For each unprocessed email, analyze and add
        for email in emails:
            email_id = email.get("id")
            if not email_id or email_id in processed_ids:
                continue

            ai_data = _analyze_email_with_ai(email)
            record = {
                "id": email_id,
                "from": email.get("from", ""),
                "subject": email.get("subject", ""),
                "date": email.get("date", ""),
                **ai_data
            }
            records.append(record)
            processed_ids.add(email_id)

        # Save full store
        _save_store(records)

        # Filter by requested projects for response (if provided)
        project_filters = set((request.projects or []))
        if project_filters:
            filtered = [r for r in records if (r.get("project_name") or "").strip() in project_filters]
        else:
            filtered = records

        return JSONResponse(filtered)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


