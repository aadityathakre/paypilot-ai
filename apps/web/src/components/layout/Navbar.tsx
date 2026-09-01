import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Bot, 
  ShoppingCart, 
  Store, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Menu, 
  X 
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [cartCount] = useState<number>(0);
  const [systemHealthy, setSystemHealthy] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
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
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isCurrent('/cart')
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-indigo-400" />
              Cart
              {cartCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-brand-500 text-white">
                  {cartCount}
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

          {/* Right side Badges & Actions */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="font-medium">Bounded Policy Gate</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs">
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
            Cart ({cartCount})
          </Link>
          <Link
            to="/merchant"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
          >
            Merchant View
          </Link>
        </div>
      )}
    </header>
  );
};
