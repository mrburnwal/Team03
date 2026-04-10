# DataGuardian: Technical Architecture & Mechanics

This document explains the "under-the-hood" functioning of the DataGuardian Backup Resilience Platform, from the UI buttons to the AI reasoning.

## 🏗️ 1. System Architecture
DataGuardian follows a modern **three-tier architecture**:
- **Frontend (React + Vite)**: A responsive SPA using modern CSS for animations and terminal-style feedback.
- **Backend (FastAPI)**: A high-performance Python API that handles data orchestrating, scoring, and AI integration.
- **Database (MySQL)**: Persistent storage for system state, backup logs, and chat history.

---

## 🔘 2. Button Mechanism: "Run Backup"

When you click the **Backup** button, the following sequence occurs:

1.  **Frontend State**: The system's status changes to "pulsating," and the button is disabled to prevent duplicate jobs.
2.  **API Call**: A `POST` request is sent to `/api/backups?system_id={id}&status={Success|Failed}`.
3.  **Backend Simulation**:
    - **Reliability Profiles**: The backend doesn't just coin-flip. It uses weighted probabilities based on the resource type. 
        - *Databases* have a higher simulated failure rate (connectivity issues).
        - *Compute* nodes are highly reliable.
    - **Log Generation**: The backend generates 5 timestamped "mock logs." If the status is "Failed," it injects realistic error strings like `ERROR: Connection timeout`.
4.  **Database Update**: A new entry is added to the `backup_logs` table, which immediately affects the system's "Freshness" and "Reliability" scores.
5.  **Modal Display**: The frontend receives the logs and displays them in a terminal-inspired modal with color-coded success/failure banners.

---

## 📈 3. Scoring & Calculation Engine

The platform calculates a **Readiness Score (0-100%)** for every system. This isn't a simple average; it’s a weighted analysis of two primary vectors:

### A. Freshness Score (70% Weight)
- **Calculation**: Time passed since the last **successful** backup.
- **Logic**:
    - `< 24 hours`: 100% Score.
    - `24 - 48 hours`: 50% Score.
    - `> 48 hours`: 0% Score.
    - `Never`: 0% Score.

### B. Reliability Score (30% Weight)
- **Calculation**: Success rate of backup attempts in the last 7 days.
- **Logic**: `(Successful Attempts / Total Attempts) * 100`.

### C. Final Status Mapping
The UI maps the **Final Weighted Score** to the following categories:
- ✅ **Ready**: Score > 90% (Everything is fresh and reliable).
- ⚠️ **At-Risk**: Score 70% - 90% (Backup is slightly stale or recent failures occurred).
- 🚨 **Critical**: Score < 70% (Backup is over 48h old or reliability is poor).

---

## 🤖 4. AI Mechanism: Dian

Dian's intelligence is powered by a **Multi-LLM Fallback Strategy**:

### Live Context Injection (RAG-Lite)
Every time you send a message, the backend performs a **Live Query** of the `systems` and `backup_logs` tables. It formats this data into a structured string and injects it into the System Prompt.
- **Result**: Dian "sees" the exact state of your fleet. If `Prod-DB-01` just failed, she knows it the moment you ask.

### Provider Hierarchy:
1.  **Google Gemini (Primary)**: Using the modern `google-genai` SDK and the `gemini-flash-latest` model for high-speed analysis.
2.  **OpenAI (Secondary)**: Fallback logic using `gpt-4o-mini` if Gemini is unavailable.
3.  **Heuristic (Local)**: A deterministic keyword-and-rule-based engine that uses local scoring functions to provide answers if no cloud AI API is available.

---

## 📊 5. Data Flow (Recap)
1.  **User Action** (Dash/Chat/Backup)
2.  **Backend Logic** (Query DB -> Calculate Scores -> Consult AI)
3.  **Persistence** (Store Logs/History in MySQL)
4.  **UI Feedback** (Animate changes -> Update Scorecards)

This cohesive mechanism ensures that DataGuardian isn't just a static display, but a dynamic, data-driven resilience platform.
