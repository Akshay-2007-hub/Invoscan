import uuid
from datetime import datetime, date
import json
import requests
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.db import Invoice, Vendor, FlaggedRule, AuditLog
from backend.app.ml.model import extract_features_single, calculate_shap_contributions, load_trained_model, FEATURE_NAMES

def normalize_vendor_name(name: str) -> str:
    """Strip punctuation and case differences for canonical matching."""
    if not name:
        return ""
    # Strip dots, commas, dashes, and lowercase
    cleaned = re_cleanup = name.lower().replace(".", "").replace(",", "").replace("-", "").strip()
    # Remove common suffixes like "ltd", "pvt", "llc", "inc"
    suffixes = ["pvt ltd", "pvt", "ltd", "llc", "inc", "corp", "co", "incorporated", "limited"]
    for s in suffixes:
        if cleaned.endswith(s):
            cleaned = cleaned[:-len(s)].strip()
    return cleaned

def generate_ai_explanation(invoice_data: dict, rule_hits: list, shap_contribs: list, vendor_avg: float) -> str:
    """
    Generates a natural language explanation of the invoice fraud score.
    Uses Anthropic Claude API if configured, otherwise falls back to a rule-based generator.
    """
    amount = invoice_data['amount']
    vendor_name = invoice_data.get('vendor_name', 'Unknown')
    
    # 1. Fallback Rule-Based Explainer
    summary_points = []
    
    # Check rules triggered
    for hit in rule_hits:
        if hit['rule_name'] == "Duplicate Check":
            summary_points.append(f"• Duplicate check triggered: Another invoice with a matching number or vendor/amount/date combination already exists in the system.")
        elif hit['rule_name'] == "PO Mismatch":
            summary_points.append(f"• Purchase Order Policy mismatch: Invoice amount (${amount:,.2f}) is over $5,000.00, but no PO number was supplied.")
        elif hit['rule_name'] == "Threshold Check":
            summary_points.append(f"• Threshold check triggered: The amount of ${amount:,.2f} is just below an approval limit (e.g. $10,000 or $5,000), which is a common audit-splitting tactic.")
        elif hit['rule_name'] == "Ghost Vendor":
            summary_points.append(f"• Ghost vendor flags: Vendor '{vendor_name}' could not be matched against the master database, indicating an unregistered or newly-formed entity.")
            
    # Check ML SHAP drivers
    # Top feature contributions
    if shap_contribs:
        top_driver = shap_contribs[0]
        # Only describe if it has positive contribution
        if top_driver['contribution'] > 0.05:
            feat_name = top_driver['feature']
            if feat_name == 'ratio_avg_amount' and vendor_avg > 0:
                deviation = amount / vendor_avg
                summary_points.append(f"• Value anomaly: This invoice is {deviation:.1f}x larger than the vendor's average historical bill of ${vendor_avg:,.2f}.")
            elif feat_name == 'is_weekend' or feat_name == 'hour':
                summary_points.append(f"• Submission anomaly: The invoice was uploaded outside of standard business hours (on a weekend or during off-hours).")
            elif feat_name == 'freq_30d' or feat_name == 'freq_90d':
                summary_points.append(f"• Invoicing frequency: Rapid billing volume detected. {int(top_driver['value'])} invoices submitted in the rolling window, suggesting duplicate billing or budget split.")
            elif feat_name == 'days_since_onboard' and top_driver['value'] < 30:
                summary_points.append(f"• New vendor billing: Invoice submitted within {int(top_driver['value'])} days of onboarding, which is typical for billing fraud.")

    if not summary_points:
        summary_points.append("• No major fraud indicators were triggered. The transaction falls within normal statistical benchmarks.")

    explanation_text = f"Analysis of Invoice from '{vendor_name}' (Amount: ${amount:,.2f}):\n" + "\n".join(summary_points)
    
    # 2. Try Anthropic Claude API if key is present
    if settings.ANTHROPIC_API_KEY:
        try:
            prompt = f"""
            Analyze the following invoice and fraud detector output to write a 3-4 sentence professional explanation of the risk rating and recommend finance team action.
            Invoice Details:
            - Vendor: {vendor_name}
            - Amount: ${amount:,.2f}
            - Date: {invoice_data.get('invoice_date')}
            - PO Number: {invoice_data.get('po_number')}
            
            Triggered Rules:
            {json.dumps(rule_hits)}
            
            ML Feature Drivers (SHAP contributions):
            {json.dumps(shap_contribs[:4])}
            
            Vendor Avg Invoice Value: ${vendor_avg:,.2f}
            
            Format the response as plain English, clear and professional for a finance team auditor.
            """
            
            headers = {
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            
            data = {
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 300,
                "messages": [{"role": "user", "content": prompt}]
            }
            
            response = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=data, timeout=5)
            if response.status_code == 200:
                return response.json()['content'][0]['text']
        except Exception:
            # Silently fall back if the request fails
            pass
            
    return explanation_text

def process_invoice(db: Session, invoice_in: dict) -> Invoice:
    """
    Executes the full ingestion and detection pipeline (Steps 1-8).
    invoice_in: dict with fields:
      - invoice_number (str)
      - vendor_name (str)
      - amount (float)
      - invoice_date (str or date)
      - po_number (str, optional)
      - ocr_text (str, optional)
    """
    # Step 1: Assign transaction ID and timestamp
    tx_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
    ingested_at = datetime.utcnow()
    
    # Parse dates if they are strings
    inv_date = invoice_in.get("invoice_date")
    if isinstance(inv_date, str):
        try:
            inv_date = datetime.strptime(inv_date, "%Y-%m-%d").date()
        except ValueError:
            inv_date = date.today()
    elif not inv_date:
        inv_date = date.today()
        
    # Check for mandatory fields (Step 2 Schema validation)
    # Missing crucial data triggers immediate manual review route without ML
    is_incomplete = False
    missing_fields = []
    if not invoice_in.get("vendor_name"):
        missing_fields.append("vendor_name")
    if not invoice_in.get("invoice_number"):
        missing_fields.append("invoice_number")
    if not invoice_in.get("amount") or float(invoice_in["amount"]) <= 0:
        missing_fields.append("amount")
        
    if missing_fields:
        # Save as incomplete invoice
        invoice_db = Invoice(
            transaction_id=tx_id,
            invoice_number=invoice_in.get("invoice_number", "UNKNOWN"),
            vendor_id="VEND999",  # Generic unknown/incomplete vendor
            amount=float(invoice_in.get("amount", 0.0)),
            invoice_date=inv_date,
            po_number=invoice_in.get("po_number"),
            status="pending_review",
            risk_score=100.0,
            severity="critical",
            ingested_at=ingested_at,
            analyzed_at=datetime.utcnow(),
            ocr_text=invoice_in.get("ocr_text", "Incomplete fields uploaded"),
            explanation=f"Schema Validation Failed: Missing fields: {', '.join(missing_fields)}. Routed directly to manual review queue.",
            shap_drivers=[]
        )
        db.add(invoice_db)
        db.commit()
        db.refresh(invoice_db)
        
        # Add flagged rule entry
        rule_db = FlaggedRule(
            invoice_id=invoice_db.id,
            rule_name="Incomplete Schema Validation",
            rule_type="rule",
            severity_weight=100.0,
            description=f"Invoice is missing essential fields: {', '.join(missing_fields)}"
        )
        db.add(rule_db)
        
        # Add audit log
        audit_db = AuditLog(
            invoice_id=invoice_db.id,
            action="on_hold",
            user="System Automation Engine",
            comment="Validation failed. Payment automatically held."
        )
        db.add(audit_db)
        db.commit()
        return invoice_db

    # Normalization (Step 2)
    amount = float(invoice_in["amount"])
    v_name = invoice_in["vendor_name"]
    canonical_name = normalize_vendor_name(v_name)
    
    # Lookup vendor in master database
    vendor_db = db.query(Vendor).filter(Vendor.canonical_name == canonical_name).first()
    
    vendor_id = None
    vendor_avg = 0.0
    vendor_obj = None
    
    if vendor_db:
        vendor_id = vendor_db.vendor_id
        vendor_avg = vendor_db.average_invoice_value
        vendor_obj = {
            'vendor_id': vendor_id,
            'name': vendor_db.name,
            'canonical_name': vendor_db.canonical_name,
            'onboarding_date': vendor_db.onboarding_date,
            'historical_transaction_count': vendor_db.historical_transaction_count,
            'average_invoice_value': vendor_avg
        }
    else:
        # Create a transient vendor or mark as ghost vendor
        vendor_id = f"GHOST-{uuid.uuid4().hex[:4].upper()}"
        vendor_avg = 0.0
        
    # Step 3: Rule-Based Validation Engine
    rule_hits = []
    
    # Check for Duplicate:
    # Check 1: Invoice number already exists
    dup_num = db.query(Invoice).filter(Invoice.invoice_number == invoice_in["invoice_number"]).first()
    # Check 2: Same vendor, amount, and date
    dup_details = None
    if vendor_id:
        dup_details = db.query(Invoice).filter(
            Invoice.vendor_id == vendor_id,
            Invoice.amount == amount,
            Invoice.invoice_date == inv_date
        ).first()
        
    if dup_num or dup_details:
        rule_hits.append({
            "rule_name": "Duplicate Check",
            "weight": 45.0,
            "description": "Invoice number or Vendor + Amount + Date combination already exists."
        })
        
    # Check for PO/GRN cross-check:
    # If amount is > $5,000 and PO number is missing
    if amount > 5000.0 and not invoice_in.get("po_number"):
        rule_hits.append({
            "rule_name": "PO Mismatch",
            "weight": 25.0,
            "description": f"Invoice amount (${amount:,.2f}) exceeds $5,000 limit, but PO number is missing."
        })
        
    # Check for Threshold Checks:
    # Amounts just under approval limits: $5,000 or $10,000
    if (9500.0 <= amount < 10000.0) or (4750.0 <= amount < 5000.0):
        rule_hits.append({
            "rule_name": "Threshold Check",
            "weight": 30.0,
            "description": f"Invoice amount (${amount:,.2f}) is close to approval thresholds ($5,000 or $10,000)."
        })
        
    # Check for Ghost Vendor:
    # If the vendor name was not found in the vendor master table
    if not vendor_db:
        rule_hits.append({
            "rule_name": "Ghost Vendor",
            "weight": 50.0,
            "description": f"Vendor '{v_name}' was not found in the vendor master register."
        })

    # Step 4: Feature Extraction for ML Layer
    # Get vendor's invoice history
    history = []
    if vendor_id:
        history_db = db.query(Invoice).filter(Invoice.vendor_id == vendor_id).all()
        history = [{'amount': h.amount, 'invoice_date': h.invoice_date} for h in history_db]
        
    # Build invoice dictionary for feature extraction
    inv_dict = {
        'amount': amount,
        'invoice_date': datetime.combine(inv_date, datetime.min.time()),
        'po_number': invoice_in.get("po_number")
    }
    
    feats = extract_features_single(inv_dict, vendor_obj, history)
    
    # Step 5 & 6: ML Prediction & Risk Score Aggregation
    ml_prob = 0.0
    shap_contribs = []
    
    try:
        model, explainer = load_trained_model()
        # Predict probability
        df_feats = pd.DataFrame([feats])[FEATURE_NAMES]
        ml_prob = float(model.predict_proba(df_feats)[0][1])
        
        # SHAP explainability
        shap_contribs, base_value = calculate_shap_contributions(feats)
    except Exception as e:
        # Fallback if model files not trained yet
        # Seed an ML score based on simple heuristics (weekend submission, amount deviation)
        weekend_factor = 0.2 if feats['is_weekend'] else 0.0
        amount_factor = min(feats['ratio_avg_amount'] * 0.05, 0.4) if vendor_db else 0.4
        freq_factor = min(feats['freq_30d'] * 0.1, 0.3)
        ml_prob = min(weekend_factor + amount_factor + freq_factor, 0.95)
        
        # Simple rule-based mock SHAP contributions
        for feat in FEATURE_NAMES:
            val = feats[feat]
            contrib = 0.0
            if feat == 'ratio_avg_amount' and val > 2: contrib = 0.3
            elif feat == 'is_weekend' and val == 1: contrib = 0.25
            elif feat == 'freq_30d' and val > 3: contrib = 0.2
            elif feat == 'days_since_onboard' and val < 10: contrib = 0.15
            elif feat == 'po_mismatch' and val == 1: contrib = 0.1
            
            shap_contribs.append({
                "feature": feat,
                "value": float(val),
                "contribution": contrib
            })
        shap_contribs = sorted(shap_contribs, key=lambda x: abs(x['contribution']), reverse=True)

    # Risk Score Aggregation:
    # Rule engine contribution + ML contribution
    rule_score = min(sum(h["weight"] for h in rule_hits), 100.0)
    ml_score = ml_prob * 100.0
    
    # Formula: 40% Rules score + 60% ML anomaly score
    final_score = round((rule_score * 0.4) + (ml_score * 0.6), 1)
    
    # Cap between 0 and 100
    final_score = max(0.0, min(100.0, final_score))
    
    # Map severity
    if final_score >= settings.SEVERITY_CRITICAL:
        severity = "critical"
    elif final_score >= settings.SEVERITY_HIGH:
        severity = "high"
    elif final_score >= settings.SEVERITY_MEDIUM:
        severity = "medium"
    else:
        severity = "low"
        
    # Generate AI explanation
    explanation = generate_ai_explanation(invoice_in, rule_hits, shap_contribs, vendor_avg)
    
    # Step 8: Decision Routing
    if severity == "low":
        status = "cleared"
        action_msg = "Invoice cleared automatically."
    elif severity == "medium":
        status = "pending_review"
        action_msg = "Invoice flagged. Routed to finance review queue. Payment held."
    else: # High / Critical
        status = "pending_review"
        action_msg = "Payment blocked. Critical alert sent to compliance team."

    # Save to database (Step 7 Logging & Persistent Storage)
    invoice_db = Invoice(
        transaction_id=tx_id,
        invoice_number=invoice_in["invoice_number"],
        vendor_id=vendor_id,
        amount=amount,
        invoice_date=inv_date,
        po_number=invoice_in.get("po_number"),
        status=status,
        risk_score=final_score,
        severity=severity,
        ingested_at=ingested_at,
        analyzed_at=datetime.utcnow(),
        ocr_text=invoice_in.get("ocr_text", "Direct API Ingestion"),
        explanation=explanation,
        shap_drivers=shap_contribs
    )
    db.add(invoice_db)
    db.commit()
    db.refresh(invoice_db)
    
    # Log rule hits in db
    for hit in rule_hits:
        rule_db = FlaggedRule(
            invoice_id=invoice_db.id,
            rule_name=hit["rule_name"],
            rule_type="rule",
            severity_weight=hit["weight"],
            description=hit["description"]
        )
        db.add(rule_db)
        
    # Also log ML model as a flagged rule if it contributes high risk
    if ml_score > 50:
        ml_rule_db = FlaggedRule(
            invoice_id=invoice_db.id,
            rule_name="XGBoost Anomaly Model",
            rule_type="ml",
            severity_weight=ml_score,
            description=f"XGBoost behavioral model scored high risk: {ml_score:.1f}% probability of anomaly."
        )
        db.add(ml_rule_db)
        
    # Log audit event
    audit_db = AuditLog(
        invoice_id=invoice_db.id,
        action=status,
        user="System Automation Engine",
        comment=action_msg
    )
    db.add(audit_db)
    db.commit()
    
    # Update Vendor statistics in database if cleared
    if status == "cleared" and vendor_db:
        # Recalculate vendor average and count
        count = vendor_db.historical_transaction_count + 1
        new_avg = ((vendor_db.average_invoice_value * vendor_db.historical_transaction_count) + amount) / count
        vendor_db.historical_transaction_count = count
        vendor_db.average_invoice_value = round(new_avg, 2)
        db.commit()
        
    return invoice_db
