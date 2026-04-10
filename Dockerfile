# Use Python 3.11 slim as the base image
FROM python:3.11-slim

# Set working directory for the application
WORKDIR /app

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies needed for MySQL connector
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project
# This includes backend/ for logic and index.html/style.css/script.js for frontend
COPY . .

# Expose the port FastAPI runs on
EXPOSE 8000

# Command to run the application
# We listen on 0.0.0.0 so it's reachable from outside the container
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
