import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Leaf, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, Shield, Building, Zap } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function AuthPage() {
  const { signup, login, loginWithGoogleToken } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin]           = useState(true);
  const [selectedRole, setSelectedRole] = useState('citizen');
  const [form, setForm]                 = useState({ name: '', email: '', password: '', ward_name: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]               = useState('');

  // Load Google Identity Services script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  function initGoogle() {
    if (!window.google || !GOOGLE_CLIENT_ID) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback:  handleGoogleResponse,
      auto_select: false,
    });
    window.google.accounts.id.renderButton(
      document.getElementById('google-btn'),
      { theme: 'outline', size: 'large', width: 340, text: 'continue_with' }
    );
  }

  async function handleGoogleResponse(response) {
    setGoogleLoading(true);
    setError('');
    try {
      const res = await loginWithGoogleToken(response.credential);
      redirectByRole(res.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  const redirectByRole = (user) => {
    if (user?.role === 'admin') navigate('/admin');
    else if (user?.role === 'authority') navigate('/authority-portal');
    else navigate('/');
  };

  const handleQuickLogin = async (email, password) => {
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      redirectByRole(res.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const res = await login(form.email, form.password);
        redirectByRole(res.user);
      } else {
        if (!form.name.trim()) { setError('Display name is required'); setLoading(false); return; }
        const res = await signup(form.email, form.password, form.name, selectedRole, form.ward_name);
        redirectByRole(res.user);
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Authentication failed.';
      setError(
        detail === 'Email already registered' ? 'This email is already registered. Please sign in.' :
        detail === 'Invalid email or password'  ? 'Incorrect email or password.' :
        detail
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-16 h-16 bg-accent/10 border border-accent/30 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-leaf-float">
            <Leaf className="w-9 h-9 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Swachh<span className="text-accent">Grid</span></h1>
          <p className="text-muted text-xs mt-1">AI-Powered Ward Sanitation & Eco Governance Platform</p>
        </div>

        {/* ⚡ Quick Demo Logins Bar */}
        <div className="card bg-surface/80 border-accent/30 p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-accent uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-current" /> 1-Click Demo Portals
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('citizen@gmail.com', 'citizen123')}
              className="py-2 px-1.5 rounded-lg bg-bg border border-border hover:border-accent text-primary text-xs font-medium text-center transition-all hover:bg-accent/5 flex flex-col items-center gap-1"
            >
              <User className="w-3.5 h-3.5 text-accent" />
              <span>Citizen</span>
            </button>
            <button
              onClick={() => handleQuickLogin('kalyanpur.ward@lmc.gov.in', 'authority123')}
              className="py-2 px-1.5 rounded-lg bg-bg border border-border hover:border-accent text-primary text-xs font-medium text-center transition-all hover:bg-accent/5 flex flex-col items-center gap-1"
            >
              <Building className="w-3.5 h-3.5 text-secondary" />
              <span>Ward Officer</span>
            </button>
            <button
              onClick={() => handleQuickLogin('admin@communityhero.green', 'admin123')}
              className="py-2 px-1.5 rounded-lg bg-bg border border-border hover:border-accent text-primary text-xs font-medium text-center transition-all hover:bg-accent/5 flex flex-col items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5 text-warning" />
              <span>Super Admin</span>
            </button>
          </div>
        </div>

        {/* Auth Card */}
        <div className="card space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 bg-bg rounded-xl p-1">
            {['Sign In', 'Sign Up'].map((tab, i) => (
              <button
                key={tab}
                onClick={() => { setIsLogin(i === 0); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  (isLogin ? i === 0 : i === 1) ? 'bg-accent text-bg' : 'text-muted hover:text-primary'
                }`}
              >{tab}</button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger text-sm px-3 py-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="label">Account Role</label>
                  <select
                    className="input"
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value)}
                  >
                    <option value="citizen">Eco Citizen</option>
                    <option value="authority">Ward Officer / Authority</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>
                {selectedRole === 'authority' && (
                  <div>
                    <label className="label">Jurisdiction Ward Name</label>
                    <input
                      className="input"
                      placeholder="e.g. Kalyanpur"
                      value={form.ward_name}
                      onChange={e => setForm(f => ({ ...f, ward_name: e.target.value }))}
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="label">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input className="input pl-10" placeholder="Your name or department title" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input type="email" className="input pl-10" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input type={showPassword ? 'text' : 'password'} className="input pl-10 pr-10"
                  placeholder="••••••••" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Leaf className="w-4 h-4" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs text-muted"><span className="bg-surface px-2">or continue with Google</span></div>
          </div>

          {/* Google Sign-in */}
          <div id="google-btn" className="w-full min-h-[40px] flex justify-center" />
        </div>
      </div>
    </div>
  );
}
