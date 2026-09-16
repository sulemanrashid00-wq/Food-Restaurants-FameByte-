import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/Login/LoginPage';
import { Loader2 } from 'lucide-react';

function DashboardRouter() {
  const { user, profile, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  // Not logged in -> Redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin View
  if (profile?.role === 'Admin') {
    return (
      <div className="min-h-screen bg-neutral-900 text-white p-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center border-b border-neutral-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">Admin Control Panel</h1>
            <p className="text-sm text-neutral-400">Signed in as: {profile?.full_name} ({profile?.role})</p>
          </div>
          <button 
            onClick={logout}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-sm font-medium rounded-lg text-red-400 border border-neutral-700 cursor-pointer"
          >
            Logout
          </button>
        </div>
        <div className="mt-8 p-6 bg-neutral-800/50 rounded-2xl border border-neutral-700">
          <p className="text-emerald-400 font-semibold">✓ Authentication & Role Verification Succeeded</p>
          <p className="text-sm text-neutral-300 mt-2">Week 1 Day 3 requirement complete. Menu and table managers will mount here.</p>
        </div>
      </div>
    );
  }

  // Staff (Waiter/Cashier) View
  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-4xl mx-auto flex justify-between items-center border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Staff POS Terminal</h1>
          <p className="text-sm text-neutral-400">Signed in as: {profile?.full_name} ({profile?.role})</p>
        </div>
        <button 
          onClick={logout}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-sm font-medium rounded-lg text-red-400 border border-neutral-700 cursor-pointer"
        >
          Logout
        </button>
      </div>
      <div className="mt-8 p-6 bg-neutral-800/50 rounded-2xl border border-neutral-700">
        <p className="text-amber-400 font-semibold">✓ Staff Session Active</p>
        <p className="text-sm text-neutral-300 mt-2">Redirected correctly based on profile role.</p>
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