import re
import uuid
from datetime import datetime

def extract_text_from_document(file_bytes, filename):
    """
    Simulates OCR text extraction (like Tesseract/Textract) from a file.
    If it's a text file, decodes it. Otherwise, returns a simulated text layout.
    """
    if filename.endswith(".txt"):
        try:
            return file_bytes.decode("utf-8")
        except Exception:
            pass
            
    # Try extracting PDF text using PyMuPDF if it's a PDF
    if filename.lower().endswith(".pdf"):
        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            if text.strip():
                return text
        except Exception:
            pass

    # If it's an image or we fail, return what we can or indicate failure.
    # The user strictly requested NO MOCK DATA.
    return "Error: Could not extract text from the document. Please upload a searchable PDF or a Text file."

def parse_structured_fields(raw_text):
    """
    Parses raw OCR text into structured fields using regex.
    Returns: (structured_dict, error_message)
    """
    structured = {
        "vendor_name": None,
        "invoice_number": None,
        "amount": None,
        "invoice_date": None,
        "po_number": None,
        "raw_text": raw_text
    }
    
    # 1. Vendor Name
    # Look for common header indicators or first line
    lines = [line.strip() for line in raw_text.strip().split("\n") if line.strip()]
    if lines:
        # Check first 3 lines for vendor headers
        for line in lines[:3]:
            if "invoice" not in line.lower() and "date" not in line.lower() and "to:" not in line.lower() and "=" not in line:
                structured["vendor_name"] = line
                break
        if not structured["vendor_name"]:
            structured["vendor_name"] = lines[0]
            
    # Clean up vendor name (e.g. strip special chars)
    if structured["vendor_name"]:
        structured["vendor_name"] = re.sub(r'^[=\-*#\s]+|[=\-*#\s]+$', '', structured["vendor_name"]).strip()
        
    # 2. Invoice Number
    inv_match = re.search(r'(?:Invoice\s+Number|Invoice\s+No|Invoice\s+ID|Inv\s+No):?\s*([A-Z0-9\-]+)', raw_text, re.IGNORECASE)
    if inv_match:
        structured["invoice_number"] = inv_match.group(1).strip()
        
    # 3. Amount
    # Matches patterns like Total: $2,050.00 or TOTAL DUE: $8,450.00 or $35,000.00
    amt_match = re.search(r'(?:Total|Total Due|Pay|Amount):?\s*\$?\s*([0-9,]+\.[0-9]{2})', raw_text, re.IGNORECASE)
    if amt_match:
        val_str = amt_match.group(1).replace(",", "")
        try:
            structured["amount"] = float(val_str)
        except ValueError:
            pass
    else:
        # Fallback to general dollar matching
        dollars = re.findall(r'\$\s*([0-9,]+\.[0-9]{2})', raw_text)
        if dollars:
            try:
                structured["amount"] = float(dollars[-1].replace(",", "")) # Assume last dollar amount is total
            except ValueError:
                pass

    # 4. Invoice Date
    # Matches YYYY-MM-DD or DD/MM/YYYY
    date_match = re.search(r'(?:Date):?\s*(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})', raw_text, re.IGNORECASE)
    if date_match:
        date_str = date_match.group(1).strip()
        try:
            if "-" in date_str:
                structured["invoice_date"] = datetime.strptime(date_str, "%Y-%m-%d").date().isoformat()
            else:
                structured["invoice_date"] = datetime.strptime(date_str, "%d/%m/%Y").date().isoformat()
        except ValueError:
            pass

    # 5. PO Number
    po_match = re.search(r'(?:PO\s+Number|PO\s+Reference|PO\s+No|PO):?\s*([PPO0-9\-]+)', raw_text, re.IGNORECASE)
    if po_match:
        structured["po_number"] = po_match.group(1).strip()
        
    # Validation of Schema Completeness (Step 2)
    missing = []
    if not structured["vendor_name"]:
        missing.append("vendor name")
    if not structured["invoice_number"]:
        missing.append("invoice number")
    if not structured["amount"]:
        missing.append("amount")
    if not structured["invoice_date"]:
        missing.append("invoice date")
        
    if missing:
        err = f"Incomplete data: missing {', '.join(missing)}"
        return structured, err
        
    return structured, None
