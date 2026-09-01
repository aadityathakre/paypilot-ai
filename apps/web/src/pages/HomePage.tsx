import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Hello! I am PayPilot, your AI commerce assistant. Tell me what you need (e.g., "I need a coding laptop under ₹70,000 with long battery life and a wireless mouse"), and I will curate verified catalog options and prepare a safe checkout journey for you.',
    },
  ]);

  const samplePrompts = [
    { label: '💻 Coding Setup', text: 'I need a coding laptop under ₹70,000 and a wireless mouse' },
    { label: '🎮 Gaming Setup', text: 'Looking for a high-refresh gaming setup under ₹85,000' },
    { label: '🎧 WFH Audio & Video', text: 'Best noise-cancelling headphones and 1080p webcam under ₹15,000' },
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInputMessage('');

    // Phase 1 demo response placeholder (Phase 5 will attach real LLM agent)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `I understood your intent: "${text}". In Phase 1, repository & environment are active. In Phase 2 & 5, our verified catalog tools will extract structured constraints, query PostgreSQL, and rank candidates for checkout!`,
        },
      ]);
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Section */}
      <section className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Intent-to-Action Agentic Commerce</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Turn Customer Intent Into a <span className="gradient-text">Bounded Checkout</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400">
          Discover verified products via natural language, receive explainable recommendations with smart upsells, and execute secure Razorpay test-mode payments with human approval.
        </p>
      </section>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Interactive AI Commerce Chat */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 flex flex-col h-[580px] shadow-glass border border-white/10">
          {/* Chat Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  PayPilot Agent
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </h2>
                <p className="text-xs text-slate-400">Tool-grounded • Policy-enforced</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <span>Session: active</span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-300 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-tr-sm shadow-glow-cyan'
                      : 'glass-card text-slate-200 border border-white/10 rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Sample Prompts Chips */}
          <div className="pt-3 pb-2 border-t border-white/5">
            <p className="text-[11px] font-medium text-slate-400 mb-2">Try sample intent requests:</p>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p.text)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/70 hover:bg-brand-500/20 hover:text-brand-300 hover:border-brand-500/40 border border-white/10 text-slate-300 transition-all text-left"
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
              handleSend();
            }}
            className="pt-2 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Describe your purchase needs, budget, or constraints..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white font-medium text-sm flex items-center gap-2 shadow-glow-cyan transition-all"
            >
              <span>Ask</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right 1 Col: Architecture & Guardrails Highlights */}
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
            <div className="flex items-center gap-2.5 text-brand-400">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-semibold text-white text-sm">4-Step Bounded Flow</h3>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>1. Discover:</strong> Natural language intent structured into category & budget constraints.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>2. Decide:</strong> Catalog tool retrieves verified products; ranking engine scores options.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>3. Gate:</strong> Server policy validates spending limits & requires explicit approval.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>4. Pay:</strong> Razorpay test order creation, Checkout SDK, and HMAC verification.</span>
              </li>
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400">
                <TrendingUp className="w-4 h-4" />
                <h3 className="font-semibold text-white text-sm">Merchant Growth Controls</h3>
              </div>
              <Link to="/merchant" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
                Open <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              Merchants can set spend thresholds, configure growth upsell rules, and review conversion analytics in real time.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-900/70 border border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-400">Spending Cap Limit</span>
              <span className="font-mono font-semibold text-emerald-400">₹80,000 max</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Razorpay Test Mode</h4>
                <p className="text-[11px] text-slate-400">Simulated test cards active</p>
              </div>
            </div>
            <Link
              to="/cart"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-white/10"
            >
              View Cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
