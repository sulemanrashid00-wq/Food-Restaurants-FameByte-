import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/Login/LoginPage';
import MenuPage from './pages/Menu/MenuPage';
import { 
  Loader2, Utensils, LayoutDashboard, BookOpen, Star, 
  Truck, BarChart2, Settings, LogOut 
} from 'lucide-react';

function DashboardRouter() {
  const { user, profile, loading, logout } = useAuth();

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
      // Warm modern background
      <div className="min-h-screen bg-[#FDF7F2] flex p-3 md:p-6 gap-6">
        
        {/* Left White Sidebar */}
        <aside className="w-64 bg-white rounded-3xl p-6 shadow-xs border border-orange-100/60 hidden md:flex flex-col justify-between shrink-0">
          <div>
            {/* Brand Logo */}
            <div className="flex items-center gap-3 mb-10 px-2">
              <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-orange-500/30">
                D
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-neutral-800 tracking-tight">Delicious</h1>
                <p className="text-[10px] text-neutral-400">FAMEBYTE POS</p>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav className="space-y-1 text-xs font-semibold">
              <div className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-neutral-400 hover:text-neutral-700 cursor-not-allowed">
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview</span>
              </div>

              {/* Active Menu Tab */}
              <div className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl bg-orange-50 text-orange-600 font-bold">
                <BookOpen className="w-4 h-4" />
                <span>Menu</span>
              </div>

              <div className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-neutral-400 hover:text-neutral-700 cursor-not-allowed">
                <Star className="w-4 h-4" />
                <span>Rating & reviews</span>
              </div>

              <div className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-neutral-400 hover:text-neutral-700 cursor-not-allowed">
                <Truck className="w-4 h-4" />
                <span>Delivery</span>
              </div>

              <div className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-neutral-400 hover:text-neutral-700 cursor-not-allowed">
                <BarChart2 className="w-4 h-4" />
                <span>Analytics</span>
              </div>

              <div className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-neutral-400 hover:text-neutral-700 cursor-not-allowed">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </div>
            </nav>
          </div>

          {/* User Profile & Logout */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-neutral-800 truncate">{profile?.full_name}</p>
              <p className="text-[10px] text-orange-600 font-medium">Administrator</p>
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

        {/* Main Canvas */}
        <main className="flex-1 min-w-0 bg-transparent">
          <MenuPage />
        </main>
      </div>
    );
  }

  // Staff View
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<DashboardRouter />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}