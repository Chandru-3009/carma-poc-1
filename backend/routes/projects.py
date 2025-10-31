"""Project-related routes"""
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse
from services.config import DATA_DIR
import json

router = APIRouter(
    prefix="/api",
    tags=["Projects"]
)


@router.get("/projects")
async def get_projects():
    """Return list of available projects"""
    demo_file = DATA_DIR / "demo_emails.json"
    if not demo_file.exists():
        return []
    with open(demo_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return [p.get("project_name") for p in data.get("projects", [])]

