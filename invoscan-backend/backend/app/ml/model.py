import pandas as pd
import numpy as np
import os
import pickle
from datetime import datetime
import xgboost as xgb
import shap
from backend.app.config import settings

FEATURE_NAMES = [
    'amount',
    'ratio_avg_amount',
    'day_of_week',
    'hour',
    'is_weekend',
    'days_since_onboard',
    'freq_30d',
    'freq_90d',
    'po_mismatch',
    'is_near_threshold'
]

def extract_features_single(invoice, vendor, vendor_invoices_history):
    """
    Extracts features for a single invoice given the vendor and historical invoices.
    vendor_invoices_history: list of dicts/rows containing 'amount' and 'invoice_date'
    """
    amount = float(invoice['amount'])
    
    # Safely parse date and remove timezone whether it's str, date, or datetime
    inv_date = pd.to_datetime(invoice['invoice_date'])
    if inv_date.tzinfo is not None:
        inv_date = inv_date.tz_localize(None)
    
    # 1. Vendor specific stats
    if vendor:
        v_avg = float(vendor['average_invoice_value'])
        v_onboard = pd.to_datetime(vendor['onboarding_date'])
        if v_onboard.tzinfo is not None:
            v_onboard = v_onboard.tz_localize(None)
        
        ratio_avg_amount = amount / v_avg if v_avg > 0 else 1.0
        days_since_onboard = max((inv_date - v_onboard).days, 0)
    else:
        # Ghost vendor defaults
        ratio_avg_amount = 10.0  # high deviation
        days_since_onboard = 0
        
    # 2. Time features
    day_of_week = inv_date.weekday()
    hour = inv_date.hour
    is_weekend = 1 if day_of_week >= 5 else 0
    
    # 3. Frequency features
    freq_30d = 0
    freq_90d = 0
    
    for hist in vendor_invoices_history:
        h_date = pd.to_datetime(hist['invoice_date'])
        if h_date.tzinfo is not None:
            h_date = h_date.tz_localize(None)
        
        # Only count invoices before the current one
        if h_date < inv_date:
            diff_days = (inv_date - h_date).days
            if diff_days <= 30:
                freq_30d += 1
            if diff_days <= 90:
                freq_90d += 1
                
    # 4. Mismatches and Policy Thresholds
    po_mismatch = 0
    if not invoice.get('po_number') and amount > 5000:
        po_mismatch = 1
        
    is_near_threshold = 0
    # Common approval thresholds are 5000 and 10000
    if (9500 <= amount < 10000) or (4750 <= amount < 5000):
        is_near_threshold = 1
        
    return {
        'amount': amount,
        'ratio_avg_amount': ratio_avg_amount,
        'day_of_week': day_of_week,
        'hour': hour,
        'is_weekend': is_weekend,
        'days_since_onboard': days_since_onboard,
        'freq_30d': freq_30d,
        'freq_90d': freq_90d,
        'po_mismatch': po_mismatch,
        'is_near_threshold': is_near_threshold
    }

def train_model():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Load synthetic datasets
    vendors_path = os.path.join(base_dir, "synthetic_vendors.csv")
    invoices_path = os.path.join(base_dir, "synthetic_invoices.csv")
    
    if not os.path.exists(vendors_path) or not os.path.exists(invoices_path):
        from backend.app.ml.generator import generate_synthetic_data
        df_vendors, df_invoices = generate_synthetic_data(save_dir=base_dir)
    else:
        df_vendors = pd.read_csv(vendors_path)
        df_invoices = pd.read_csv(invoices_path)
        
    # Standardize dates
    df_vendors['onboarding_date'] = pd.to_datetime(df_vendors['onboarding_date'])
    df_invoices['invoice_date'] = pd.to_datetime(df_invoices['invoice_date'])
    
    # Create vendor dictionary for fast lookup
    vendor_dict = df_vendors.set_index('vendor_id').to_dict('index')
    
    # Extract features for all invoices
    features_list = []
    
    # Sort invoices chronologically to simulate stream
    # Workaround: pandas sort_values on datetime objects causes silent crashes in this specific environment
    invoices_list = df_invoices.to_dict('records')
    invoices_list.sort(key=lambda x: x['invoice_date'])
    df_invoices_sorted = pd.DataFrame(invoices_list)
    
    print("Extracting features for training...")
    # Track historical invoices per vendor
    history_by_vendor = {v_id: [] for v_id in df_vendors['vendor_id'].unique()}
    
    for idx, row in df_invoices_sorted.iterrows():
        v_id = row['vendor_id']
        vendor = vendor_dict.get(v_id)
        
        hist = history_by_vendor.get(v_id, [])
        feats = extract_features_single(row, vendor, hist)
        features_list.append(feats)
        
        # Append this invoice to history (for subsequent ones)
        if v_id not in history_by_vendor:
            history_by_vendor[v_id] = []
        history_by_vendor[v_id].append({
            'amount': row['amount'],
            'invoice_date': row['invoice_date']
        })
        
    df_features = pd.DataFrame(features_list)
    X = df_features[FEATURE_NAMES]
    y = df_invoices_sorted['fraud_label']
    
    print(f"Dataset shape: {X.shape}")
    
    # Train XGBoost Model
    print("Training XGBoost Classifier...")
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
        eval_metric='logloss'
    )
    model.fit(X, y)
    
    # Ensure artifacts folder exists
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    
    # Save Model
    model.save_model(settings.MODEL_PATH)
    
    # Generate SHAP explainer and save background dataset for SHAP
    print("Initializing SHAP explainer...")
    # Use a sample of the data as background for TreeExplainer
    # TreeExplainer does not strictly need background data but it is useful for probability explanations
    explainer = shap.TreeExplainer(model, X.sample(min(100, len(X)), random_state=42))
    
    with open(os.path.join(settings.MODEL_DIR, "explainer.pkl"), "wb") as f:
        pickle.dump(explainer, f)
        
    # Copy files to artifacts path for runtime reload
    with open(settings.VENDORS_DATA_PATH, "wb") as f:
        pickle.dump(df_vendors.to_dict('records'), f)
        
    print("Model training and serialization completed successfully!")

def load_trained_model():
    """Loads and returns the model and explainer if they exist."""
    if not os.path.exists(settings.MODEL_PATH):
        raise FileNotFoundError("Model file not found. Please train the model first.")
        
    model = xgb.XGBClassifier()
    model.load_model(settings.MODEL_PATH)
    
    explainer_path = os.path.join(settings.MODEL_DIR, "explainer.pkl")
    with open(explainer_path, "rb") as f:
        explainer = pickle.load(f)
        
    return model, explainer

def calculate_shap_contributions(invoice_features):
    """
    Calculates SHAP feature contributions for a single instance.
    invoice_features: dict with keys as FEATURE_NAMES
    """
    model, explainer = load_trained_model()
    
    # Convert single instance to DataFrame
    df_inst = pd.DataFrame([invoice_features])[FEATURE_NAMES]
    
    # Calculate SHAP values
    shap_values = explainer.shap_values(df_inst)
    
    # Output is array. For single sample, let's extract
    # shap_values can be shape (1, num_features) or (num_features,)
    if len(shap_values.shape) > 1:
        shap_vals = shap_values[0]
    else:
        shap_vals = shap_values
        
    base_value = explainer.expected_value
    if isinstance(base_value, np.ndarray) and len(base_value) > 0:
        base_value = base_value[0]
        
    contributions = []
    for feat, val, s_val in zip(FEATURE_NAMES, df_inst.iloc[0].values, shap_vals):
        contributions.append({
            "feature": feat,
            "value": float(val),
            "contribution": float(s_val)
        })
        
    # Sort contributions by absolute impact
    contributions = sorted(contributions, key=lambda x: abs(x['contribution']), reverse=True)
    return contributions, float(base_value)

if __name__ == "__main__":
    train_model()
