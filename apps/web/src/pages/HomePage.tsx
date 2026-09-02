import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  ShoppingCart,
  Check,
  Zap,
  User as UserIcon,
  Package,
  Star,
  Maximize2,
  Minimize2,
  X,
  Loader2,
  Mic,
  MicOff,
  Layers
} from 'lucide-react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface RankedRecommendation {
  product: {
    id: string;
    sku: string;
    name: string;
    description: string;
    category: string;
    priceInr: number;
    stock: number;
    imageUrl: string | null;
    attributes: Record<string, any>;
  };
  score: number;
  reasons: string[];
  tradeOffs: string[];
}

interface UpsellData {
  product: {
    id: string;
    sku: string;
    name: string;
    description: string;
    category: string;
    priceInr: number;
    imageUrl?: string | null;
  };
  reason: string;
  discountBps: number;
  originalPriceInr: number;
  discountedPriceInr: number;
}

interface BundleData {
  title: string;
  products: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    priceInr: number;
    imageUrl?: string | null;
  }>;
  totalPriceInr: number;
  discountedPriceInr: number;
  savingsInr: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recommendations?: RankedRecommendation[];
  upsell?: UpsellData | null;
  bundle?: BundleData | null;
  timestamp: string;
}

export const HomePage: React.FC = () => {
  const { user, token, openAuthModal } = useAuth();

  // If user is a merchant, redirect to Merchant Studio Dashboard
  if (user && (user.role === 'MERCHANT' || user.role === 'ADMIN')) {
    return <Navigate to="/merchant" replace />;
  }

  const { addItem, itemCount } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());
  const [cartSuccessMessage, setCartSuccessMessage] = useState<string | null>(null);
  
  // UI Window Controls & Chatbot Drawer State
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(searchParams.get('chat') === 'true');

  // Voice Recognition Hook for Chatbot Drawer
  const { isListening, transcript, startListening, stopListening, isSupported, speakGreeting } = useSpeechRecognition({
    silentMode: true,
    onSpeechComplete: (finalSpeech) => {
      setInputMessage(finalSpeech);
      handleSendMessage(finalSpeech);
    },
  });

  // Storefront Catalog State
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);

  const categoriesList = [
    { id: 'all', label: '✨ All Products' },
    { id: 'laptops', label: '💻 Laptops' },
    { id: 'monitors', label: '🖥️ Monitors' },
    { id: 'keyboards_mice', label: '⌨️ Keyboards & Mice' },
    { id: 'audio_video', label: '🎧 Audio & Video' },
    { id: 'gadgets', label: '⌚ Electronics & Gadgets' },
    { id: 'apparel', label: '👕 Clothes & Gear' },
    { id: 'electricals', label: '⚡ Electricals' },
    { id: 'accessories', label: '🔌 Accessories' },
  ];

  // Fetch Storefront Catalog Products
  useEffect(() => {
    async function fetchCatalog() {
      setIsLoadingCatalog(true);
      try {
        let url = '/api/products?limit=24';
        if (searchQuery) {
          url = `/api/products?search=${encodeURIComponent(searchQuery)}&limit=24`;
        } else if (selectedCategory !== 'all') {
          url = `/api/products?category=${selectedCategory}&limit=24`;
        }

        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.data?.items) {
          setCatalogProducts(json.data.items);
        }
      } catch (err) {
        console.error('Error fetching storefront catalog:', err);
      } finally {
        setIsLoadingCatalog(false);
      }
    }
    fetchCatalog();
  }, [selectedCategory, searchQuery]);

  // Dynamic Rotating Placeholders
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const chatPlaceholders = [
    "Ask 'Aur kya kharid skta hu?' or describe your gear requirements...",
    "Try 'Coding laptop under ₹70,000 with 16GB RAM'",
    "Try 'Kuchh recommend kr for gaming and programming'",
    "Try '4K Monitor for programming and multitasking'",
    "Try 'Mechanical RGB keyboard with brown switches'",
    "Try 'Noise cancelling studio headphones under ₹15,000'",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % chatPlaceholders.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (transcript) {
      setInputMessage(transcript);
    }
  }, [transcript]);

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! 👋 I am **PayPilot AI**, your trusted agentic commerce assistant.\n\nAsk me anything! You can say hello, ask *"aur kya kharid skta hu?"* or *"kuchh recommend kr"*, ask general tech questions (e.g. *"What is the difference between mechanical and membrane keyboards?"*), or describe your exact purchase needs, and I will query our verified PostgreSQL catalog and prepare a bounded checkout path.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const samplePrompts = [
    { label: '🛍️ Aur Kya Kharid Skta Hu?', text: 'aur kya kharid skta hu, kuchh recommend kr' },
    { label: '💻 Coding Laptop Setup', text: 'I need a coding laptop under ₹70,000 with long battery life' },
    { label: '🎮 High-FPS Gaming Rig', text: 'Looking for a gaming laptop under ₹85,000' },
    { label: '🖥️ 4K Coding Monitor', text: 'Recommend a 4K monitor for programming under ₹30,000' },
    { label: '🎧 Audio & Video WFH', text: 'Noise cancelling headphones and streaming webcam' },
  ];

  // Initialize customer session on mount or token change
  useEffect(() => {
    async function initSession() {
      if (!token) return;
      try {
        const sessRes = await fetch('/api/agent/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });
        const sessData = await sessRes.json();
        if (sessData.data?.session?.id) {
          setSessionId(sessData.data.session.id);
        }
      } catch (err) {
        console.error('Error initializing agent session:', err);
      }
    }

    initSession();
  }, [token]);

  // Helper to open chatbot with prompt and scroll into view
  const openChatbotWithPrompt = (promptText: string) => {
    setIsChatbotOpen(true);
    handleSendMessage(promptText);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Listen to open_paypilot_chat event or chat=true URL parameter
  useEffect(() => {
    const handleOpenChat = () => setIsChatbotOpen(true);
    window.addEventListener('open_paypilot_chat', handleOpenChat);

    if (searchParams.get('chat') === 'true') {
      setIsChatbotOpen(true);
    }
    return () => window.removeEventListener('open_paypilot_chat', handleOpenChat);
  }, [searchParams]);

  // Scroll to latest message
  useEffect(() => {
    if (isChatbotOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing, isChatbotOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      if (!sessionId || !token) {
        // If guest, initialize quick customer session
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'customer@paypilot.ai', password: 'CustomerPass@123' }),
        });
        const loginJson = await loginRes.json();
        const activeToken = loginJson.data?.token;

        const sessRes = await fetch('/api/agent/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({}),
        });
        const sessData = await sessRes.json();
        const activeSessionId = sessData.data?.session?.id;

        const res = await fetch(`/api/agent/sessions/${activeSessionId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({ message: text }),
        });

        const json = await res.json();
        if (json.success && json.data) {
          const assistantMsg: ChatMessage = {
            id: `msg_asst_${Date.now()}`,
            role: 'assistant',
            text: json.data.explanation || 'Here is what I found:',
            recommendations: json.data.recommendations || [],
            upsell: json.data.suggestedUpsell || null,
            bundle: json.data.suggestedBundle || null,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } else {
        const res = await fetch(`/api/agent/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: text }),
        });

        const json = await res.json();
        if (json.success && json.data) {
          const assistantMsg: ChatMessage = {
            id: `msg_asst_${Date.now()}`,
            role: 'assistant',
            text: json.data.explanation || 'Here is what I found:',
            recommendations: json.data.recommendations || [],
            upsell: json.data.suggestedUpsell || null,
            bundle: json.data.suggestedBundle || null,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          throw new Error(json.error?.message || 'Agent failed to respond');
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          text: `I'm here to help! ${err.message || 'Please try asking again.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToCart = async (productId: string, productName: string) => {
    if (loadingProductId) return; // double click guardrail
    setLoadingProductId(productId);
    try {
      const success = await addItem(productId, 1);
      if (success) {
        setAddedProductIds((prev) => new Set([...prev, productId]));
        setCartSuccessMessage(`Added "${productName}" to cart!`);
        setTimeout(() => setCartSuccessMessage(null), 3500);
      }
    } finally {
      setLoadingProductId(null);
    }
  };

  const handleAddBundleToCart = async (bundle: BundleData) => {
    if (loadingProductId) return;
    setLoadingProductId('bundle_all');
    try {
      let count = 0;
      for (const prod of bundle.products) {
        const ok = await addItem(prod.id, 1);
        if (ok) {
          count++;
          setAddedProductIds((prev) => new Set([...prev, prod.id]));
        }
      }
      if (count > 0) {
        setCartSuccessMessage(`Added complete Setup Bundle (${count} items) to cart!`);
        setTimeout(() => setCartSuccessMessage(null), 3500);
      }
    } finally {
      setLoadingProductId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Alert */}
      {cartSuccessMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs font-semibold shadow-glow-cyan flex items-center gap-2 backdrop-blur-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{cartSuccessMessage}</span>
          <Link to="/cart" className="ml-2 underline text-white hover:text-emerald-300">
            View Cart ({itemCount}) →
          </Link>
        </div>
      )}

      {/* Hero Section */}
      <section className="text-center space-y-3 max-w-3xl mx-auto pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Track 1: AI-Powered Agentic Commerce</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Natural-Language Intent to <span className="gradient-text">Bounded Checkout</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400">
          Discover verified products from PostgreSQL, score options with multi-signal ranking, and authorize payments with policy guardrails.
        </p>

        {/* Talk with AI Agent Action Bar Below Navbar & Hero */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setIsChatbotOpen(true);
              speakGreeting();
              startListening();
            }}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 via-indigo-600 to-purple-600 hover:from-brand-400 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-glow-cyan transition-all flex items-center gap-2.5 hover:scale-105 active:scale-95 border border-white/20 ring-2 ring-brand-400/30 cursor-pointer"
          >
            <Bot className="w-5 h-5 text-white animate-pulse" />
            <span>🎙️ Talk with PayPilot AI Agent (Human-Like Voice)</span>
          </button>
        </div>
      </section>

      {/* Category Pills & Filter Bar */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Verified Products Catalog</h2>
            <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[11px] font-mono font-semibold">
              {catalogProducts.length} Items
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                selectedCategory === cat.id
                  ? 'bg-brand-500 text-white shadow-glow-cyan scale-105'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Active Search Query Filter Banner */}
        {searchQuery && (
          <div className="p-3 rounded-2xl bg-brand-950/60 border border-brand-500/40 text-xs font-semibold text-brand-300 flex items-center justify-between animate-fade-in shadow-glow-cyan">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>Showing search results for <strong className="text-white font-mono">"{searchQuery}"</strong> ({catalogProducts.length} items found)</span>
            </div>
            <button
              onClick={() => {
                setSearchParams({});
                setSelectedCategory('all');
              }}
              className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold border border-white/10 transition-colors"
            >
              Clear Search Filter ✕
            </button>
          </div>
        )}

        {/* Product Storefront Grid */}
        {isLoadingCatalog ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="h-72 rounded-2xl bg-slate-900/60 border border-white/5 animate-pulse p-4 space-y-3">
                <div className="h-36 rounded-xl bg-slate-800/80" />
                <div className="h-4 bg-slate-800/60 rounded w-3/4" />
                <div className="h-3 bg-slate-800/40 rounded w-1/2" />
                <div className="h-8 bg-slate-800/80 rounded-xl pt-2" />
              </div>
            ))}
          </div>
        ) : catalogProducts.length === 0 ? (
          <div className="py-12 text-center glass-card rounded-2xl border border-white/10 space-y-3">
            <Package className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">No products found in this category</h3>
            <p className="text-xs text-slate-400">Try selecting another category tab or ask PayPilot AI to recommend hardware!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {catalogProducts.map((p) => {
              const isAdded = addedProductIds.has(p.id);
              const isLoadingThis = loadingProductId === p.id;

              return (
                <div 
                  key={p.id} 
                  className="glass-card rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-cyan flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-4 space-y-3">
                    {/* Image & Category Tag */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950/80 border border-white/5">
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Package className="w-10 h-10" />
                        </div>
                      )}

                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/90 border border-brand-500/30 text-[10px] font-mono text-brand-300 uppercase">
                        {p.category}
                      </span>

                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/90 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{(p.merchantScore ? p.merchantScore * 5 : 4.8).toFixed(1)}</span>
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                        {p.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {p.description}
                      </p>
                    </div>

                    {/* Attribute Specs Pills */}
                    {p.attributes && Object.keys(p.attributes).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {Object.entries(p.attributes).slice(0, 3).map(([key, val]: [string, any], idx: number) => {
                          const displayVal = Array.isArray(val) ? val.join(', ') : String(val);
                          return (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-white/5 text-[10px] font-mono text-slate-300">
                              {key}: {displayVal}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer & Actions */}
                  <div className="p-4 pt-0 border-t border-white/5 flex items-center justify-between gap-2 mt-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Price</span>
                      <span className="text-base font-extrabold text-white font-mono">
                        ₹{(p.priceInr || Number(p.pricePaise) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openChatbotWithPrompt(`Tell me more about ${p.name}`)}
                        title="Ask PayPilot AI Agent about this product"
                        className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
                      >
                        <Bot className="w-4 h-4 text-indigo-400" />
                      </button>

                      <button
                        disabled={isLoadingThis}
                        onClick={() => handleAddToCart(p.id, p.name)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isAdded
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                            : 'bg-brand-500 hover:bg-brand-400 text-white shadow-glow-cyan disabled:opacity-60'
                        }`}
                      >
                        {isLoadingThis ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : isAdded ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>In Cart</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Agentic Architecture & Trust Framework Cards at Bottom */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand-400">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-semibold text-white text-sm">Agentic Trust Framework</h3>
            </div>
            <button onClick={openAuthModal} className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1">
              <UserIcon className="w-3 h-3" />
              <span>Profiles</span>
            </button>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Intent Grounding:</strong> LLM extracts structured filters; real database returns verified products.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Deterministic Ranking:</strong> 5-signal scoring (Intent, Budget, Stock, Popularity, Growth).</span>
            </li>
          </ul>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400">
              <Zap className="w-4 h-4" />
              <h3 className="font-semibold text-white text-sm">Active Merchant Rules</h3>
            </div>
            <Link to="/merchant" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
              Configure <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-900/70 border border-white/5 flex items-center justify-between">
              <span className="text-slate-400">Max Transaction Ceiling</span>
              <span className="font-mono font-bold text-emerald-400">₹80,000</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/70 border border-white/5 flex items-center justify-between">
              <span className="text-slate-400">Max Bundle Discount</span>
              <span className="font-mono font-bold text-indigo-300">10% (1000 bps)</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-white">Active Shopping Cart</h4>
            <p className="text-[11px] text-slate-400">
              {itemCount > 0 ? `${itemCount} item(s) ready for checkout` : 'Your cart is empty'}
            </p>
          </div>
          <Link
            to="/cart"
            className="w-full py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-xs font-semibold text-white shadow-glow-cyan transition-all flex items-center justify-center gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Open Cart ({itemCount})</span>
          </Link>
        </div>
      </section>

      {/* Floating AI Agent Trigger Icon Button at Bottom Right (Only when closed) */}
      {!isChatbotOpen && (
        <button
          onClick={() => {
            setIsChatbotOpen(true);
          }}
          className="fixed bottom-6 right-6 z-[90] px-5 py-3.5 rounded-full bg-gradient-to-r from-brand-500 via-indigo-600 to-purple-600 text-white shadow-glow-cyan border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-3 backdrop-blur-2xl ring-2 ring-brand-400/30"
          title="Open PayPilot AI Commerce Assistant"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950 shadow-glow-cyan" />
          </div>
          <span className="text-xs font-black tracking-wide text-white">
            ✨ PayPilot AI Agent
          </span>
        </button>
      )}

      {/* Floating AI Chatbot Modal Drawer Overlay */}
      {isChatbotOpen && (
        <div 
          className={`fixed z-[100] rounded-3xl flex flex-col backdrop-blur-3xl border border-brand-500/50 shadow-2xl transition-all duration-300 animate-fade-in ${
            isMaximized
              ? 'inset-3 sm:inset-6 p-5 sm:p-6 bg-slate-950/95 overflow-hidden ring-1 ring-white/10'
              : 'bottom-6 right-4 sm:right-6 w-[92vw] sm:w-[500px] h-[640px] p-5 bg-slate-950/95 ring-2 ring-brand-500/30 shadow-glow-indigo'
          }`}
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 shadow-glow-cyan">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>PayPilot AI Assistant</span>
                  {isMaximized && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-mono border border-brand-500/30">
                      Studio Fullscreen Mode
                    </span>
                  )}
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Natural Language • Grounded PostgreSQL Verified
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5"
                title={isMaximized ? "Restore Normal Window" : "Maximize Fullscreen"}
              >
                {isMaximized ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Restore Window</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Fullscreen</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsChatbotOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 transition-colors"
                title="Close Chatbot Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Fullscreen 2-Column Split vs Normal Drawer Single Column */}
          <div className={isMaximized ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pt-3' : 'flex flex-col flex-1 min-h-0'}>
            
            {/* Left Main Section (Messages Stream & Input) */}
            <div className={isMaximized ? 'lg:col-span-7 flex flex-col h-full min-h-0 border-r border-white/10 pr-4' : 'flex flex-col flex-1 min-h-0'}>
              
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 scrollbar-thin">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`flex gap-2.5 ${isMaximized ? 'max-w-[85%]' : 'max-w-[95%]'} ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-lg bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-300 shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-tr-sm shadow-glow-cyan'
                            : 'glass-card text-slate-200 border border-white/10 rounded-tl-sm'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>
                        <span className="block text-[9px] text-slate-400 mt-1 text-right font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>

                    {/* Inline Recommendation Cards (Only shown if NOT in maximized mode, or in small screen mode) */}
                    {(!isMaximized || window.innerWidth < 1024) && msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="w-full pl-8 pt-2 space-y-2">
                        <p className="text-[11px] font-semibold text-brand-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-brand-400" />
                          Verified Catalog Matches ({msg.recommendations.length} items)
                        </p>
                        <div className="space-y-2">
                          {msg.recommendations.map((rec, idx) => {
                            const isAdded = addedProductIds.has(rec.product.id);
                            const isLoadingThis = loadingProductId === rec.product.id;

                            return (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-slate-900/90 border border-white/10 hover:border-brand-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  {rec.product.imageUrl ? (
                                    <img
                                      src={rec.product.imageUrl}
                                      alt={rec.product.name}
                                      className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                      <Package className="w-5 h-5" />
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-mono text-brand-300 uppercase">
                                        {rec.product.category}
                                      </span>
                                      <span className="text-[10px] font-bold text-emerald-400 font-mono">
                                        ₹{rec.product.priceInr.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-white truncate">
                                      {rec.product.name}
                                    </h4>
                                  </div>
                                </div>

                                <button
                                  disabled={isLoadingThis}
                                  onClick={() => handleAddToCart(rec.product.id, rec.product.name)}
                                  className={`py-1.5 px-3 rounded-lg text-xs font-bold shrink-0 transition-all ${
                                    isAdded
                                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-brand-500 hover:bg-brand-400 text-white shadow-glow-cyan'
                                  }`}
                                >
                                  {isLoadingThis ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                  ) : isAdded ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>In Cart</span>
                                    </>
                                  ) : (
                                    <span>Add (₹{rec.product.priceInr.toLocaleString('en-IN')})</span>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Render Bundle Proposal Card */}
                    {msg.bundle && (
                      <div className="w-full pl-8 pt-2">
                        <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/90 via-slate-900 to-purple-950/90 border border-indigo-500/50 shadow-glow-indigo space-y-2">
                          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className="text-[10px] font-mono text-indigo-300 uppercase font-bold flex items-center gap-1">
                              <Layers className="w-3 h-3 text-indigo-400" />
                              <span>Setup Bundle Proposal</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                              Save ₹{msg.bundle.savingsInr.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 line-through font-mono block">
                                ₹{msg.bundle.totalPriceInr.toLocaleString('en-IN')}
                              </span>
                              <span className="text-sm font-black text-emerald-400 font-mono">
                                ₹{msg.bundle.discountedPriceInr.toLocaleString('en-IN')}
                              </span>
                            </div>

                            <button
                              disabled={loadingProductId === 'bundle_all'}
                              onClick={() => handleAddBundleToCart(msg.bundle!)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-glow-cyan flex items-center gap-1 transition-all"
                            >
                              {loadingProductId === 'bundle_all' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                              ) : (
                                <>
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  <span>Add Bundle (₹{msg.bundle.discountedPriceInr.toLocaleString('en-IN')})</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex items-center gap-2 text-xs text-brand-400 animate-pulse pl-2">
                    <Bot className="w-4 h-4" />
                    <span className="font-mono text-[11px]">PayPilot agent analyzing request...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Sample Prompts Chips */}
              <div className="py-2 border-t border-white/5 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {samplePrompts.map((p, i) => (
                    <button
                      key={i}
                      disabled={isProcessing}
                      onClick={() => handleSendMessage(p.text)}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-900/80 hover:bg-brand-500/20 hover:text-brand-300 border border-white/10 text-slate-300 transition-all shrink-0 text-left disabled:opacity-50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="pt-1 flex items-center gap-2 shrink-0"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isProcessing}
                    placeholder={isListening ? '🎙️ Listening to speech...' : chatPlaceholders[placeholderIndex]}
                    className={`w-full pl-3 pr-8 py-2.5 rounded-xl bg-slate-900/90 border text-xs sm:text-sm text-white placeholder-slate-400 outline-none transition-all ${
                      isListening ? 'border-emerald-400 ring-2 ring-emerald-500/30' : 'border-white/15 focus:border-brand-400'
                    }`}
                  />

                  {isSupported && (
                    <button
                      type="button"
                      onClick={toggleMic}
                      title={isListening ? 'Stop Speech Recording' : 'Voice Search with Speech API'}
                      className={`absolute right-2 top-2 p-1 rounded-lg transition-colors ${
                        isListening ? 'bg-emerald-500/30 text-emerald-300 animate-pulse' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4 text-emerald-400" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || !inputMessage.trim()}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-glow-cyan transition-all disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" />}
                  <span>Send</span>
                </button>
              </form>
            </div>

            {/* Right Column: Fullscreen AI Recommendations Showcase (Only rendered in isMaximized mode) */}
            {isMaximized && (
              <div className="hidden lg:flex lg:col-span-5 flex-col h-full min-h-0 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
                  <span className="text-xs font-bold text-brand-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-400" />
                    <span>AI Recommended Catalog Showcase</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                    Live Ranked Matches
                  </span>
                </div>

                {/* Show recent recommendations if available */}
                {(() => {
                  const lastRecMsg = [...messages].reverse().find((m) => m.recommendations && m.recommendations.length > 0);
                  const recs = lastRecMsg?.recommendations || [];

                  if (recs.length === 0) {
                    return (
                      <div className="py-16 text-center glass-card rounded-2xl border border-white/10 p-6 space-y-3 my-auto">
                        <Bot className="w-10 h-10 text-brand-400 mx-auto animate-pulse" />
                        <h4 className="text-sm font-bold text-white">Ask PayPilot AI for hardware recommendations!</h4>
                        <p className="text-xs text-slate-400">
                          Try asking: <span className="text-brand-300 font-mono">"Suggest mechanical keyboards under ₹5,000"</span> or <span className="text-brand-300 font-mono">"Recommend coding laptops"</span>.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {recs.map((rec, idx) => {
                        const isAdded = addedProductIds.has(rec.product.id);
                        const isLoadingThis = loadingProductId === rec.product.id;

                        return (
                          <div
                            key={idx}
                            className="glass-card rounded-2xl p-4 border border-white/10 hover:border-brand-500/40 transition-all space-y-3 group shadow-lg"
                          >
                            <div className="flex items-start gap-3">
                              {rec.product.imageUrl ? (
                                <img
                                  src={rec.product.imageUrl}
                                  alt={rec.product.name}
                                  className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0 group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 shrink-0">
                                  <Package className="w-8 h-8" />
                                </div>
                              )}

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-mono text-brand-300 uppercase px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/30">
                                    {rec.product.category}
                                  </span>
                                  <span className="text-[10px] font-bold text-amber-300 font-mono flex items-center gap-1">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span>{((rec.product as any).merchantScore ? (rec.product as any).merchantScore * 5 : 4.8).toFixed(1)}</span>
                                  </span>
                                </div>

                                <h4 className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                                  {rec.product.name}
                                </h4>

                                <p className="text-[11px] text-slate-400 line-clamp-2">
                                  {rec.product.description}
                                </p>
                              </div>
                            </div>

                            {/* Reasons */}
                            {rec.reasons && rec.reasons.length > 0 && (
                              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                                {rec.reasons.slice(0, 2).map((r, rIdx) => (
                                  <div key={rIdx} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span className="truncate">{r}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Pricing & Action */}
                            <div className="flex items-center justify-between pt-1 border-t border-white/10">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-mono">PostgreSQL Verified</span>
                                <span className="text-sm font-black text-emerald-400 font-mono">
                                  ₹{rec.product.priceInr.toLocaleString('en-IN')}
                                </span>
                              </div>

                              <button
                                disabled={isLoadingThis}
                                onClick={() => handleAddToCart(rec.product.id, rec.product.name)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                  isAdded
                                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-brand-500 hover:bg-brand-400 text-white shadow-glow-cyan'
                                }`}
                              >
                                {isLoadingThis ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                ) : isAdded ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    <span>Added to Cart</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart className="w-4 h-4" />
                                    <span>Add to Cart</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
