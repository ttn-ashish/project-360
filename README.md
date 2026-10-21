# Project 360 — AI-Powered Software Project Intelligence

> A continuously updated digital twin of your software project that connects code, people, requirements, quality, incidents, and releases to identify risks and predict customer impact.

---

## Architecture Overview

- **Backend**: **Node.js + Express.js** (`better-sqlite3`, `axios`, `cors`, `dotenv`), Google Gemini API (`gemini-3.5-flash-lite` / `gemini-3-flash-preview` failover).
- **Frontend**: **React 19 + Vite**, Lucide React icons, high-density dark mode sidebar layout with glassmorphic cards.
- **Database**: SQLite (`project360.db`) with WAL mode and foreign key constraints.

---

## Core Features (Sidebar Navigation)

1. **PR Risk Radar & Jira Traceability**:
   - Evaluates Pull Requests with deterministic risk scores (0–100) and health index.
   - Audits blast radius, code churn, and verifies linked Jira acceptance criteria.
2. **SonarQube Quality Gates**:
   - Live metrics on unit test coverage, coverage deltas, vulnerabilities, bugs, and code smells.
3. **Ask Project 360 (AI Digital Twin Brain)**:
   - Chat assistant powered by Google Gemini with contextual RAG over the entire project graph.
   - Answers questions like *"Can we release today?"* or *"What are the risks for PR #4521?"*.
4. **Local Codebase Scanner**:
   - Ingests local project directories, auto-detects frameworks (React, Express, Next, etc.), extracts Git history, and identifies API routes.

---

## Prerequisites

- **Node.js 18+** and **npm** installed on your system.

---

## 1. Running the Backend Server (Node.js & Express)

The backend runs on **Express.js** on port `8080`.

### Step 1: Open Terminal & Navigate to Backend
```powershell
cd d:\Projects\project-360\backend
```

### Step 2: Install Dependencies *(first-time setup)*
```powershell
npm install
```

### Step 3: Configure Environment Variables (.env)
Check `backend\.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
PORT=8080
```

### Step 4: Start the Express Server
```powershell
npm run dev
```
*(Or `npm start` for standard production start)*

- **Backend Health Check**: [http://127.0.0.1:8080/api/v1/health](http://127.0.0.1:8080/api/v1/health)
- **Dashboard Overview API**: [http://127.0.0.1:8080/api/v1/dashboard/overview](http://127.0.0.1:8080/api/v1/dashboard/overview)

---

## 2. Running the Frontend Server (React + Vite)

The frontend runs on **Vite** on port `5173`.

### Step 1: Open a Second Terminal & Navigate to Frontend
```powershell
cd d:\Projects\project-360\frontend
```

### Step 2: Start the Vite Dev Server
```powershell
npm run dev
```

- **Frontend App**: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

---

## Quick Start Summary

| Service | Directory | Command | URL |
| :--- | :--- | :--- | :--- |
| **Backend** (Node.js + Express) | [backend](file:///d:/Projects/project-360/backend) | `npm run dev` | [http://127.0.0.1:8080](http://127.0.0.1:8080) |
| **Frontend** (React + Vite) | [frontend](file:///d:/Projects/project-360/frontend) | `npm run dev` | [http://127.0.0.1:5173](http://127.0.0.1:5173) |
