import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, AlertTriangle, ShieldCheck, Upload } from 'lucide-react';
import { InvoiceListItem } from '../types';
import { formatCurrency } from '../utils/format';

export default function InvoiceList() {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/invoices/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (res.ok) {
        alert("Upload successful! Navigating to review...");
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        navigate(`/invoices/${data.id}`);
      } else {
        alert(`Upload failed: ${data.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading file.');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const { data, isLoading } = useQuery<{ invoices: InvoiceListItem[], total: number }>({
    queryKey: ['invoices', page, severityFilter],
    queryFn: async () => {
      // In a real app, page and filters would be query parameters
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const json = await res.json();
      
      // Client-side filtering/pagination for mock purposes
      let filtered = json.invoices || [];
      if (severityFilter !== 'all') {
        filtered = filtered.filter((inv: any) => inv.severity.toLowerCase() === severityFilter);
      }
      return {
        invoices: filtered.slice((page - 1) * 20, page * 20),
        total: filtered.length
      };
    }
  });

  const getRiskBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-100 rounded-full flex items-center gap-1 w-max"><AlertTriangle className="w-3 h-3" /> Critical</span>;
      case 'high':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-100 rounded-full flex items-center gap-1 w-max"><AlertTriangle className="w-3 h-3" /> High</span>;
      case 'medium':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 rounded-full w-max">Medium</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 rounded-full flex items-center gap-1 w-max"><ShieldCheck className="w-3 h-3" /> Low</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
      {/* Header & Filters */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by vendor or invoice #..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select 
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg text-sm py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="high">High & Above</option>
              <option value="medium">Medium</option>
              <option value="low">Low (Clean)</option>
            </select>
          </div>
          
          <label className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-teal-700 transition-colors cursor-pointer flex items-center gap-2">
            {isUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isUploading ? 'Uploading...' : 'Upload Invoice'}
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf,.png,.jpg,.jpeg" 
              disabled={isUploading}
              onChange={handleFileUpload} 
            />
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Invoice ID</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Vendor</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Amount</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Date</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Risk Score</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Severity</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div></div>
                </td>
              </tr>
            ) : data?.invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">
                  No invoices found matching criteria.
                </td>
              </tr>
            ) : (
              data?.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors group cursor-pointer">
                  <td className="px-6 py-3">
                    <Link to={`/invoices/${inv.id}`} className="text-sm font-mono font-medium text-teal-600 hover:underline">
                      {inv.invoice_number || `INV-${inv.id}`}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{inv.vendor_name}</td>
                  <td className="px-6 py-3 text-sm font-mono text-gray-600">{formatCurrency(inv.amount)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{inv.ingested_at.substring(0, 10)}</td>
                  <td className="px-6 py-3 text-sm font-mono font-bold text-gray-900">{inv.risk_score.toFixed(1)}</td>
                  <td className="px-6 py-3">{getRiskBadge(inv.severity)}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-bold ${inv.status === 'cleared' ? 'text-green-600' : 'text-amber-600'}`}>
                      {inv.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to <span className="font-medium">{Math.min(page * 20, data?.total || 0)}</span> of <span className="font-medium">{data?.total || 0}</span> results
        </span>
        <div className="flex gap-2">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button 
            disabled={!data || page * 20 >= data.total}
            onClick={() => setPage(p => p + 1)}
            className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
