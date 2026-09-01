import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  ChevronDown,
  Search,
  Mic,
  MicOff,
  Package,
  Layers
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [systemHealthy, setSystemHealthy] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();

  useEffect(() => {
    fetch('/health')
      .then((res) => res.json())
      .then((data) => {
        setSystemHealthy(data.success && data.data?.status === 'healthy');
      })
      .catch(() => setSystemHealthy(false));
  }, []);

  useEffect(() => {
    if (transcript) {
      setSearchQuery(transcript);
    }
  }, [transcript]);

  const isCurrent = (path: string) => location.pathname === path;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const isMerchant = user?.role === 'MERCHANT' || user?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
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
                {systemHealthy === true ? 'API Connected' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Top Manual Search Bar with Voice Microphone Button */}
          {!isMerchant && (
            <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder={isListening ? 'Listening to speech...' : 'Manual search products...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-10 py-2 rounded-xl bg-slate-900/90 border text-xs text-white placeholder-slate-400 outline-none transition-all ${
                    isListening ? 'border-emerald-400 ring-2 ring-emerald-500/30' : 'border-white/15 focus:border-brand-400'
                  }`}
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

                {isSupported && (
                  <button
                    type="button"
                    onClick={toggleMic}
                    title={isListening ? 'Stop recording' : 'Voice Search with Speech API'}
                    className={`absolute right-2 top-1.5 p-1 rounded-lg transition-colors ${
                      isListening ? 'bg-emerald-500/30 text-emerald-300 animate-pulse' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {!isMerchant ? (
              <>
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isCurrent('/')
                      ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  <span>AI Storefront</span>
                </Link>

                <Link
                  to="/cart"
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 relative ${
                    isCurrent('/cart')
                      ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Cart</span>
                  {itemCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-brand-500 text-slate-950">
                      {itemCount}
                    </span>
                  )}
                </Link>

                {isAuthenticated && (
                  <Link
                    to="/orders"
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      isCurrent('/orders')
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                    <span>My Orders</span>
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/merchant"
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isCurrent('/merchant')
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 text-purple-400" />
                  <span>Merchant Studio</span>
                </Link>

                <Link
                  to="/merchant/products"
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isCurrent('/merchant/products')
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Catalog CRUD</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right side User Profile & Actions */}
          <div className="hidden md:flex items-center gap-2.5">
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
                    <span className="block text-[9px] text-cyan-400 font-mono uppercase leading-tight">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-white/15 shadow-2xl p-1.5 space-y-1 z-50 animate-fade-in text-xs">
                    <div className="px-3 py-1.5 border-b border-white/10">
                      <span className="block text-[10px] text-slate-400">Signed in as</span>
                      <span className="block text-xs font-semibold text-white truncate">{user.email}</span>
                    </div>

                    {!isMerchant ? (
                      <Link
                        to="/orders"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                      >
                        <Package className="w-3.5 h-3.5 text-emerald-400" />
                        <span>My Order History</span>
                      </Link>
                    ) : (
                      <Link
                        to="/merchant/products"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                      >
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Manage Products</span>
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 border-t border-white/5"
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
                className="px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold shadow-glow-cyan transition-all flex items-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In / Demo</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px]">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium">Test Mode</span>
            </div>
          </div>

          {/* Mobile menu button */}
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
    </header>
  );
};
