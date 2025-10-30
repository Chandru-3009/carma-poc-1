# 🚀 Carma Setup Instructions

## ✅ Project Restructured Successfully!

Your project has been reorganized into a clean **two-folder architecture**:

```
carma/
├── backend/     # Fastify API (Port 5000)
├── frontend/    # React App (Port 5173)
└── README.md
```

---

## 🎯 How to Run

### Step 1: Setup Backend

**Terminal 1:**

```powershell
cd backend
npm install
```

Then create a `.env` file in the `backend` folder:

```env

```

Start the backend:

```powershell
npm run start
```

✅ Backend will run on **http://localhost:5000**

---

### Step 2: Setup Frontend

**Terminal 2:**

```powershell
cd frontend
npm install
npm run dev
```

✅ Frontend will run on **http://localhost:5173**

The frontend automatically proxies all `/api` requests to the backend.

---

### Step 3: Use the App

1. Open **http://localhost:5173** in your browser
2. Click **"🧠 Summarize Inbox"** button
3. AI will analyze all emails and display results in a beautiful table

---

## 📁 Project Structure

### Backend (`/backend`)
- `server.js` - Fastify server listening on port 5000
- `routes/inboxSummarize.js` - OpenAI integration
- `data/sample_emails.json` - Sample construction emails
- `package.json` - Backend dependencies only

### Frontend (`/frontend`)
- `src/pages/InboxSummary.jsx` - Main React component
- `src/App.jsx` - Router setup
- `vite.config.js` - Proxy to backend
- `package.json` - Frontend dependencies only

---

## 🔧 Key Changes Made

1. ✅ Backend moved to `/backend` folder
2. ✅ Frontend moved to `/frontend` folder
3. ✅ Backend runs on **port 5000** (changed from 3000)
4. ✅ Frontend proxy updated to point to port 5000
5. ✅ Separate `package.json` files for each directory
6. ✅ Old root-level files cleaned up
7. ✅ Each folder has its own README.md

---

## 🎨 Features

- **AI Summarization**: Uses OpenAI GPT-4o-mini
- **Smart Classification**: RFI, Material Delay, Schedule Update, etc.
- **Priority Detection**: High/Medium/Low
- **Modern UI**: Tailwind CSS with smooth animations
- **Responsive**: Works on mobile and desktop

---

## ⚠️ Important Notes

1. **API Key**: The backend route has a hardcoded API key (for demo purposes). For production, use the `.env` file.
2. **Two Servers**: You need to run both backend and frontend separately
3. **Proxy**: Frontend automatically proxies `/api` requests to backend
4. **Dependencies**: Each folder has its own `node_modules` directory

---

## 🐛 Troubleshooting

**Backend won't start?**
- Make sure port 5000 is not in use
- Check that `.env` file exists with valid API key
- Run `npm install` in `/backend` folder

**Frontend won't connect to backend?**
- Make sure backend is running on port 5000
- Check browser console for errors
- Verify proxy settings in `frontend/vite.config.js`

**API errors?**
- Check your OpenAI API key is valid
- Ensure backend logs show no errors
- Try accessing `http://localhost:5000/health` directly

---

## 📚 Next Steps

1. Customize emails in `backend/data/sample_emails.json`
2. Modify UI in `frontend/src/pages/InboxSummary.jsx`
3. Add more features using the same structure
4. Deploy backend and frontend separately

Happy coding! 🎉

