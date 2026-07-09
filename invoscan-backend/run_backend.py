import sys
import os
import uvicorn

# Add current directory to path to resolve imports properly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("Starting Invoice Fraud Detector Backend Server...")
    print("API documentation will be available at: http://127.0.0.1:8000/docs")
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
