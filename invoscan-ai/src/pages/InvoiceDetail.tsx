import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, ShieldCheck, 
  FileText, Activity, ServerCrash 
} from 'lucide-react';
import { InvoiceDetail as IInvoiceDetail } from '../types';
import { formatCurrency } from '../utils/format';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading, error } = useQuery<IInvoiceDetail>({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error('Failed to fetch invoice details');
      return res.json();
    },
    enabled: !!id
  });

  const reviewMutation = useMutation({
    mutationFn: async (action: string) => {
      const res = await fetch(`/api/invoices/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (!res.ok) throw new Error('Failed to submit review');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-8 text-center text-red-600">
        Error loading invoice details.
      </div>
    );
  }

  // Format SHAP data for Recharts
  const shapData = (invoice.shap_drivers || []).map(d => ({
    name: d.feature,
    value: d.contribution,
    displayValue: d.value
  })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 5);

  const getSeverityColors = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'medium': return 'bg-amber-50 border-amber-200 text-amber-800';
      default: return 'bg-green-50 border-green-200 text-green-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              {invoice.vendor.name}
              <span className={`text-xs px-2.5 py-1 rounded-full uppercase tracking-wider font-bold border ${getSeverityColors(invoice.severity)}`}>
                {invoice.severity} Risk
              </span>
            </h1>
            <p className="text-sm text-gray-500">Invoice #{invoice.invoice_number || `INV-${invoice.id}`} • {invoice.invoice_date || invoice.ingested_at.substring(0, 10)}</p>
          </div>
        </div>
        
        {/* ACTION PANEL (Step 5) */}
        {invoice.status === 'pending_review' ? (
          <div className="flex gap-3">
            <button 
              onClick={() => reviewMutation.mutate('approve')}
              disabled={reviewMutation.isPending}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-bold shadow-sm transition-all"
            >
              Mark False Positive
            </button>
            <button 
              onClick={() => reviewMutation.mutate('escalate')}
              disabled={reviewMutation.isPending}
              className="px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Escalate to Audit
            </button>
            <button 
              onClick={() => reviewMutation.mutate('reject')}
              disabled={reviewMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl text-sm font-bold shadow-sm shadow-red-600/20 transition-all flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Hold & Flag Fraud
            </button>
            <button 
              onClick={() => reviewMutation.mutate('approve')}
              disabled={reviewMutation.isPending}
              className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-xl text-sm font-bold shadow-sm shadow-teal-600/20 transition-all flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Approve Payment
            </button>
          </div>
        ) : (
          <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold border border-gray-200">
            Status: {invoice.status.replace('_', ' ').toUpperCase()}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Data & OCR */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold flex items-center gap-2 text-gray-800">
              <FileText className="w-4 h-4 text-teal-600" /> Original Invoice Data
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Amount</label>
                <div className="text-lg font-mono font-medium">{formatCurrency(invoice.amount)}</div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Bank Account</label>
                <div className="text-sm font-mono mt-1">{invoice.vendor.bank_account || 'N/A'}</div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100">
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">OCR Extracted Text</label>
              <div className="bg-gray-900 text-gray-300 font-mono text-xs p-3 rounded-lg max-h-64 overflow-y-auto">
                {invoice.ocr_text || 'No text extracted.'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Explanation (Step 4) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className={`p-6 rounded-2xl border shadow-sm ${getSeverityColors(invoice.severity)}`}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black mb-2 flex items-center gap-2">
                  <Activity className="w-6 h-6" /> 
                  Risk Score: {invoice.risk_score.toFixed(1)} / 100
                </h2>
                <p className="text-sm font-medium">{invoice.explanation}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold flex items-center gap-2 text-gray-800">
              <ServerCrash className="w-4 h-4 text-teal-600" /> AI Decision Drivers
            </div>
            
            <div className="p-6">
              {/* Hard Rules */}
              {invoice.flagged_rules && invoice.flagged_rules.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Triggered Rules</h3>
                  <div className="space-y-2">
                    {invoice.flagged_rules.map((rule, i) => (
                      <div key={i} className="flex justify-between items-center bg-red-50 border border-red-100 p-3 rounded-lg">
                        <div>
                          <div className="text-sm font-bold text-red-800">{rule.rule_name}</div>
                          <div className="text-xs text-red-600">{rule.description}</div>
                        </div>
                        <div className="text-red-700 font-mono font-bold text-sm">+{rule.weight}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SHAP Chart */}
              {shapData.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">XGBoost Feature Importance (SHAP)</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer>
                      <BarChart data={shapData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                        <RechartsTooltip 
                          formatter={(value: any, name: any, props: any) => [
                            `Contribution: ${Number(value).toFixed(2)} (Val: ${props.payload.displayValue})`, 
                            'Impact'
                          ]}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {shapData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#ef4444' : '#10b981'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
