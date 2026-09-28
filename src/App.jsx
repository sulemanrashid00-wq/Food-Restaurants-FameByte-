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
import CustomerOrderPage from './pages/Customer/CustomerOrderPage';

// Icons
import { 
  Loader2, Utensils, LayoutDashboard, BookOpen, Star, 
  Truck, BarChart2, Settings, LogOut, Armchair, ShoppingBag, 
  Clock, Boxes, Vault
} from 'lucide-react';

function DashboardRouter() {
  const { user, profile, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF7F2]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (profile?.role === 'Admin') {
    return (
      <div className="min-h-screen bg-[#FDF7F2] flex p-3 md:p-6 gap-6">
        
        {/* Left White Sidebar */}
        <aside className="w-64 bg-white rounded-3xl p-6 shadow-xs border border-orange-100/60 hidden md:flex flex-col justify-between shrink-0 h-[calc(100vh-3rem)] sticky top-6">
          <div>
            {/* Brand Logo */}
            <div className="flex items-center gap-3 mb-8 px-2">
              <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-orange-500/30">
                D
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-neutral-800 tracking-tight">Delicious</h1>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">FAMEBYTE POS</p>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav className="space-y-1 text-xs font-semibold overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
              {/* Overview / Executive Dashboard */}
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition cursor-pointer text-left ${
                  activeTab === 'overview'
                    ? 'bg-orange-50 text-orange-600 font-bold'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview</span>
              </button>

              {/* Menu Tab */}
              <button
                onClick={() => setActiveTab('menu')}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition cursor-pointer text-left ${
                  activeTab === 'menu'
                    ? 'bg-orange-50 text-orange-600 font-bold'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Menu Management</span>
              </button>

              {/* Tables & Floor Tab */}
              <button
                onClick={() => setActiveTab('tables')}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition cursor-pointer text-left ${
                  activeTab === 'tables'
                    ? 'bg-orange-50 text-orange-600 font-bold'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                <Armchair className="w-4 h-4" />
                <span>Floor & Tables</span>
              </button>

              {/* New POS Order Tab */}
              <button
                onClick={() => setActiveTab('new-order')}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition cursor-pointer text-left ${
                  activeTab === 'new-order'
                    ? 'bg-orange-50 text-orange-600 font-bold'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>New POS Order</span>
              </button>

              {/* Live Kitchen Tickets Tab */}
              <button
                onClick={() => setActiveTab('orders-list')}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition cursor-pointer text-left ${
                  activeTab === 'orders-list'
                    ? 'bg-orange-50 text-orange-600 font-bold'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Live Kitchen Tickets</span>
              </button>

              {/* Inventory & Stock Tab */}
              <button
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition cursor-pointer text-left ${
                  activeTab === 'inventory'
                    ? 'bg-orange-50 text-orange-600 font-bold'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                <Boxes className="w-4 h-4" />
                <span>Inventory & Stock</span>
              </button>

              {/* Billing & Register Z-Report Tab */}
              <button
                onClick={() => setActiveTab('billing')}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition cursor-pointer text-left ${
                  activeTab === 'billing'
                    ? 'bg-orange-50 text-orange-600 font-bold'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                <Vault className="w-4 h-4" />
                <span>Billing & Register</span>
              </button>

              {/* Business Analytics Tab */}
              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition cursor-pointer text-left ${
                  activeTab === 'analytics'
                    ? 'bg-orange-50 text-orange-600 font-bold'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                <span>Business Analytics</span>
              </button>

              <div className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-neutral-300 cursor-not-allowed">
                <Star className="w-4 h-4" />
                <span>Rating & reviews</span>
              </div>

              <div className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-neutral-300 cursor-not-allowed">
                <Truck className="w-4 h-4" />
                <span>Delivery Fleet</span>
              </div>

              <div className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-neutral-300 cursor-not-allowed">
                <Settings className="w-4 h-4" />
                <span>System Settings</span>
              </div>
            </nav>
          </div>

          {/* User Profile & Logout */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-neutral-800 truncate">{profile?.full_name}</p>
              <p className="text-[10px] text-orange-600 font-semibold">Administrator</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Main Workspace Canvas */}
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
      <div className="bg-white p-8 rounded-3xl shadow-xs border border-orange-100 max-w-md w-full text-center">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Utensils className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-neutral-800">Staff POS Terminal</h2>
        <p className="text-xs text-neutral-500 mt-1">Logged in as {profile?.full_name}</p>
        <button
          onClick={logout}
          className="mt-6 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 cursor-pointer"
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
          {/* Public Customer Self-Ordering Route (Accessed via Table QR) */}
          <Route path="/order/table/:tableNumber" element={<CustomerOrderPage />} />

          {/* Core System Auth & Protected Router */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<DashboardRouter />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}