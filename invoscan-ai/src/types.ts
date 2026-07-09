export interface VendorDetails {
  name: string;
  onboarding_date: string | null;
  historical_transaction_count: number;
  average_invoice_value: number;
  tax_id: string;
  bank_account: string;
  address: string;
  contact_email: string;
}

export interface ShapDriver {
  feature: string;
  value: number;
  contribution: number;
}

export interface FlaggedRule {
  rule_name: string;
  rule_type: string;
  weight: number;
  description: string;
}

export interface AuditLog {
  action: string;
  user: string;
  comment: string;
  timestamp: string;
}

export interface InvoiceDetail {
  id: number;
  transaction_id: string;
  invoice_number: string;
  vendor_id: string;
  vendor: VendorDetails;
  amount: number;
  invoice_date: string | null;
  po_number: string | null;
  status: "cleared" | "pending_review" | "on_hold" | "escalated";
  risk_score: number;
  severity: "low" | "medium" | "high" | "critical";
  ingested_at: string;
  analyzed_at: string | null;
  ocr_text: string;
  explanation: string;
  shap_drivers: ShapDriver[];
  flagged_rules: FlaggedRule[];
  audit_logs: AuditLog[];
}

export interface InvoiceListItem {
  id: number;
  transaction_id: string;
  invoice_number: string;
  vendor_id: string;
  vendor_name: string;
  amount: number;
  invoice_date: string | null;
  po_number: string | null;
  status: string;
  risk_score: number;
  severity: string;
  ingested_at: string;
}

export interface DashboardStats {
  total_processed: number;
  flagged_count: number;
  total_value_at_risk: number;
  fraud_rate: number;
  severity_splits: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  status_splits: {
    cleared: number;
    pending_review: number;
    on_hold: number;
  };
}
