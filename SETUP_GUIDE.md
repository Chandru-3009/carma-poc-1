# 🚀 Carma Setup Guide - Multi-Role, Multi-Project POC

## Quick Setup Instructions

### Step 1: Backend Setup (Python FastAPI)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "OPENAI_API_KEY=your_api_key_here" > .env

# Run the server
python main.py
```

Backend will run on **http://localhost:5000**

### Step 2: Frontend Setup (React)

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will run on **http://localhost:5173**

## 🎯 User Flow

1. **Open http://localhost:5173**
2. **Select Role** → Choose from dropdown (PM, PE, Superintendent, etc.)
3. **Select Project** → Click on a project card
4. **Summarize Inbox** → Click button to analyze emails with AI
5. **View Results** → Filter by category and search

## 📦 Project Data

Sample projects are located in `/backend/data/`:
- `downtown_office_tower.json`
- `hospital_expansion.json`
- `greentech_hq_renovation.json`
- `city_metro_line_section_b.json`

## 💾 Output Files

Summarized results are saved to `/backend/output/`:
- `<project_name>_summarized.json`

These files are created automatically when you click "Summarize Inbox".

## 🔧 Troubleshooting

**Backend won't start?**
- Check Python version: `python --version` (need 3.11+)
- Verify `.env` file exists with valid `OPENAI_API_KEY`
- Install dependencies: `pip install -r requirements.txt`

**Frontend can't connect?**
- Ensure backend is running on port 5000
- Check browser console for errors
- Verify proxy in `vite.config.js` points to `http://localhost:5000`

**API errors?**
- Verify OpenAI API key is valid
- Check backend logs for errors
- Ensure project data files exist in `/backend/data/`

## 📝 Environment Variables

**Backend `.env` file:**
```
OPENAI_API_KEY=sk-...
```

That's it! No database needed - everything uses JSON files.

