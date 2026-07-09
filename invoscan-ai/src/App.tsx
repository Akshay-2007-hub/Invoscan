import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { 
  ShieldCheck, LayoutDashboard, FileStack, Building2, 
  FileDown, Settings, LogOut, Bell
} from 'lucide-react';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InvoiceList from './pages/InvoiceList';
import InvoiceDetail from './pages/InvoiceDetail';
import VendorProfile from './pages/VendorProfile';
import Reports from './pages/Reports';
import Admin from './pages/Admin';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/invoices', label: 'Review Queue', icon: FileStack },
    { path: '/vendors', label: 'Vendor Risk', icon: Building2 },
    { path: '/reports', label: 'Audit Reports', icon: FileDown },
  ];

  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', label: 'System Config', icon: Settings });
  }

  return (
    <div className="min-h-screen flex bg-[#F9FAFB] text-gray-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-10 shadow-sm">
        <div className="p-6 flex flex-col flex-1">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-gray-900 leading-none">InvoScan AI</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-teal-50 text-teal-700 border border-teal-100' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="pt-6 border-t border-gray-100 mt-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-xs uppercase border border-gray-200">
                  {user?.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">{user?.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase">{user?.role.replace('_', ' ')}</p>
                </div>
              </div>
              <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-end flex-shrink-0">
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* Page Outlet */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><AppShell><Dashboard /></AppShell></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><AppShell><InvoiceList /></AppShell></ProtectedRoute>} />
        <Route path="/invoices/:id" element={<ProtectedRoute><AppShell><InvoiceDetail /></AppShell></ProtectedRoute>} />
        <Route path="/vendors" element={<ProtectedRoute><AppShell><VendorProfile /></AppShell></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><AppShell><Reports /></AppShell></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AppShell><Admin /></AppShell></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
