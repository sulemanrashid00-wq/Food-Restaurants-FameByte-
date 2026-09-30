import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/Login/LoginPage';
import MenuPage from './pages/Menu/MenuPage';
import TableManagementPage from './pages/Tables/TableManagementPage';
import NewOrderPage from './pages/Orders/NewOrderPage';
import OrderListPage from './pages/Orders/OrderListPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import InventoryPage from './pages/Inventory/InventoryPage';
import BillingPage from './pages/Billing/BillingPage';

// Icons
import { 
  Loader2, Utensils, LayoutDashboard, BookOpen, Star, 
  Truck, BarChart2, Settings, LogOut, Armchair, ShoppingBag, 
  Clock, Boxes, Vault, Menu, X, Flame
} from 'lucide-react';

function ProtectedDashboard() {
  const { user, profile, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1. Initial Auth Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDF7F2] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-orange-500" />
        <p className="text-xs font-bold text-neutral-500">Checking credentials...</p>
      </div>
    );
  }

  // 2. Strict Auth Guard: Agar user nahi hai toh login screen par bhej do
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin Workspace
  if (profile?.role === 'Admin') {
    const navItems = [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'menu', label: 'Menu Management', icon: BookOpen },
      { id: 'tables', label: 'Floor & Tables', icon: Armchair },
      { id: 'new-order', label: 'New POS Order', icon: ShoppingBag },
      { id: 'orders-list', label: 'Live Kitchen Tickets', icon: Clock },
      { id: 'inventory', label: 'Inventory & Stock', icon: Boxes },
      { id: 'billing', label: 'Billing & Register', icon: Vault },
      { id: 'analytics', label: 'Business Analytics', icon: BarChart2 },
    ];

    const handleTabChange = (tabId) => {
      setActiveTab(tabId);
      setMobileMenuOpen(false);
    };

    return (
      <div className="min-h-screen bg-[#FDF7F2] flex flex-col md:flex-row p-3 md:p-6 gap-6 relative">
        
        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-orange-100/80 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shadow-orange-500/30">
              D
            </div>
            <div>
              <h1 className="text-xs font-black text-neutral-900 leading-none">Delicious</h1>
              <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">FAMEBYTE POS</p>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-neutral-100 text-neutral-700 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Sidebar (Desktop Permanent / Mobile Slide Drawer) */}
        <aside className={`
          bg-white rounded-3xl p-6 shadow-xs border border-orange-100/60 
          flex flex-col justify-between shrink-0
          ${mobileMenuOpen ? 'fixed inset-x-3 top-20 z-50 shadow-2xl block' : 'hidden'}
          md:flex md:w-64 md:h-[calc(100vh-3rem)] md:sticky md:top-6
        `}>
          <div>
            {/* Desktop Brand Logo */}
            <div className="hidden md:flex items-center gap-3 mb-8 px-2">
              <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-orange-500/30">
                D
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-neutral-800 tracking-tight">Delicious</h1>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">FAMEBYTE POS</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1 text-xs font-semibold overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition cursor-pointer text-left ${
                      isActive
                        ? 'bg-orange-50 text-orange-600 font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="pt-2 border-t border-neutral-100 mt-2 space-y-1">
                <div className="flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-neutral-300 text-xs cursor-not-allowed">
                  <Star className="w-4 h-4" />
                  <span>Rating & reviews</span>
                </div>
                <div className="flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-neutral-300 text-xs cursor-not-allowed">
                  <Truck className="w-4 h-4" />
                  <span>Delivery Fleet</span>
                </div>
                <div className="flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-neutral-300 text-xs cursor-not-allowed">
                  <Settings className="w-4 h-4" />
                  <span>System Settings</span>
                </div>
              </div>
            </nav>
          </div>

          {/* Admin Profile & Logout Section */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between mt-4">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-neutral-800 truncate">{profile?.full_name || 'Admin'}</p>
              <p className="text-[10px] text-orange-600 font-semibold">Administrator</p>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 min-w-0 bg-transparent overflow-y-auto">
          {activeTab === 'overview' && <DashboardPage />}
          {activeTab === 'menu' && <MenuPage />}
          {activeTab === 'tables' && <TableManagementPage />}
          {activeTab === 'new-order' && <NewOrderPage />}
          {activeTab === 'orders-list' && <OrderListPage />}
          {activeTab === 'inventory' && <InventoryPage />}
          {activeTab === 'billing' && <BillingPage />}
          {activeTab === 'analytics' && <AnalyticsPage />}
        </main>
      </div>
    );
  }

  // Staff POS View
  return (
    <div className="min-h-screen bg-[#FDF7F2] p-8 flex items-center justify-center">
      <div className="bg-white p-8 rounded-3xl shadow-xs border border-orange-100 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <Utensils className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-800">Staff POS Terminal</h2>
          <p className="text-xs text-neutral-500 mt-1">Logged in as {profile?.full_name}</p>
        </div>
        <button
          onClick={logout}
          className="w-full py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedDashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}