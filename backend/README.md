# Carma Backend - FastAPI

Python FastAPI backend for multi-role, multi-project construction AI inbox summarization.

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- OpenAI API Key

### Installation

```bash
pip install -r requirements.txt
```

### Environment Setup

Create a `.env` file in the `backend` directory:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### Running the Server

```bash
python main.py
```

Or using uvicorn directly:

```bash
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

The server will start on **http://localhost:5000**

## 📡 API Endpoints

### GET `/api/projects`
Returns list of available projects.

**Response:**
```json
["Downtown Office Tower", "Hospital Expansion", "GreenTech HQ Renovation", "City Metro Line Section B"]
```

### POST `/api/summarize`
Summarizes emails for a specific project using OpenAI.

**Request:**
```json
{
  "project": "Downtown Office Tower"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Summarization complete",
  "count": 6,
  "project": "Downtown Office Tower",
  "output_file": "/path/to/output/downtown_office_tower_summarized.json"
}
```

### GET `/api/data?project=<name>&category=<category>`
Retrieves summarized data for a project.

**Query Parameters:**
- `project` (required): Project name
- `category` (optional): Filter by category (default: "All")

**Response:**
```json
[
  {
    "from": "hvac@subcontractor.com",
    "subject": "Delay in AHU delivery",
    "category": "Material Delay",
    "summary": "...",
    "action_required": "...",
    "priority": "High",
    "due_date": "2025-10-30"
  }
]
```

### GET `/health`
Health check endpoint.

## 📁 Project Structure

```
backend/
├── main.py                    # FastAPI application
├── data/                      # Sample project email data
│   ├── downtown_office_tower.json
│   ├── hospital_expansion.json
│   ├── greentech_hq_renovation.json
│   └── city_metro_line_section_b.json
├── output/                    # Generated summary files (auto-created)
│   └── <project>_summarized.json
├── requirements.txt
└── .env                       # Environment variables
```

## 🔧 Configuration

- **Port:** 5000
- **AI Model:** gpt-4o-mini
- **CORS:** Enabled for all origins

## 📝 Notes

- Project data files should be named in lowercase with underscores (e.g., `downtown_office_tower.json`)
- Summary files are saved as `<project_name>_summarized.json` in the `output/` directory
- Files are overwritten on each summarization
