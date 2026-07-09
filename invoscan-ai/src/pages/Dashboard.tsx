import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  PieChart as RechartsPie, Pie, Cell, Tooltip as RechartsTooltip, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer 
} from 'recharts';
import { DashboardStats } from '../types';
import { AlertTriangle, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const MOCK_TREND_DATA = [
  { day: 'Mon', count: 12 },
  { day: 'Tue', count: 19 },
  { day: 'Wed', count: 15 },
  { day: 'Thu', count: 22 },
  { day: 'Fri', count: 30 },
  { day: 'Sat', count: 5 },
  { day: 'Sun', count: 8 },
];

const COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444'
};

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Calculate severity data for pie chart
  // MOCK DATA since actual endpoint doesn't break down severity yet
  const severityData = [
    { name: 'Low Risk', value: Math.floor((stats?.flagged_count || 0) * 0.1), color: COLORS.low },
    { name: 'Medium Risk', value: Math.floor((stats?.flagged_count || 0) * 0.4), color: COLORS.medium },
    { name: 'High Risk', value: Math.floor((stats?.flagged_count || 0) * 0.3), color: COLORS.high },
    { name: 'Critical', value: Math.floor((stats?.flagged_count || 0) * 0.2), color: COLORS.critical },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Total Processed</div>
          <div className="text-3xl font-black text-gray-900">{stats?.total_processed.toLocaleString()}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
          <div className="text-red-500 text-sm font-bold uppercase tracking-wider mb-2">Flagged Invoices</div>
          <div className="text-3xl font-black text-red-600">{stats?.flagged_count.toLocaleString()}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm md:col-span-2">
          <div className="text-orange-500 text-sm font-bold uppercase tracking-wider mb-2">Total Value at Risk</div>
          <div className="text-3xl font-black text-orange-600">{formatCurrency(stats?.total_value_at_risk || 0)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-800 mb-6">Fraud Detection Trend (7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Breakout */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Flags by Severity</h3>
          <div className="h-48 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={severityData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {severityData.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                <span className="text-gray-600">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Alerts Panel */}
      <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
        <h3 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5" />
          Critical Action Required
        </h3>
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-xl border border-red-200 flex justify-between items-center shadow-sm">
            <div>
              <div className="text-sm font-bold text-gray-900">Vendor: TechCorp Global</div>
              <div className="text-xs text-red-600 font-medium">Risk Score: 98.5 (Ghost Vendor Detected)</div>
            </div>
            <button className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1.5 rounded hover:bg-red-200 transition-colors">
              Review Now
            </button>
          </div>
          <div className="bg-white p-4 rounded-xl border border-red-200 flex justify-between items-center shadow-sm">
            <div>
              <div className="text-sm font-bold text-gray-900">Vendor: Apex Consulting</div>
              <div className="text-xs text-red-600 font-medium">Risk Score: 92.0 (Massive Amount Deviation)</div>
            </div>
            <button className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1.5 rounded hover:bg-red-200 transition-colors">
              Review Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
