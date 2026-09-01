import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Bot, 
  ShoppingCart, 
  Store, 
  Sparkles, 
  Zap, 
  Menu, 
  X,
  User as UserIcon,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { itemCount } = useCart();
  const { user, isAuthenticated, openAuthModal, logout, quickLoginAs } = useAuth();
  const [systemHealthy, setSystemHealthy] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    // Check backend health
    fetch('/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.status === 'healthy') {
          setSystemHealthy(true);
        } else {
          setSystemHealthy(false);
        }
      })
      .catch(() => setSystemHealthy(false));
  }, []);

  const isCurrent = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-indigo-500 flex items-center justify-center shadow-glow-cyan transition-transform group-hover:scale-105">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  PayPilot <span className="gradient-text font-extrabold">AI</span>
                </span>
                <span className="block text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                  Razorpay Track 1
                </span>
              </div>
            </Link>

            {/* Health status badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
              <span className={`w-2 h-2 rounded-full ${systemHealthy === true ? 'bg-emerald-400 animate-pulse' : systemHealthy === false ? 'bg-amber-400' : 'bg-slate-400'}`} />
              <span className="text-slate-300 font-mono text-[11px]">
                {systemHealthy === true ? 'API Connected' : systemHealthy === false ? 'Offline' : 'Checking...'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isCurrent('/')
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-brand-400" />
              AI Assistant
            </Link>

            <Link
              to="/cart"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 relative ${
                isCurrent('/cart')
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-indigo-400" />
              <span>Cart</span>
              {itemCount > 0 && (
                <span className="px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-brand-500 text-white shadow-glow-cyan animate-pulse">
                  {itemCount}
                </span>
              )}
            </Link>

            <Link
              to="/merchant"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isCurrent('/merchant')
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Store className="w-4 h-4 text-purple-400" />
              Merchant View
            </Link>
          </nav>

          {/* Right side Profile & Badges */}
          <div className="hidden md:flex items-center gap-3">
            {/* User Profile Pill / Auth Button */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/10 hover:border-brand-500/40 text-xs transition-all"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <span className="block font-semibold text-white leading-tight">{user.name}</span>
                    <span className="block text-[10px] text-cyan-400 font-mono uppercase leading-tight">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-white/15 shadow-2xl p-1.5 space-y-1 z-50 animate-fade-in">
                    <div className="px-3 py-1.5 border-b border-white/10">
                      <span className="block text-[11px] text-slate-400">Signed in as</span>
                      <span className="block text-xs font-semibold text-white truncate">{user.email}</span>
                    </div>

                    <button
                      onClick={() => {
                        quickLoginAs(user.role === 'CUSTOMER' ? 'MERCHANT' : 'CUSTOMER');
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                      <span>Switch to {user.role === 'CUSTOMER' ? 'Merchant' : 'Customer'}</span>
                    </button>

                    <button
                      onClick={() => {
                        openAuthModal();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Switch / Sign In</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 border-t border-white/5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold shadow-glow-cyan transition-all flex items-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In / Demo</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium">Test Mode</span>
            </div>
          </div>

          {/* Mobile menu trigger */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 space-y-2 border-t border-white/10 bg-slate-900/95 backdrop-blur-xl">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
          >
            AI Assistant
          </Link>
          <Link
            to="/cart"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
          >
            Cart ({itemCount})
          </Link>
          <Link
            to="/merchant"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
          >
            Merchant View
          </Link>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              openAuthModal();
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-cyan-400 hover:bg-slate-800"
          >
            {isAuthenticated ? `Signed in as ${user?.name}` : 'Sign In / Demo Login'}
          </button>
        </div>
      )}
    </header>
  );
};
