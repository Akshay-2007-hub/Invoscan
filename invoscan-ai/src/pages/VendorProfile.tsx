import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { ShieldCheck, AlertTriangle, Building2, TrendingUp, History } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const MOCK_VENDOR_HISTORY = [
  { month: 'Jan', amount: 4500, flags: 0 },
  { month: 'Feb', amount: 5200, flags: 0 },
  { month: 'Mar', amount: 4800, flags: 1 },
  { month: 'Apr', amount: 12500, flags: 3 }, // Anomaly
  { month: 'May', amount: 5100, flags: 0 },
  { month: 'Jun', amount: 5800, flags: 0 },
];

export default function VendorProfile() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TechCorp Global</h1>
            <p className="text-sm text-gray-500">Vendor ID: VEND-8492 • Onboarded: Oct 2023</p>
          </div>
        </div>
        
        <div className="px-4 py-2 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl flex items-center gap-2 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <div>
            <div className="text-xs font-bold uppercase">Vendor Risk Profile</div>
            <div className="font-mono text-sm font-bold">Elevated (74.2)</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI Cards */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Total Billed YTD</div>
          <div className="text-3xl font-black text-gray-900">{formatCurrency(37900)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Historical Avg / Invoice</div>
          <div className="text-3xl font-black text-gray-900">{formatCurrency(5400)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
          <div className="text-red-500 text-sm font-bold uppercase tracking-wider mb-2">Total Fraud Flags</div>
          <div className="text-3xl font-black text-red-600">4 <span className="text-sm font-normal text-red-400">incidents</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" /> Billing Pattern History
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_VENDOR_HISTORY} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `$${val/1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                <Area type="monotone" dataKey="amount" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph-based Identity Resolution Panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold flex items-center gap-2 text-gray-800">
            <History className="w-4 h-4 text-teal-600" /> Identity Intelligence
          </div>
          <div className="p-6 flex-1 space-y-4">
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
              <div className="flex items-center gap-2 text-sm font-bold text-orange-800 mb-1">
                <AlertTriangle className="w-4 h-4" /> Shared Bank Account
              </div>
              <p className="text-xs text-orange-700">This vendor's bank account (ending in 8832) is also linked to <b>Apex Consulting</b>, which was flagged for fraud on Apr 12th.</p>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <div className="flex items-center gap-2 text-sm font-bold text-green-800 mb-1">
                <ShieldCheck className="w-4 h-4" /> Verified Registration
              </div>
              <p className="text-xs text-green-700">Company registration ID verified against national corporate registry. Tax ID matches.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
