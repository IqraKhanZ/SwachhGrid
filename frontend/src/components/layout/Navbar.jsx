import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Leaf, Menu, X, LogOut, User, BarChart2, Map, Plus, Users, Shield, Building } from 'lucide-react';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const role = currentUser?.role || 'citizen';

  let navLinks = [];
  if (role === 'admin') {
    navLinks = [
      { to: '/admin',       label: 'Admin Console', icon: Shield },
      { to: '/',            label: 'Eco Map',       icon: Map },
      { to: '/authorities', label: 'Scorecards',    icon: Building },
      { to: '/analytics',   label: 'Analytics',     icon: BarChart2 },
    ];
  } else if (role === 'authority') {
    navLinks = [
      { to: '/authority-portal', label: 'Ward Portal', icon: Building },
      { to: '/',                 label: 'Eco Map',     icon: Map },
      { to: '/authorities',      label: 'Scorecards',  icon: Shield },
      { to: '/actions',          label: 'Actions',     icon: Users },
      { to: '/analytics',        label: 'Analytics',   icon: BarChart2 },
    ];
  } else {
    navLinks = [
      { to: '/',            label: 'Eco Map',     icon: Map },
      { to: '/report',      label: 'Report',      icon: Plus },
      { to: '/actions',     label: 'Actions',     icon: Users },
      { to: '/authorities', label: 'Authorities', icon: Shield },
      { to: '/analytics',   label: 'Analytics',   icon: BarChart2 },
    ];
  }

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : currentUser?.email?.[0]?.toUpperCase() || 'U';

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border h-16 flex items-center px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-6 shrink-0">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-sm">
            <Leaf className="w-5 h-5 text-bg" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-bold text-primary text-base tracking-tight">Swachh<span className="text-accent">Grid</span></span>
          </div>
        </Link>

        {/* Role Pill Badge */}
        {role !== 'citizen' && (
          <div className="hidden sm:flex items-center mr-4">
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
              role === 'admin'
                ? 'bg-warning/10 border-warning/30 text-warning'
                : 'bg-secondary/10 border-secondary/30 text-secondary'
            }`}>
              {role === 'admin' ? '🛡️ Admin' : `🏛️ ${currentUser?.ward_name || 'Ward'} Officer`}
            </span>
          </div>
        )}

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-accent/10 text-accent font-semibold' : 'text-muted hover:text-primary hover:bg-surface'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2 ml-auto">
          <Link
            to="/dashboard"
            className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold text-sm hover:bg-accent/30 transition-colors"
            title="My Profile"
          >
            {initials}
          </Link>
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-muted hover:text-primary hover:bg-surface"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-surface border-r border-border h-full flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-bg" />
                </div>
                <div>
                  <span className="font-bold text-primary text-base">Swachh<span className="text-accent">Grid</span></span>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded text-muted hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 space-y-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    location.pathname === to ? 'bg-accent/10 text-accent' : 'text-muted hover:text-primary hover:bg-bg'
                  }`}
                >
                  <Icon className="w-5 h-5" /> {label}
                </Link>
              ))}
              <Link
                to="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted hover:text-primary hover:bg-bg"
              >
                <User className="w-5 h-5" /> My Profile
              </Link>
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
