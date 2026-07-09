import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import pickle
import os

def generate_synthetic_data(num_invoices=2000, num_vendors=100, save_dir=None):
    if save_dir is None:
        save_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(save_dir, exist_ok=True)
    
    np.random.seed(42)
    random.seed(42)
    
    # 1. Generate Vendors
    vendor_types = ["Logistics", "IT Services", "Office Supplies", "Marketing", "Consulting", "Catering", "Facilities"]
    vendor_names = [
        "TechNova Solutions", "Apex Logistics", "Globex Office", "Omni Marketing", "Quantum Consulting",
        "Vanguard Security", "Summit Facilities", "Pinnacle Catering", "BlueSky IT", "Starlight Media",
        "Alpha Partners", "Delta Freight", "Prime Supplies", "Core Tech", "Nova Group", "Axis Energy",
        "Helix Labs", "Zenith Printing", "Matrix Corp", "Atlas Steel"
    ]
    
    # Generate random business names to fill up to num_vendors
    idx = 1
    while len(vendor_names) < num_vendors:
        word1 = random.choice(["Summit", "Pioneer", "Global", "NextGen", "Integra", "Apex", "Elite", "Horizon", "Sterling", "Velocity"]) + str(idx)
        word2 = random.choice(["Enterprises", "Industries", "Group", "Services", "Systems", "Technologies", "Logistics", "Ventures"])
        suffix = random.choice(["LLC", "Inc.", "Pvt. Ltd.", "Corp."])
        name = f"{word1} {word2} {suffix}"
        if name not in vendor_names:
            vendor_names.append(name)
            idx += 1
            
    vendors = []
    start_date = datetime(2022, 1, 1)
    
    for i in range(num_vendors):
        v_id = f"VEND{i+1:03d}"
        name = vendor_names[i]
        
        cleaned = name.lower().replace(".", "").replace(",", "").replace("-", "").replace(" ", "").strip()
        suffixes = ["pvtltd", "pvt", "ltd", "llc", "inc", "corp", "co", "incorporated", "limited", "group", "solutions", "technologies", "services"]
        for s in suffixes:
            if cleaned.endswith(s):
                cleaned = cleaned[:-len(s)]
        canonical_name = cleaned

        onboard_date = start_date + timedelta(days=random.randint(0, 1000))
        
        # Vendor characteristics
        avg_val = round(float(np.random.exponential(scale=3000) + 200), 2)
        tx_count = random.randint(5, 120)
        
        tax_id = f"TX-{random.randint(100000, 999999)}-{random.choice(['A', 'B', 'C'])}"
        bank_account = f"GB{random.randint(10, 99)}BARC{random.randint(100000, 999999)}{random.randint(10, 99)}"
        address = f"{random.randint(10, 999)} Business Park, Suite {random.randint(1, 50)}, London"
        contact_email = f"billing@{canonical_name.replace(' ', '')[:15]}.com"
        
        vendors.append({
            "vendor_id": v_id,
            "name": name,
            "canonical_name": canonical_name,
            "onboarding_date": onboard_date,
            "historical_transaction_count": tx_count,
            "average_invoice_value": avg_val,
            "tax_id": tax_id,
            "bank_account": bank_account,
            "address": address,
            "contact_email": contact_email
        })
        
    df_vendors = pd.DataFrame(vendors)
    
    # Save vendor master pickle for configuration access
    with open(os.path.join(save_dir, "vendors_master.pkl"), "wb") as f:
        pickle.dump(df_vendors.to_dict('records'), f)
        
    # 2. Generate Invoices
    invoices = []
    base_date = datetime(2025, 1, 1)
    
    for i in range(num_invoices):
        # Pick random vendor
        vendor = random.choice(vendors)
        v_id = vendor["vendor_id"]
        v_avg = vendor["average_invoice_value"]
        
        # Calculate normal amount
        # 5% of legitimate invoices are naturally large (e.g., annual renewals, bulk orders)
        if random.random() > 0.95:
            amount = round(float(np.random.normal(loc=v_avg*4, scale=v_avg)), 2)
        else:
            amount = round(float(np.random.normal(loc=v_avg, scale=v_avg*0.25)), 2)
        amount = max(amount, 50.0) # Ensure positive and reasonable minimum
        
        inv_date = base_date + timedelta(days=random.randint(0, 180))
        # Random hour (mostly business hours, some evening)
        hour = random.choices(list(range(24)), weights=[1]*7 + [5]*11 + [3]*6)[0]
        minute = random.randint(0, 59)
        inv_datetime = datetime.combine(inv_date.date(), datetime.min.time()) + timedelta(hours=hour, minutes=minute)
        
        inv_num = f"INV-{random.randint(100000, 999999)}"
        po_num = f"PO-{random.randint(100000, 999999)}" if random.random() > 0.3 else None
        
        invoices.append({
            "invoice_number": inv_num,
            "vendor_id": v_id,
            "amount": amount,
            "invoice_date": inv_datetime,
            "po_number": po_num,
            "fraud_label": 0,
            "fraud_type": "None"
        })
        
    # 3. Plant Fraud Patterns (~5-8% of the dataset)
    # Pattern A: Duplicate invoices (exact amount, vendor, date)
    num_duplicates = int(num_invoices * 0.02)
    for _ in range(num_duplicates):
        idx = random.randint(0, len(invoices) - 1)
        orig = invoices[idx]
        
        # Create exact duplicate
        dup = orig.copy()
        # Add 1-2 hours delay to simulate duplicate ingestion
        dup["invoice_date"] = orig["invoice_date"] + timedelta(hours=random.randint(1, 3))
        # Same invoice number, or slightly altered
        if random.random() > 0.5:
            dup["invoice_number"] = orig["invoice_number"] # Exact duplicate
        else:
            dup["invoice_number"] = orig["invoice_number"] + "A" # Near duplicate
            
        dup["fraud_label"] = 1
        dup["fraud_type"] = "Duplicate Check"
        invoices.append(dup)
        
    # Pattern B: Ghost Vendor (Invoices from vendors not in master list or newly registered and immediate high-value bills)
    # We will represent this by creating an invoice with vendor_id = VEND999 (not in vendor list) or using newly registered vendors.
    # To keep it clean, let's create a new set of ghost invoices using vendor_ids that aren't in the df_vendors
    num_ghosts = int(num_invoices * 0.015)
    for _ in range(num_ghosts):
        inv_date = base_date + timedelta(days=random.randint(0, 180))
        inv_num = f"INV-{random.randint(100000, 999999)}"
        amount = round(float(np.random.uniform(15000, 45000)), 2) # unusually high
        
        # Ghost vendor name and ID not in vendor master
        g_id = f"VEND{random.randint(900, 999):03d}"
        
        invoices.append({
            "invoice_number": inv_num,
            "vendor_id": g_id,
            "amount": amount,
            "invoice_date": inv_date,
            "po_number": None,
            "fraud_label": 1,
            "fraud_type": "Ghost Vendor"
        })
        
    # Pattern C: Threshold Splitting (multiple invoices under $10,000 threshold)
    # Say the threshold is $10,000. Finance team manual approval triggers above $10,000.
    # Vendor submits three invoices of $9,800, $9,850, and $9,900 within a few days.
    num_splits = int(num_invoices * 0.015)
    for _ in range(num_splits):
        vendor = random.choice(vendors)
        v_id = vendor["vendor_id"]
        inv_date = base_date + timedelta(days=random.randint(10, 170))
        
        # Seed 3 split invoices
        for j in range(3):
            inv_num = f"INV-{random.randint(100000, 999999)}"
            amount = round(float(random.uniform(9700, 9995)), 2) # Just below $10,000
            split_date = inv_date + timedelta(days=j, hours=random.randint(0, 4))
            
            invoices.append({
                "invoice_number": inv_num,
                "vendor_id": v_id,
                "amount": amount,
                "invoice_date": split_date,
                "po_number": None,
                "fraud_label": 1,
                "fraud_type": "Threshold Split"
            })
            
    # Pattern D: Sudden spike in volume or extreme deviations
    num_spikes = int(num_invoices * 0.015)
    for _ in range(num_spikes):
        vendor = random.choice(vendors)
        v_id = vendor["vendor_id"]
        v_avg = vendor["average_invoice_value"]
        
        # High value anomaly: 8x historical average
        amount = round(v_avg * float(random.uniform(6, 12)), 2)
        inv_date = base_date + timedelta(days=random.randint(0, 180))
        inv_num = f"INV-{random.randint(100000, 999999)}"
        
        invoices.append({
            "invoice_number": inv_num,
            "vendor_id": v_id,
            "amount": amount,
            "invoice_date": inv_date,
            "po_number": None,
            "fraud_label": 1,
            "fraud_type": "Volume/Value Anomaly"
        })
        
    # Shuffle invoices using python list shuffle to avoid pandas sample crash
    random.shuffle(invoices)
    df_invoices = pd.DataFrame(invoices)

    
    # Save datasets
    df_vendors.to_csv(os.path.join(save_dir, "synthetic_vendors.csv"), index=False)
    df_invoices.to_csv(os.path.join(save_dir, "synthetic_invoices.csv"), index=False)
    
    print(f"Data generation complete: {len(df_vendors)} vendors, {len(df_invoices)} invoices generated.")
    print(f"Fraud instances planted: {df_invoices['fraud_label'].sum()} ({df_invoices['fraud_label'].mean()*100:.2f}%)")
    
    return df_vendors, df_invoices

if __name__ == "__main__":
    generate_synthetic_data()
