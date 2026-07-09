import { InvoiceScan } from "../types";

export const SAMPLE_INVOICES: InvoiceScan[] = [
  {
    id: "sample-1",
    fileName: "invoice_lumina_logistics_urgent.png",
    fileSize: "245 KB",
    mimeType: "image/png",
    timestamp: "2026-07-09T04:30:00-07:00",
    report: {
      extracted_fields: {
        vendor_name: "Lumina Logistics GmbH",
        invoice_number: "LMG-2026-4402",
        invoice_date: "2026-07-05",
        due_date: "2026-07-06",
        billing_address: "TechHub South, Suite 400, Austin, TX 78701",
        bank_account_iban: "DE44 5002 0000 1289 0019 12",
        line_items: [
          { description: "Priority Air Freight - Express Handling", quantity: 1, unit_price: 12450.00, amount: 12450.00 }
        ],
        subtotal: 12450.00,
        tax: 0.00,
        total_amount: 12450.00,
        vendor_tax_id: "DE 281 992 011",
        registered_address: "Industriestrasse 12, 10115 Berlin, Germany",
        po_number: "PO-99231"
      },
      risk_score: 88,
      risk_level: "Critical",
      flagged_issues: [
        {
          category: "Payment Detail Change",
          severity: "High",
          description: "The extracted IBAN (DE44 5002...) does not match Lumina Logistics GmbH's verified historical IBAN (DE88 3902...). This is a critical risk of Payment Redirect/Hijack fraud."
        },
        {
          category: "Urgency Language",
          severity: "High",
          description: "Invoice contains high-pressure warning language: 'IMMEDIATE WIRE TRANSFER REQUIRED - PENALTIES APPLY' which is highly atypical for pre-arranged logistic agreements."
        },
        {
          category: "Suspicious Amount",
          severity: "Medium",
          description: "A single line item of $12,450.00 without supplementary details is inconsistent with prior transaction averages of $3,500.00 for this shipper."
        }
      ],
      recommendation: "Reject"
    }
  },
  {
    id: "sample-2",
    fileName: "techflow_solutions_clean.png",
    fileSize: "182 KB",
    mimeType: "image/png",
    timestamp: "2026-07-09T03:15:00-07:00",
    report: {
      extracted_fields: {
        vendor_name: "TechFlow Solutions",
        invoice_number: "TFS-9812",
        invoice_date: "2026-07-01",
        due_date: "2026-07-31",
        billing_address: "100 Pine Street, San Francisco, CA 94111",
        bank_account_iban: "US45WELLS908123456789",
        line_items: [
          { description: "SaaS Enterprise Subscription - Standard Tier", quantity: 12, unit_price: 150.00, amount: 1800.00 },
          { description: "Direct Dedicated Support Hours", quantity: 5, unit_price: 200.00, amount: 1000.00 }
        ],
        subtotal: 2800.00,
        tax: 238.00,
        total_amount: 3038.00,
        vendor_tax_id: "US-88-990123",
        registered_address: "100 Pine Street, San Francisco, CA 94111",
        po_number: "PO-8871"
      },
      risk_score: 5,
      risk_level: "Low",
      flagged_issues: [],
      recommendation: "Approve"
    }
  },
  {
    id: "sample-3",
    fileName: "vertex_consulting_mismatch.png",
    fileSize: "310 KB",
    mimeType: "image/png",
    timestamp: "2026-07-08T18:40:00-07:00",
    report: {
      extracted_fields: {
        vendor_name: "Vertex Consulting Ltd",
        invoice_number: "INV-2026-091",
        invoice_date: "2026-06-28",
        due_date: "2026-07-15",
        billing_address: "500 5th Ave, New York, NY 10110",
        bank_account_iban: "GB33BARC60111223344556",
        line_items: [
          { description: "Strategic Management Advising", quantity: 40, unit_price: 250.00, amount: 10000.00 },
          { description: "Travel & Expenses Reimbursement", quantity: 1, unit_price: 850.00, amount: 1850.00 }
        ],
        subtotal: 10850.00,
        tax: 1085.00,
        total_amount: 12935.00,
        vendor_tax_id: "",
        registered_address: "",
        po_number: ""
      },
      risk_score: 55,
      risk_level: "High",
      flagged_issues: [
        {
          category: "Math Inconsistency",
          severity: "High",
          description: "The line item 'Travel & Expenses' lists quantity 1, unit price $850.00, but calculates the amount as $1,850.00 (a $1,000 discrepancy). Subtotal is stated as $10,850.00, but sums up to $11,850.00 mathematically."
        },
        {
          category: "Missing Standard Fields",
          severity: "Medium",
          description: "Standard compliant elements are missing: Registered Vendor Address, Vendor Tax ID, and Purchase Order (PO) number."
        }
      ],
      recommendation: "Review Manually"
    }
  }
];
