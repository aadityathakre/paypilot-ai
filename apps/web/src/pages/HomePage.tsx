import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  SlidersHorizontal,
  ShoppingCart,
  Check,
  Zap,
  Tag,
  AlertCircle,
  User as UserIcon,
  Package,
  Star,
  Maximize2,
  Minimize2,
  Minus,
  Loader2,
  Mic,
  MicOff
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recommendations?: RankedRecommendation[];
  upsell?: UpsellData | null;
  timestamp: string;
}

export const HomePage: React.FC = () => {
  const { user, token, openAuthModal } = useAuth();
  const { addItem, itemCount } = useCart();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());
  const [cartSuccessMessage, setCartSuccessMessage] = useState<string | null>(null);
  
  // UI Window Controls State
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

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

  // Voice Recognition Hook
  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();

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

  const [searchParams] = useSearchParams();

  // Handle URL manual search params from top navbar or voice input
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) {
      handleSendMessage(`Search catalog for: ${q}`);
    }
  }, [searchParams]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

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
      </section>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Live AI Commerce Chat Panel */}
        <div 
          className={`glass-panel rounded-2xl flex flex-col shadow-glass border transition-all duration-300 ${
            isMaximized 
              ? 'fixed inset-4 sm:inset-6 z-50 p-6 bg-slate-950/95 backdrop-blur-2xl border-brand-500/40 shadow-2xl overflow-hidden' 
              : isMinimized 
              ? 'hidden' 
              : 'lg:col-span-2 p-5 h-[680px] border-white/10'
          }`}
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 shadow-glow-cyan">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  PayPilot AI Commerce Agent
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h2>
                <p className="text-[11px] text-slate-400 font-mono">
                  Conversational Understanding • Gemini LLM • PostgreSQL Verified
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="font-mono text-[11px]">
                  User: {user ? user.name : 'Guest'}
                </span>
              </div>

              {/* Minimize & Maximize (Full-Screen) Buttons */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Minimize Chatbot Panel"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMaximized(!isMaximized);
                    if (isMinimized) setIsMinimized(false);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title={isMaximized ? "Restore Normal View" : "Maximize Full Screen View"}
                >
                  {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`flex gap-3 max-w-[92%] ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-300 shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-tr-sm shadow-glow-cyan'
                        : 'glass-card text-slate-200 border border-white/10 rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <span className="block text-[10px] text-slate-400 mt-1.5 text-right font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>

                {/* Render Recommendation Cards if present */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="w-full pl-10 pt-3 space-y-3">
                    <p className="text-xs font-semibold text-brand-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                      Verified Catalog Matches ({msg.recommendations.length} items scored)
                    </p>
                    <div className={`grid gap-3 ${isMaximized ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
                      {msg.recommendations.map((rec) => {
                        const isAdded = addedProductIds.has(rec.product.id);
                        const isLoadingThis = loadingProductId === rec.product.id;
                        return (
                          <div
                            key={rec.product.id}
                            className="glass-card rounded-xl p-3.5 border border-white/10 flex flex-col justify-between hover:border-brand-500/40 transition-all group"
                          >
                            <div className="space-y-2.5">
                              {/* Product Image Thumbnail */}
                              <div className="w-full h-32 rounded-lg bg-slate-900/80 border border-white/5 overflow-hidden relative">
                                {rec.product.imageUrl ? (
                                  <img
                                    src={rec.product.imageUrl}
                                    alt={rec.product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                                    <Package className="w-8 h-8" />
                                  </div>
                                )}
                                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5 fill-emerald-400" />
                                  <span>{Math.round(rec.score * 100)}% Match</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                                  {rec.product.category}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  SKU: {rec.product.sku}
                                </span>
                              </div>

                              <h4 className="text-xs font-bold text-white leading-snug">
                                {rec.product.name}
                              </h4>
                              <p className="text-sm font-extrabold text-brand-400 font-mono">
                                ₹{rec.product.priceInr.toLocaleString('en-IN')}
                              </p>

                              {/* Key Attributes Tags */}
                              {rec.product.attributes && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {Object.entries(rec.product.attributes).slice(0, 3).map(([_k, v], idx) => (
                                    <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                                      {Array.isArray(v) ? v[0] : String(v)}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Reasons list */}
                              <ul className="space-y-1 text-[11px] text-slate-300 pt-1">
                                {rec.reasons.slice(0, 2).map((r, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                                    <span className="line-clamp-1">{r}</span>
                                  </li>
                                ))}
                              </ul>

                              {rec.tradeOffs.length > 0 && (
                                <p className="text-[10px] text-amber-300 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  <span className="line-clamp-1">{rec.tradeOffs[0]}</span>
                                </p>
                              )}
                            </div>

                            {/* Button with Loading Spinner & Double-Click Guardrail */}
                            <button
                              disabled={isLoadingThis}
                              onClick={() => handleAddToCart(rec.product.id, rec.product.name)}
                              className={`mt-3 w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                isAdded
                                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-brand-500 hover:bg-brand-400 text-white shadow-glow-cyan disabled:opacity-60'
                              }`}
                            >
                              {isLoadingThis ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                  <span>Adding...</span>
                                </>
                              ) : isAdded ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>In Cart</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  <span>Add to Cart</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Render Smart Upsell Banner if present */}
                {msg.upsell && (
                  <div className="w-full pl-10 pt-2">
                    <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                            Smart Upsell Proposal ({msg.upsell.discountBps / 100}% Bundle Off)
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-white">
                          {msg.upsell.product.name}
                        </h4>
                        <p className="text-[11px] text-slate-300">
                          {msg.upsell.reason} •{' '}
                          <span className="line-through text-slate-500">₹{msg.upsell.originalPriceInr.toLocaleString('en-IN')}</span>{' '}
                          <strong className="text-emerald-400 font-mono">₹{msg.upsell.discountedPriceInr.toLocaleString('en-IN')}</strong>
                        </p>
                      </div>

                      <button
                        disabled={loadingProductId === msg.upsell!.product.id}
                        onClick={() => handleAddToCart(msg.upsell!.product.id, msg.upsell!.product.name)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition-all shadow-glow-indigo flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {loadingProductId === msg.upsell!.product.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-white" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <span>+ Add Bundle</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-3 pl-2 text-xs text-brand-400 animate-pulse">
                <Bot className="w-5 h-5" />
                <span className="font-mono">PayPilot agent processing your request...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sample Prompts Chips */}
          <div className="pt-2 pb-2 border-t border-white/5 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  disabled={isProcessing}
                  onClick={() => handleSendMessage(p.text)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 hover:bg-brand-500/20 hover:text-brand-300 hover:border-brand-500/40 border border-white/10 text-slate-300 transition-all shrink-0 text-left disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Form with Voice Speech Recognition & Dynamic Rotating Placeholder */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="pt-2 flex items-center gap-2 shrink-0"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isProcessing}
                placeholder={isListening ? '🎙️ Listening to speech...' : chatPlaceholders[placeholderIndex]}
                className={`w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-900/90 border text-sm text-white placeholder-slate-400 outline-none transition-all ${
                  isListening ? 'border-emerald-400 ring-2 ring-emerald-500/30' : 'border-white/15 focus:border-brand-400 focus:ring-1 focus:ring-brand-400'
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
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white font-semibold text-sm flex items-center gap-2 shadow-glow-cyan transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Minimized Floating Bar Pill at Bottom Right */}
        {isMinimized && (
          <div 
            onClick={() => setIsMinimized(false)}
            className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-full bg-slate-900/95 border border-brand-500/40 shadow-glow-cyan text-white text-xs font-semibold flex items-center gap-3 cursor-pointer backdrop-blur-xl hover:scale-105 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-400 flex items-center justify-center text-brand-300">
              <Bot className="w-4 h-4" />
            </div>
            <span>🤖 PayPilot AI Agent (Minimized) • Click to Expand</span>
            <Maximize2 className="w-4 h-4 text-brand-400" />
          </div>
        )}

        {/* Right 1 Col: Architecture & Policy Highlights */}
        <div className={`space-y-4 ${isMaximized ? 'hidden' : ''}`}>
          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-semibold text-white text-sm">Agentic Trust Framework</h3>
              </div>
              <button
                onClick={openAuthModal}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                <UserIcon className="w-3 h-3" />
                <span>Profiles</span>
              </button>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Intent Grounding:</strong> LLM extracts structured filters; real database returns verified products.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Deterministic Ranking:</strong> 5-signal scoring (Intent, Budget, Stock, Popularity, Growth).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Policy Gated:</strong> Hard ceiling of ₹80,000 blocks uncontrolled purchases.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Razorpay Checkout:</strong> Test-mode HMAC SHA256 verified signatures.</span>
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
              <div className="p-2.5 rounded-lg bg-slate-900/70 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Max Transaction Limit</span>
                <span className="font-mono font-bold text-emerald-400">₹80,000</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/70 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Max Bundle Discount</span>
                <span className="font-mono font-bold text-indigo-300">10% (1000 bps)</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-white">Active Shopping Cart</h4>
              <p className="text-[11px] text-slate-400">
                {itemCount > 0 ? `${itemCount} item(s) ready for checkout` : 'Your cart is empty'}
              </p>
            </div>
            <Link
              to="/cart"
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-xs font-semibold text-white shadow-glow-cyan transition-all flex items-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Open Cart ({itemCount})</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
