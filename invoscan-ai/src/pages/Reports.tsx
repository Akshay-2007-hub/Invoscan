import React, { useState } from 'react';
import { FileDown, Calendar, Filter, FileText } from 'lucide-react';

export default function Reports() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert("Mock Report Generated! Downloading PDF...");
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance & Audit Reports</h1>
          <p className="text-sm text-gray-500">Generate period-end reports for compliance and auditing purposes.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5 text-teal-600" /> New Report Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date Range</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input type="date" className="border border-gray-300 rounded-lg text-sm p-2 flex-1 focus:ring-2 focus:ring-teal-500 outline-none" />
              <span className="text-gray-400">to</span>
              <input type="date" className="border border-gray-300 rounded-lg text-sm p-2 flex-1 focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Severity Filter</label>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select className="border border-gray-300 rounded-lg text-sm p-2 flex-1 focus:ring-2 focus:ring-teal-500 outline-none">
                <option>All Flags</option>
                <option>Critical & High Only</option>
                <option>False Positives Only</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate PDF Report'}
          </button>
        </div>
      </div>

      {/* History */}
      <h3 className="text-sm font-bold text-gray-800 mt-8 mb-4">Previous Reports</h3>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Report Name</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date Generated</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">Q1 Fraud Summary Report</td>
              <td className="px-6 py-4 text-sm text-gray-500">2026-04-01</td>
              <td className="px-6 py-4 text-sm text-gray-500">Admin User</td>
              <td className="px-6 py-4"><button className="text-teal-600 text-sm font-bold hover:underline">Download</button></td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">Monthly High-Risk Exceptions</td>
              <td className="px-6 py-4 text-sm text-gray-500">2026-03-01</td>
              <td className="px-6 py-4 text-sm text-gray-500">Robert Smith</td>
              <td className="px-6 py-4"><button className="text-teal-600 text-sm font-bold hover:underline">Download</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
