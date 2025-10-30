# Carma - Multi-Role, Multi-Project Construction AI Dashboard

AI-powered construction management POC with **multi-role and multi-project inbox summarization** using OpenAI GPT-4o-mini.

## 🏗️ Project Structure

```
carma/
│
├── backend/          # FastAPI (Python) backend
│   ├── main.py       # FastAPI application
│   ├── data/         # Sample project email data
│   ├── output/       # Generated summary files
│   ├── requirements.txt
│   └── README.md
│
├── frontend/         # React + Tailwind frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── RoleSelect.jsx
│   │   │   ├── ProjectSelect.jsx
│   │   │   └── InboxSummary.jsx
│   │   └── App.jsx
│   ├── package.json
│   └── README.md
│
└── README.md         # This file
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API Key

### 1. Setup Backend (Python)

Open Terminal 1:

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in `/backend`:

```
OPENAI_API_KEY=your_openai_api_key_here
```

Start the FastAPI server:

```bash
python main.py
```

Or using uvicorn:

```bash
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

Backend runs on **http://localhost:5000**

### 2. Setup Frontend (React)

Open Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

### 3. Use the Application

1. Open **http://localhost:5173** in your browser
2. Select your role (Project Manager, Project Engineer, etc.)
3. Choose a project from the card grid
4. Click **"✨ Summarize Inbox"** to analyze emails
5. View categorized summaries with filtering and search

## 🎯 Features

- **Multi-Role Support**: Project Manager, Project Engineer, Superintendent, Subcontractor, Executive
- **Multi-Project**: Separate inbox data for each project
- **AI Summarization**: Uses OpenAI GPT-4o-mini to summarize and classify emails
- **Smart Categorization**: RFI, Material Delay, Schedule Update, General, Submittal, Coordination
- **Priority Detection**: High, Medium, Low priority identification
- **Modern UI**: Clean, light-themed dashboard with Tailwind CSS
- **Persistent Storage**: Summaries saved to JSON files by project

## 📡 API Endpoints

### GET `/api/projects`
Returns available projects list.

### POST `/api/summarize`
Summarizes emails for a specific project.

**Request:**
```json
{
  "project": "Downtown Office Tower"
}
```

### GET `/api/data?project=<name>&category=<category>`
Retrieves summarized data for a project (optionally filtered by category).

## 🎨 UI Flow

1. **Role Selection** (`/role`) - Select your role
2. **Project Selection** (`/projects`) - Choose a project from card grid
3. **Inbox Summary** (`/inbox/:projectName`) - View and summarize project emails

## 📝 Sample Projects

- Downtown Office Tower
- Hospital Expansion
- GreenTech HQ Renovation
- City Metro Line Section B

Each project has its own email data in `/backend/data/<project_name>.json`.

## 🔧 Technology Stack

**Backend:**
- FastAPI (Python)
- OpenAI API (GPT-4o-mini)
- Python-dotenv

**Frontend:**
- React 18
- React Router
- Tailwind CSS
- Vite

## 📚 Documentation

- [Backend README](./backend/README.md) - FastAPI backend documentation
- [Frontend README](./frontend/README.md) - React frontend documentation

## 📄 License

MIT
