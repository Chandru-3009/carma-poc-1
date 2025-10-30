# Carma Frontend

React frontend for the Carma Construction AI Inbox Summarization feature.

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:5173**

All API requests to `/api/*` are automatically proxied to the backend running on **http://localhost:5000**

### Building for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   └── InboxSummary.jsx  # Main inbox summarization page
│   ├── App.jsx                # Router setup
│   ├── main.jsx               # React entry point
│   └── index.css              # Global styles with Tailwind
├── index.html
├── vite.config.js             # Vite config with API proxy
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## 🎨 Features

- Modern, responsive UI with Tailwind CSS
- Color-coded priority indicators
- Loading states and error handling
- Smooth animations and transitions
- Mobile-friendly design

## 🔧 Configuration

- **Port:** 5173
- **Proxy:** `/api` → `http://localhost:5000`
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS

