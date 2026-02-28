#!/bin/bash

# Start Python FastAPI Service
echo "Starting Python FastAPI service for Gemini LLM..."

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
python3 -m pip install -r requirements.txt

# Load environment variables
export $(grep -v '^#' .env.local | xargs)

# Start FastAPI server
echo "Starting FastAPI server on http://localhost:8000"
python3 app/api/gemini_api.py
