import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabaseClient';

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
import CustomerReviewPage from './pages/Review/CustomerReviewPage';

// Icons
import { 
  Loader2, Utensils, LayoutDashboard, BookOpen, Star, 
  Truck, BarChart2, Settings, LogOut, Armchair, ShoppingBag, 
  Clock, Boxes, Vault, Menu, X, CheckCircle2, ShieldCheck, MapPin, QrCode
} from 'lucide-react';

function LiveReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error('Fetch reviews error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();

    const channel = supabase
      .channel('customer-reviews-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'customer_reviews' },
        (payload) => {
          setReviews((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / totalReviews).toFixed(1)
    : '5.0';

  const reviewUrl = typeof window !== 'undefined' ? `${window.location.origin}/review` : 'https://food-restaurants-fame-byte.vercel.app/review';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(reviewUrl)}`;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Customer Ratings &amp; Reviews</h2>
          <p className="text-xs font-medium text-neutral-500">Live guest feedback and satisfaction scorecards.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs">
          <p className="text-[10px] font-bold text-neutral-400 uppercase">Average Rating</p>
          <h3 className="text-2xl font-black text-amber-500 mt-1 flex items-center gap-1.5">
            {avgRating} <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
          </h3>
          <p className="text-[11px] text-neutral-500 mt-1">Based on {totalReviews} live guest reviews</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs">
          <p className="text-[10px] font-bold text-neutral-400 uppercase">Total Feedback</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">{totalReviews} Reviews</h3>
          <p className="text-[11px] text-neutral-500 mt-1">Directly submitted from guest phones</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-neutral-100 shadow-2xs flex items-center gap-4">
          <img
            src={qrCodeUrl}
            alt="Review QR Code"
            className="w-18 h-18 rounded-xl border border-neutral-100 shadow-2xs object-contain"
          />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black text-orange-600 uppercase bg-orange-50 px-2 py-0.5 rounded-full inline-block">
              Scan To Review
            </span>
            <h4 className="text-xs font-black text-neutral-900 mt-1">Guest Mobile QR</h4>
            <a
              href="/review"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-neutral-500 underline hover:text-orange-600 block mt-1 truncate"
            >
              Open Direct Form ↗
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-2xs space-y-4">
        <h4 className="text-sm font-black text-neutral-900">Recent Guest Feedback</h4>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-center py-8 text-xs text-neutral-400">
            Abhi tak koi live review nahi aaya. Customer QR scan karke submit karega toh foran yahan dikhega.
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-start justify-between transition hover:border-neutral-200"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-neutral-900">{rev.customer_name}</span>
                    {rev.dish_name && (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        {rev.dish_name}
                      </span>
                    )}
                    <span className="text-[9px] text-neutral-400">
                      {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600">{rev.comment}</p>
                </div>

                <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                  {Array.from({ length: Number(rev.rating || 5) }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProtectedDashboard() {
  const { user, profile, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDF7F2] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-orange-500" />
        <p className="text-xs font-bold text-neutral-500">Checking credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
      { id: 'reviews', label: 'Rating & reviews', icon: Star },
      { id: 'delivery', label: 'Delivery Fleet', icon: Truck },
      { id: 'settings', label: 'System Settings', icon: Settings },
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

        {/* Sidebar */}
        <aside className={`
          bg-white rounded-3xl p-6 shadow-xs border border-orange-100/60 
          flex flex-col justify-between shrink-0
          ${mobileMenuOpen ? 'fixed inset-x-3 top-20 z-50 shadow-2xl block' : 'hidden'}
          md:flex md:w-64 md:h-[calc(100vh-3rem)] md:sticky md:top-6
        `}>
          <div>
            <div className="hidden md:flex items-center gap-3 mb-8 px-2">
              <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-orange-500/30">
                D
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-neutral-800 tracking-tight">Delicious</h1>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">FAMEBYTE POS</p>
              </div>
            </div>

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
            </nav>
          </div>

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

          {/* Live Customer Ratings & Reviews */}
          {activeTab === 'reviews' && <LiveReviewsTab />}

          {/* Delivery Fleet Workspace */}
          {activeTab === 'delivery' && (
            <div className="space-y-6 pb-12">
              <div>
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Delivery Fleet &amp; Riders</h2>
                <p className="text-xs font-medium text-neutral-500">Manage dispatch logistics, riders and live route assignment.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase">Active Riders</p>
                  <h3 className="text-2xl font-black text-neutral-900 mt-1">4 Online</h3>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">All units GPS synced</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase">En Route Deliveries</p>
                  <h3 className="text-2xl font-black text-orange-600 mt-1">3 Orders</h3>
                  <p className="text-[11px] text-neutral-500 mt-1">Average ETA: 24 mins</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase">Completed Deliveries</p>
                  <h3 className="text-2xl font-black text-emerald-600 mt-1">28 Today</h3>
                  <p className="text-[11px] text-neutral-500 mt-1">100% on-time fulfillment</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-2xs space-y-4">
                <h4 className="text-sm font-black text-neutral-900">Rider Fleet Status</h4>
                <div className="space-y-3">
                  {[
                    { rider: 'Rider #1 (Tariq)', vehicle: 'Honda 125', status: 'Delivering to DHA Phase 6', order: '#ORD-921' },
                    { rider: 'Rider #2 (Usman)', vehicle: 'Suzuki 110', status: 'Delivering to Clifton Block 4', order: '#ORD-924' },
                    { rider: 'Rider #3 (Kashif)', vehicle: 'Yamaha YBR', status: 'Standby at Restaurant Dispatch', order: 'Available' },
                  ].map((rd, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-neutral-900">{rd.rider}</h5>
                          <p className="text-[11px] text-neutral-500">{rd.vehicle} • {rd.status}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                        rd.order === 'Available' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {rd.order}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* System Settings Workspace */}
          {activeTab === 'settings' && (
            <div className="space-y-6 pb-12">
              <div>
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight">System Configuration &amp; Security</h2>
                <p className="text-xs font-medium text-neutral-500">POS hardware parameters, tax presets, and cloud syncing.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-black text-neutral-900">Tax &amp; Billing Presets</h3>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600 font-medium">Standard Sales Tax (GST)</span>
                      <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-1 rounded-lg">5.0%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600 font-medium">Receipt Currency Symbol</span>
                      <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-1 rounded-lg">PKR (Rs.)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600 font-medium">Default Thermal Format</span>
                      <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-1 rounded-lg">80mm ESC/POS</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-500" />
                    <h3 className="text-sm font-black text-neutral-900">Database &amp; Edge Nodes</h3>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600 font-medium">Database Node</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Supabase Postgres
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600 font-medium">Realtime WebSocket Channel</span>
                      <span className="font-bold text-emerald-600">Active (KDS Sync)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600 font-medium">Vercel Production Edge</span>
                      <span className="font-bold text-neutral-800">Operational</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
          <Route path="/review" element={<CustomerReviewPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedDashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}