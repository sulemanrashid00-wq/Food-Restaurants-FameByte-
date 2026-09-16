import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Utensils, Lock, Mail, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      // Login hone ke baad direct redirect (Role-based redirect App.jsx handle karega)
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 md:p-8">
      {/* Main Card Container */}
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[580px] border border-neutral-200/60">
        
        {/* Left Side: Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 mb-6 font-semibold tracking-wide">
              <Utensils className="w-5 h-5" />
              <span>FAMEBYTE RESTRO POS</span>
            </div>

            <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              Welcome Back!
            </h1>
            <p className="text-neutral-500 text-sm mt-2 mb-8">
              Sign in with your assigned staff or administrator credentials.
            </p>

            {errorMsg && (
              <div className="mb-6 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-neutral-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center border-t border-neutral-100 pt-4">
            <p className="text-xs text-neutral-400">
              Internal POS System &bull; Unauthorized access prohibited
            </p>
          </div>
        </div>

        {/* Right Side: Hero Culinary Image */}
        <div className="hidden md:block md:w-1/2 relative bg-neutral-900">
          <img
            src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1000"
            alt="Restaurant Culinary Presentation"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mb-1">
              Live Operations
            </span>
            <h3 className="text-xl font-bold">Kitchen & Floor Coordination</h3>
            <p className="text-xs text-neutral-300 mt-1">
              Synchronized real-time order lifecycle and billing terminal.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}