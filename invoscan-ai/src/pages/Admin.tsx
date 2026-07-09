import React, { useState } from 'react';
import { Settings, ShieldCheck, Database, Bell, Key } from 'lucide-react';

export default function Admin() {
  const [apiKey, setApiKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);

  const handleSaveApiKey = async () => {
    if (!apiKey) return;
    setIsSavingKey(true);
    try {
      const res = await fetch('/api/config/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });
      if (res.ok) {
        alert("API Key saved securely to the backend.");
        setApiKey('');
      } else {
        alert("Failed to save API Key.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving API Key.");
    } finally {
      setIsSavingKey(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
        <p className="text-sm text-gray-500">Manage thresholds, integrations, and API keys.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Generative AI Configuration */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:col-span-2">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-teal-600" /> Generative AI Configuration
          </h3>
          <p className="text-xs text-gray-500 mb-6">
            Enter your Anthropic Claude API Key to enable dynamic, natural language explanations for flagged invoices. 
            Without a key, the system will use the default rule-based explanation engine.
          </p>
          <div className="flex gap-4">
            <input 
              type="password" 
              placeholder="sk-ant-api03-..." 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="border border-gray-300 rounded-xl text-sm p-3 flex-1 focus:ring-2 focus:ring-teal-500 outline-none font-mono"
            />
            <button 
              onClick={handleSaveApiKey}
              disabled={isSavingKey || !apiKey}
              className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-700 shadow-sm transition-all disabled:opacity-50"
            >
              {isSavingKey ? 'Saving...' : 'Save Key'}
            </button>
          </div>
        </div>

        {/* Threshold Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-600" /> Risk Thresholds
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">Critical Severity Threshold</label>
                <span className="text-xs text-red-600 font-bold">85</span>
              </div>
              <input type="range" min="0" max="100" value="85" readOnly className="w-full accent-red-600" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">High Severity Threshold</label>
                <span className="text-xs text-orange-600 font-bold">60</span>
              </div>
              <input type="range" min="0" max="100" value="60" readOnly className="w-full accent-orange-500" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">Medium Severity Threshold</label>
                <span className="text-xs text-amber-600 font-bold">30</span>
              </div>
              <input type="range" min="0" max="100" value="30" readOnly className="w-full accent-amber-500" />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm font-bold cursor-not-allowed">Save Thresholds</button>
          </div>
        </div>

        {/* Integration Status */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-600" /> Integration Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div>
                  <div className="text-sm font-bold text-gray-900">ERP System (SAP)</div>
                  <div className="text-xs text-gray-500">Last synced: 2 mins ago</div>
                </div>
              </div>
              <button className="text-xs font-bold text-teal-600 hover:underline">Sync Now</button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div>
                  <div className="text-sm font-bold text-gray-900">Hybrid ML Engine (XGBoost)</div>
                  <div className="text-xs text-gray-500">Model Ver: v2.1.4</div>
                </div>
              </div>
              <button className="text-xs font-bold text-teal-600 hover:underline">Retrain</button>
            </div>
          </div>
        </div>

        {/* Alerts Config */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:col-span-2">
          <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-600" /> Notification & Alerts Config
          </h3>
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <input type="checkbox" defaultChecked className="w-5 h-5 accent-teal-600 rounded" />
            <div>
              <div className="text-sm font-bold text-gray-900">Push Critical Alerts to Dashboard</div>
              <div className="text-xs text-gray-500">Instantly notify online users when a score exceeds 85.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
