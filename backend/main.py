"""Main FastAPI application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import (
    emails,
    emails_with_attachments,
    reports,
    projects,
    procurement,
    procurement_analyze,
    vendors,
    dashboard,
    auth
)

app = FastAPI(
    title="CARMA AI Backend",
    version="1.0.0",
    description="AI-powered construction project management API"
)

# Global CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all modular routes
app.include_router(emails.router)
app.include_router(emails_with_attachments.router)
app.include_router(reports.router)
app.include_router(projects.router)
app.include_router(procurement.router)
app.include_router(procurement_analyze.router)
app.include_router(vendors.router)
app.include_router(dashboard.router)
app.include_router(auth.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "status": "running",
        "message": "CARMA AI backend operational",
        "version": "1.0.0"
    }


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
    """Health check endpoint"""
    return {"status": "ok", "message": "Carma API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
