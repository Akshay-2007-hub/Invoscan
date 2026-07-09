import os

class Settings:
    PROJECT_NAME: str = "Invoice Fraud Detector"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./invoice_fraud.db")
    
    # API Keys
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # ML Models paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    MODEL_DIR = os.path.join(BASE_DIR, "app", "ml", "artifacts")
    MODEL_PATH = os.path.join(MODEL_DIR, "xgboost_model.json")
    SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
    VENDORS_DATA_PATH = os.path.join(MODEL_DIR, "vendors_master.pkl")
    
    # Severity thresholds
    SEVERITY_MEDIUM: int = 30
    SEVERITY_HIGH: int = 60
    SEVERITY_CRITICAL: int = 85

settings = Settings()

# Ensure model directory exists
os.makedirs(settings.MODEL_DIR, exist_ok=True)
