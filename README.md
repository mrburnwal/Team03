# DataGuardian: Backup & Recovery Resilience Platform

DataGuardian is a high-fidelity resilience monitoring platform designed to provide real-time visibility into infrastructure backup readiness. It features a modern glassmorphism dashboard, real-time resilience scoring, backup simulations, and a Gemini-powered AI assistant named **Dian**.

---

## 🚀 Features

- **Intelligent Resilience Scoring**: Automatically calculates system health (Ready, At-Risk, Critical) based on backup freshness and historical success rates.
- **Dynamic Dashboard**: A dependency-free, lightweight Vanilla JS interface with real-time updates and filtering.
- **Backup Simulation Engine**: Test your system resilience with simulated backup jobs featuring randomized, weighted failure outcomes and detailed terminal logs.
- **Dian AI Assistant**: A multi-model AI chatbot (GenAI/OpenAI/Heuristic) that analyzes your fleet health and provides recovery recommendations.
- **Report Export**: Filtered data export to CSV for auditing and compliance.

---

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python 3.x), SQLAlchemy (ORM)
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Database**: MySQL (Primary) with SQLite fallback
- **AI Engine**: Google Gemini Pro & OpenAI GPT-4o-mini

---

## 📋 Installation & Setup

### 1. Prerequisite: MySQL Setup

Ensure your MySQL server is running on `127.0.0.1` (default port 3306).

```sql
CREATE DATABASE dataguardian;
-- The application uses user 'root' and password 'root123' by default.
-- You can modify backend/database.py to change these credentials.
```

### 2. Backend Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd DataGuardian

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate  # Windows

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Environment Variables

To enable full AI capabilities, set the following environment variables:

```bash
export GEMINI_API_KEY='your_gemini_key_here'
export OPENAI_API_KEY='your_openai_key_here'
```

---

## 🏃 Running the Application

### Start the Server

Run the backend server using Uvicorn. The backend will automatically serve the frontend at the root URL.

```bash
uvicorn backend.main:app --reload
```

### Access the Dashboard

Once the server is running, visit:
**[http://localhost:8000](http://localhost:8000)**

---

## 📂 Project Structure

```text
DataGuardian/
├── backend/
│   ├── main.py        # API Routes & AI Logic
│   ├── models.py      # SQLAlchemy Models
│   ├── database.py    # DB Connection & Fallback
│   └── requirements.txt
├── index.html         # Frontend Dashboard (Vanilla)
├── style.css          # Design System & Premium UI
├── script.js           # Frontend Logic & Simulation
└── README.md
```

---

## 🛡️ License

This project is for demonstration and production readiness testing purposes. See the license file for details.
