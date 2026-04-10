from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class System(Base):
    __tablename__ = "systems"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    type = Column(String(50))  # e.g., Database, VM, Storage
    env = Column(String(20))   # e.g., Prod, Dev
    criticality = Column(String(20)) # High, Med, Low
    
    backups = relationship("BackupLog", back_populates="system")

class BackupLog(Base):
    __tablename__ = "backup_logs"
    id = Column(Integer, primary_key=True, index=True)
    system_id = Column(Integer, ForeignKey("systems.id"))
    resource_name = Column(String(100)) # Redundant field as requested
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(20)) # Success, Failed
    
    system = relationship("System", back_populates="backups")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String(20)) # user, assistant
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
