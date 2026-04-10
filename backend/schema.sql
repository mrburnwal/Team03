-- DataGuardian MySQL Schema

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS dataguardian;
USE dataguardian;

-- 2. Create Systems Table
CREATE TABLE IF NOT EXISTS systems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    env VARCHAR(20) NOT NULL,
    criticality VARCHAR(20) NOT NULL
);

-- 3. Create Backup Logs Table
CREATE TABLE IF NOT EXISTS backup_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    system_id INT NOT NULL,
    resource_name VARCHAR(100) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
);

-- 4. Create Chat Messages Table (History)
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Note: SQLAlchemy handles table creation automatically via Base.metadata.create_all(bind=engine)
-- but these queries can be used for manual setup.
