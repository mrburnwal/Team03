from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List
import random
import io
import csv
import os
from openai import OpenAI
from google import genai

from . import models, database
from .database import engine, get_db

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="DataGuardian API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to calculate status
def calculate_system_status(system, db: Session):
    # 1. Freshness Score (Sf)
    latest_success = db.query(models.BackupLog).filter(
        models.BackupLog.system_id == system.id,
        models.BackupLog.status == "Success"
    ).order_by(models.BackupLog.timestamp.desc()).first()
    
    if not latest_success:
        sf = 0
        last_backup_str = "Never"
    else:
        diff = datetime.utcnow() - latest_success.timestamp
        if diff < timedelta(hours=24):
            sf = 1.0
        elif diff < timedelta(hours=48):
            sf = 0.5
        else:
            sf = 0
        last_backup_str = f"{latest_success.timestamp.strftime('%Y-%m-%d %H:%M')}"

    # 2. Success Rate Score (Ss)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    logs = db.query(models.BackupLog).filter(
        models.BackupLog.system_id == system.id,
        models.BackupLog.timestamp >= seven_days_ago
    ).all()
    
    if not logs:
        ss = 0.0 # No data means not ready
        success_rate = 0
    else:
        successes = len([l for l in logs if l.status == "Success"])
        success_rate = (successes / len(logs)) * 100
        if success_rate >= 95:
            ss = 1.0
        elif success_rate >= 80:
            ss = 0.5
        else:
            ss = 0

    # 3. Final Score
    final_score = (sf + ss) / 2
    if final_score == 1.0:
        status = "Ready"
    elif final_score == 0.5:
        status = "At-Risk"
    else:
        status = "Critical"
        
    return {
        "id": system.id,
        "name": system.name,
        "type": system.type,
        "env": system.env,
        "criticality": system.criticality,
        "last_backup": last_backup_str,
        "success_rate": f"{success_rate:.1f}%",
        "status": status,
        "raw_score": final_score
    }

@app.get("/api/scorecard")
def get_scorecard(db: Session = Depends(get_db)):
    systems = db.query(models.System).all()
    results = [calculate_system_status(s, db) for s in systems]
    
    # Summary stats
    summary = {
        "total": len(results),
        "ready": len([r for r in results if r["status"] == "Ready"]),
        "at_risk": len([r for r in results if r["status"] == "At-Risk"]),
        "critical": len([r for r in results if r["status"] == "Critical"])
    }
    
    return {"summary": summary, "resources": results}

@app.post("/api/chat")
def chat(message: str, db: Session = Depends(get_db)):
    msg_lower = message.lower()
    systems = db.query(models.System).all()
    results = [calculate_system_status(s, db) for s in systems]
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    response = ""
    
    # 1. Try Gemini
    if gemini_key:
        try:
            client = genai.Client(api_key=gemini_key)
            
            context = f"""You are Dian, the AI Infrastructure Resilience Assistant.
RULES: Ready (<24h, >95%), At-Risk (24-48h, 80-95%), Critical (>48h, <80%).
DATA: {str([{k: v for k, v in r.items() if k != 'raw_score'} for r in results])}"""
            
            resp = client.models.generate_content(
                model='gemini-flash-latest',
                contents=f"{context}\n\nUser: {message}"
            )
            response = resp.text
        except Exception as e:
            print(f"Gemini Error: {e}")
            response = f"I encountered an error with my Gemini brain. [Fallback]: "
    
    # 2. Try OpenAI if Gemini failed or no key
    if not response and openai_key:
        try:
            client = OpenAI(api_key=openai_key)
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are Dian, a professional infrastructure assistant. Data: " + str(results)},
                    {"role": "user", "content": message}
                ]
            )
            response = completion.choices[0].message.content
        except Exception as e:
            print(f"OpenAI Error: {e}")
            response = f"I encountered an error with my OpenAI brain. [Fallback theme]: "

    # 3. Final Fallback: Heuristic
    if not response or "[Fallback" in response:
        response += run_heuristic_chat(msg_lower, results)

    # Save chat history
    db.add(models.ChatMessage(role="user", content=message))
    db.add(models.ChatMessage(role="assistant", content=response))
    db.commit()
    
    return {"response": response}

def run_heuristic_chat(msg_lower, results):
    # Old logic moved to a helper for fallback
    matched_system = next((r for r in results if r["name"].lower() in msg_lower), None)
    if matched_system:
        status = matched_system["status"]
        if "why" in msg_lower or "reason" in msg_lower:
            reasons = []
            if "Never" in matched_system["last_backup"]: reasons.append("no backups")
            elif matched_system["status"] == "Critical" and "100%" not in matched_system["success_rate"]: reasons.append("low success rate")
            else: reasons.append("stale backup")
            return f"{matched_system['name']} is {status} because {', '.join(reasons)}."
        return f"Status for {matched_system['name']}: {status}. Last Backup: {matched_system['last_backup']}."
    
    if "status" in msg_lower or "how are" in msg_lower:
        summary = {"Ready": 0, "At-Risk": 0, "Critical": 0}
        for r in results: summary[r["status"]] += 1
        return f"Fleet health: {summary['Ready']} Ready, {summary['Critical']} Critical."
    
    return "I am Dian. (Heuristic Mode). Please provide an OpenAI API Key for full AI capabilities."

@app.post("/api/systems")
def create_system(name: str, type: str, env: str, criticality: str, db: Session = Depends(get_db)):
    # Case-insensitive instance name check
    existing = db.query(models.System).filter(func.lower(models.System.name) == name.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"System with name '{name}' already exists.")
    
    new_system = models.System(name=name, type=type, env=env, criticality=criticality)
    db.add(new_system)
    db.commit()
    db.refresh(new_system)
    return new_system

@app.post("/api/backups")
def add_backup(system_id: int, status: str, db: Session = Depends(get_db)):
    system = db.query(models.System).filter(models.System.id == system_id).first()
    if not system:
        raise HTTPException(status_code=404, detail="System not found")
    
    # Auto-populate resource_name from system
    new_log = models.BackupLog(
        system_id=system_id, 
        resource_name=system.name, 
        status=status, 
        timestamp=datetime.utcnow()
    )
    db.add(new_log)
    db.commit()
    
    # Generate mock logs
    now = datetime.now()
    # Generate mock logs
    now = datetime.now()
    if status == "Success":
        mock_logs = [
            f"[{now.strftime('%H:%M:%S')}] INFO: Initializing connection to {system.name}...",
            f"[{(now + timedelta(seconds=1)).strftime('%H:%M:%S')}] INFO: Validating source consistency...",
            f"[{(now + timedelta(seconds=3)).strftime('%H:%M:%S')}] INFO: Fetching metadata delta...",
            f"[{(now + timedelta(seconds=5)).strftime('%H:%M:%S')}] INFO: Starting snapshot streaming...",
            f"[{(now + timedelta(seconds=8)).strftime('%H:%M:%S')}] SUCCESS: {status} - Destination verified."
        ]
    else:
        failure_reasons = [
            "Connection timeout during data stream.",
            "Integrity check failed at block 4096.",
            "Insufficient buffer space at destination.",
            "Permission denied on secondary storage mount."
        ]
        reason = random.choice(failure_reasons)
        mock_logs = [
            f"[{now.strftime('%H:%M:%S')}] INFO: Initializing connection to {system.name}...",
            f"[{(now + timedelta(seconds=1)).strftime('%H:%M:%S')}] INFO: Validating source consistency...",
            f"[{(now + timedelta(seconds=2)).strftime('%H:%M:%S')}] WARN: Retrying connection segment...",
            f"[{(now + timedelta(seconds=4)).strftime('%H:%M:%S')}] ERROR: {reason}",
            f"[{(now + timedelta(seconds=5)).strftime('%H:%M:%S')}] CRITICAL: Backup aborted."
        ]
    
    return {
        "message": "Backup log added successfully", 
        "status": status,
        "logs": mock_logs,
        "resource_name": system.name
    }

@app.get("/api/export")
def export_data(env: str = "All", type: str = "All", db: Session = Depends(get_db)):
    query = db.query(models.System)
    if env != "All":
        query = query.filter(models.System.env == env)
    if type != "All":
        query = query.filter(models.System.type == type)
    
    systems = query.all()
    results = [calculate_system_status(s, db) for s in systems]
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow(["ID", "Name", "Type", "Environment", "Criticality", "Last Backup", "7d Success Rate", "Status"])
    
    # Rows
    for r in results:
        writer.writerow([
            r["id"], r["name"], r["type"], r["env"], r["criticality"],
            r["last_backup"], r["success_rate"], r["status"]
        ])
    
    output.seek(0)
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=filtered_dataguardian_report.csv"
    return response

# Seed data endpoint (for demo)
@app.post("/api/seed")
def seed_data(db: Session = Depends(get_db)):
    # Clear existing
    db.query(models.BackupLog).delete()
    db.query(models.System).delete()
    
    # Add systems
    sys_data = [
        ("Prod-DB-01", "Database", "Prod", "High"),
        ("Prod-S3-Media", "Storage", "Prod", "Med"),
        ("Dev-App-Server", "Compute", "Dev", "Low"),
        ("Stage-DB-Warehouse", "Database", "Prod", "High"),
        ("Internal-Wiki", "Compute", "Dev", "Low"),
    ]
    
    for name, stype, env, crit in sys_data:
        s = models.System(name=name, type=stype, env=env, criticality=crit)
        db.add(s)
        db.flush()
        
        # Reliability profiles
        if stype == "Database":
            success_weight = 0.85 # Databases fail more
        elif stype == "Compute":
            success_weight = 0.95 # Compute is stable
        else:
            success_weight = 0.90
            
        # Add some random logs
        for i in range(15):
            stat = "Success" if random.random() < success_weight else "Failed"
            # Ensure at least one recent success for Prod-DB-01
            if name == "Prod-DB-01" and i == 0: stat = "Success"
            
            l = models.BackupLog(
                system_id=s.id, 
                resource_name=name,
                status=stat, 
                timestamp=datetime.utcnow() - timedelta(hours=8*i)
            )
            db.add(l)

    db.commit()
    return {"message": "Database seeded with weighted reliability profiles."}
