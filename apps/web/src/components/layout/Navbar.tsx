import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Bot, 
  ShoppingCart, 
  Store, 
  Sparkles, 
  Menu, 
  X,
  User as UserIcon,
  LogOut,
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
  const { itemCount, addItem } = useCart();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [systemHealthy, setSystemHealthy] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState<boolean>(false);
  const [showLiveDropdown, setShowLiveDropdown] = useState<boolean>(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition({
    onSpeechComplete: (finalSpeech) => {
      setSearchQuery(finalSpeech);
      setShowLiveDropdown(false);
      navigate(`/?search=${encodeURIComponent(finalSpeech)}`);
    },
  });

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

  // Live Recommendation Engine algorithm query
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setLiveResults([]);
      setShowLiveDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLive(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery.trim())}&limit=5`);
        const json = await res.json();
        if (json.success && json.data?.items) {
          setLiveResults(json.data.items);
          setShowLiveDropdown(true);
        }
      } catch (err) {
        console.error('Live search error:', err);
      } finally {
        setIsSearchingLive(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleQuickAdd = async (productId: string) => {
    setAddedProductId(productId);
    await addItem(productId, 1);
    setTimeout(() => setAddedProductId(null), 2000);
  };

  const handleAskAIAboutProduct = (productName: string) => {
    setShowLiveDropdown(false);
    navigate(`/?search=${encodeURIComponent(productName)}`);
  };

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const searchPlaceholders = [
    "Try 'Aur kya kharid skta hu?'",
    "Try 'Coding laptop under ₹70,000 with 16GB RAM'",
    "Try '4K Monitor for programming & multitasking'",
    "Try 'Mechanical RGB keyboard with brown switches'",
    "Try 'ANC Headphones under ₹15,000'",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % searchPlaceholders.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const isCurrent = (path: string) => location.pathname === path;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowLiveDropdown(false);
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

          {/* Top AI-Powered Recommendation Search Engine with Voice Input */}
          {!isMerchant && (
            <div className="hidden md:flex flex-1 max-w-md relative">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <input
                  type="text"
                  placeholder={isListening ? '🎙️ Listening to speech...' : searchPlaceholders[placeholderIndex]}
                  value={searchQuery}
                  onFocus={() => { if (liveResults.length > 0) setShowLiveDropdown(true); }}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-10 py-2 rounded-xl bg-slate-900/95 border text-xs text-white placeholder-slate-400 outline-none transition-all ${
                    isListening ? 'border-emerald-400 ring-2 ring-emerald-500/30' : 'border-white/20 focus:border-brand-400 focus:ring-1 focus:ring-brand-400'
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
              </form>

              {/* Live Recommendation Engine Dropdown Popover */}
              {showLiveDropdown && (
                <div 
                  className="absolute left-0 right-0 top-11 z-50 rounded-2xl bg-slate-900/95 border border-brand-500/40 shadow-glow-cyan p-3 space-y-2 max-h-96 overflow-y-auto backdrop-blur-2xl animate-fade-in"
                  onMouseLeave={() => setShowLiveDropdown(false)}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5 px-1">
                    <span className="text-[10px] font-bold text-brand-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-brand-400 animate-pulse" />
                      <span>Live AI Recommendations ({liveResults.length})</span>
                    </span>
                    {isSearchingLive && <span className="text-[10px] text-slate-400 animate-pulse">Scoring products...</span>}
                  </div>

                  {liveResults.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No exact hardware match. Press Enter to ask PayPilot AI!
                    </div>
                  ) : (
                    liveResults.map((item) => (
                      <div key={item.id} className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-white/5 transition-all flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-9 h-9 rounded-lg object-cover border border-white/10" />
                          ) : (
                            <Package className="w-7 h-7 text-slate-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-[9px] font-mono text-brand-300 uppercase block">{item.category}</span>
                            <h5 className="text-xs font-bold text-white truncate">{item.name}</h5>
                            <span className="text-xs text-emerald-400 font-mono font-semibold">₹{item.priceInr.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleAskAIAboutProduct(item.name)}
                            title="Ask Chatbot about this product"
                            className="px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium flex items-center gap-1 transition-all"
                          >
                            <Bot className="w-3 h-3 text-indigo-400" />
                            <span>Ask AI</span>
                          </button>

                          <button
                            onClick={() => handleQuickAdd(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-[11px] font-bold shadow-glow-cyan flex items-center gap-1 transition-all"
                          >
                            {addedProductId === item.id ? '✓ Added' : '+ Cart'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {!isMerchant ? (
              <>
                <Link
                  to="/"
                  onClick={() => {
                    setSearchQuery('');
                    navigate('/?chat=true');
                    window.dispatchEvent(new CustomEvent('open_paypilot_chat'));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
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

          {/* Right side User Profile Avatar Badge */}
          <div className="hidden md:flex items-center gap-2.5">
            {isAuthenticated && user ? (
              <div className="relative">
                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-white/15 hover:border-brand-500/50 text-xs transition-all shadow-md group"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-7 h-7 rounded-lg object-cover border border-brand-400/40 shadow-glow-cyan"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-glow-cyan">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="text-left">
                    <span className="block font-bold text-white group-hover:text-brand-300 transition-colors leading-tight">
                      {user.name}
                    </span>
                    <span className="block text-[9px] text-emerald-400 font-mono uppercase leading-tight font-bold">
                      {user.role} • Profile Hub
                    </span>
                  </div>
                </Link>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-white/15 shadow-2xl p-1.5 space-y-1 z-50 animate-fade-in text-xs">
                    <div className="px-3 py-1.5 border-b border-white/10">
                      <span className="block text-[10px] text-slate-400">Signed in as</span>
                      <span className="block text-xs font-semibold text-white truncate">{user.email}</span>
                    </div>

                    {!isMerchant ? (
                      <>
                        <Link
                          to="/orders"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Package className="w-3.5 h-3.5 text-emerald-400" />
                          <span>My Orders & Wallet</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/merchant"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Store className="w-3.5 h-3.5 text-purple-400" />
                          <span>Merchant Studio</span>
                        </Link>
                        <Link
                          to="/merchant/products"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Product Catalog</span>
                        </Link>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
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
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white text-xs font-bold shadow-glow-cyan transition-all flex items-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In / Demo</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-white/10"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-slate-950/95 p-4 space-y-3 animate-fade-in text-xs">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              placeholder="Search products with AI recommendation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          <div className="space-y-1">
            {!isMerchant ? (
              <>
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 font-medium"
                >
                  ✨ AI Storefront
                </Link>
                <Link
                  to="/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 font-medium"
                >
                  🛒 Shopping Cart ({itemCount})
                </Link>
                {isAuthenticated && (
                  <Link
                    to="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-emerald-400 hover:bg-slate-800 font-medium"
                  >
                    📦 My Orders & Financials
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/merchant"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-purple-300 hover:bg-slate-800 font-medium"
                >
                  🏬 Merchant Studio & Analytics
                </Link>
                <Link
                  to="/merchant/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-cyan-300 hover:bg-slate-800 font-medium"
                >
                  📦 Catalog Management
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
