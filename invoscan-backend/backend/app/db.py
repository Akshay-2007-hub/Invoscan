from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Date, ForeignKey, JSON, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from backend.app.config import settings

Base = declarative_base()

class Vendor(Base):
    __tablename__ = "vendors"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    canonical_name = Column(String, unique=True, index=True, nullable=False)
    onboarding_date = Column(DateTime, nullable=False)
    historical_transaction_count = Column(Integer, default=0)
    average_invoice_value = Column(Float, default=0.0)
    tax_id = Column(String, nullable=True)
    bank_account = Column(String, nullable=True)
    address = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    
    invoices = relationship("Invoice", back_populates="vendor")

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, unique=True, index=True, nullable=False)
    invoice_number = Column(String, index=True, nullable=False)
    vendor_id = Column(String, ForeignKey("vendors.vendor_id"), nullable=False)
    amount = Column(Float, nullable=False)
    invoice_date = Column(Date, nullable=False)
    po_number = Column(String, nullable=True)
    status = Column(String, default="pending_review", nullable=False)  # pending_review, cleared, on_hold
    risk_score = Column(Float, default=0.0)
    severity = Column(String, default="low")  # low, medium, high, critical
    ingested_at = Column(DateTime, default=datetime.utcnow)
    analyzed_at = Column(DateTime, nullable=True)
    ocr_text = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    shap_drivers = Column(JSON, nullable=True)  # List of {feature: val, contribution: val}
    
    vendor = relationship("Vendor", back_populates="invoices")
    flagged_rules = relationship("FlaggedRule", back_populates="invoice", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="invoice", cascade="all, delete-orphan")

class FlaggedRule(Base):
    __tablename__ = "flagged_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    rule_name = Column(String, nullable=False)  # e.g., 'Duplicate Invoice Number', 'Anomaly Detection Model'
    rule_type = Column(String, nullable=False)  # 'rule' or 'ml'
    severity_weight = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="flagged_rules")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    action = Column(String, nullable=False)  # 'cleared', 'on_hold', 'escalated'
    user = Column(String, nullable=False)
    comment = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="audit_logs")

# Engine & Session Setup
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
