# DataGuardian: Backup Resilience Platform

DataGuardian is a state-of-the-art resilience management dashboard that provides live scoring, AI-driven infrastructure analysis, and high-fidelity backup simulations.

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.9+)
- **MySQL Server** (Running on port 3306)

---

## 🛠️ Installation & Setup

### 1. Database Setup (MySQL)
Execute the following commands in your MySQL terminal (or use a tool like MySQL Workbench):

```sql
-- Create the database
CREATE DATABASE dataguardian;

-- Table schemas are handled automatically by the backend, 
-- but you can find the manual SQL queries in backend/schema.sql
```
**Default Credentials**:
- **User**: `root`
- **Password**: `root123` (Adjust in `backend/database.py` if different)

### 2. Backend Setup

#### 🍎 MacOS / Linux
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 🪟 Windows
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend Setup (Both OS)
```bash
cd frontend
npm install
```

---

## 🏃 Running the Application

You need two terminal windows:

### Terminal 1: Backend
```bash
# MacOS/Linux
export GEMINI_API_KEY='your_key'
PYTHONPATH=. ./venv/bin/python3 -m uvicorn main:app --reload

# Windows (PowerShell)
$env:GEMINI_API_KEY="your_key"
python -m uvicorn main:app --reload
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

---

## 📊 Scoring Logic
The current platform uses a **Weighted Average** model to calculate system health:
- **Freshness (sf)**: Score based on time since last successful backup.
- **Reliability (ss)**: Score based on 7-day success rate.
- **Formula**: `(sf + ss) / 2`

**Status Mapping**:
- **Ready**: Score = 1.0
- **At-Risk**: Score = 0.5
- **Critical**: Score < 0.5

---

## 🤖 AI Assistant (Dian)
Dian is powered by **Google Gemini**. Ensure you have a valid `GEMINI_API_KEY` exported in your environment. She utilizes a "RAG-Lite" logic, reading your live MySQL infrastructure state to provide real-time guidance.
