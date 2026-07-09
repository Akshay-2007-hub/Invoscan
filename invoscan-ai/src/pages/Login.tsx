import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, UserRole } from '../store/authStore';
import { ShieldCheck, UserCheck, Key, Settings } from 'lucide-react';

export default function Login() {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = (role: UserRole) => {
    login({
      id: `usr_${Math.random().toString(36).substr(2, 9)}`,
      name: role === 'finance_officer' ? 'Jane Doe' : role === 'auditor' ? 'Robert Smith' : 'Admin User',
      email: `${role}@enterprise.com`,
      role: role,
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-600/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">
            InvoScan AI
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            Enterprise Fraud Detection Engine
          </p>
        </div>
        
        <div className="mt-10">
          <p className="text-sm font-bold text-gray-500 mb-4 text-center uppercase tracking-widest">
            Mock SSO Login (Select Role)
          </p>
          <div className="space-y-4">
            <button
              onClick={() => handleLogin('finance_officer')}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md transition-all"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <UserCheck className="h-5 w-5 text-blue-300 group-hover:text-blue-200" />
              </span>
              Login as Finance Officer
            </button>

            <button
              onClick={() => handleLogin('auditor')}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-md transition-all"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <Key className="h-5 w-5 text-teal-300 group-hover:text-teal-200" />
              </span>
              Login as Auditor
            </button>

            <button
              onClick={() => handleLogin('admin')}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-gray-300 text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 shadow-sm transition-all"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <Settings className="h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              </span>
              Login as Administrator
            </button>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 font-medium">
            Protected by Enterprise Identity Provider
          </p>
        </div>
      </div>
    </div>
  );
}
