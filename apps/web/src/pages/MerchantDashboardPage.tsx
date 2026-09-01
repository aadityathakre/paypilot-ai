import React, { useState } from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  ShoppingCart, 
  Bot, 
  Sliders, 
  History, 
  DollarSign
} from 'lucide-react';

export const MerchantDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'policy' | 'audit'>('analytics');

  // Demo synthetic metrics
  const metrics = {
    revenuePaise: 48920000,
    aiSessions: 142,
    aiConversionRate: '34.5%',
    upsellAcceptance: '28.1%',
    policyBlocks: 4,
  };

  const auditEvents = [
    { time: '10:21:04', event: 'USER_INTENT_CAPTURED', actor: 'Customer', desc: 'Intent parsed: Coding laptop under ₹70,000' },
    { time: '10:21:05', event: 'TOOL_SEARCH_CATALOG', actor: 'AI Agent', desc: 'Executed searchCatalog({ category: "laptop", maxPrice: 70000 })' },
    { time: '10:21:06', event: 'RECOMMENDATION_GENERATED', actor: 'AI Agent', desc: 'Recommended: Pro Developer Laptop (Score: 0.92)' },
    { time: '10:21:07', event: 'UPSELL_PROPOSED', actor: 'Growth Engine', desc: 'Offered: Ergonomic Mouse (Bundle Discount: 10%)' },
    { time: '10:21:11', event: 'CUSTOMER_CONFIRMED', actor: 'Customer', desc: 'Customer explicitly approved purchase of ₹66,489' },
    { time: '10:21:12', event: 'POLICY_APPROVED', actor: 'Policy Engine', desc: 'Order total within merchant limit (₹80,000)' },
    { time: '10:21:13', event: 'RAZORPAY_ORDER_CREATED', actor: 'Checkout Service', desc: 'Created test order order_demo_9823471029' },
    { time: '10:21:29', event: 'PAYMENT_VERIFIED', actor: 'Payment Service', desc: 'HMAC SHA256 signature verified successfully' },
    { time: '10:21:30', event: 'ORDER_PAID', actor: 'State Machine', desc: 'Order transitioned to state: PAID' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Merchant Growth & Control Center</h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Demo Merchant
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, AI decision replay, and deterministic guardrail policies
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10 self-start">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-brand-500 text-white shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('policy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'policy'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Policy Engine
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {/* Metrics Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>AI-Assisted Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {(metrics.revenuePaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> +24% vs non-assisted sessions
          </span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Intent Conversion</span>
            <Bot className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{metrics.aiConversionRate}</p>
          <span className="text-[10px] text-slate-400">142 Intent Sessions Recorded</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Upsell Acceptance</span>
            <ShoppingCart className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{metrics.upsellAcceptance}</p>
          <span className="text-[10px] text-indigo-300">Complementary bundle rate</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Policy Blocks</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-300 font-mono">{metrics.policyBlocks}</p>
          <span className="text-[10px] text-slate-400">Over-budget actions prevented</span>
        </div>
      </div>

      {/* Tab 1: Analytics & Growth Overview */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              AI Conversion Funnel
            </h3>
            <div className="space-y-3">
              {[
                { stage: '1. Intent Captured', count: '142 sessions', pct: '100%' },
                { stage: '2. Grounded Recommendations Shown', count: '128 sessions', pct: '90.1%' },
                { stage: '3. Added to Cart', count: '74 sessions', pct: '52.1%' },
                { stage: '4. Upsell Accepted', count: '40 sessions', pct: '28.1%' },
                { stage: '5. Razorpay Verified Paid', count: '49 orders', pct: '34.5%' },
              ].map((step, idx) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>{step.stage}</span>
                    <span className="font-mono text-slate-400">{step.count} ({step.pct})</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full"
                      style={{ width: step.pct }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              Agent Explainability Principles
            </h3>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <span className="text-brand-400 font-semibold">1. Zero Catalog Hallucination</span>
                <p className="text-slate-400">All prices, stock, and SKU attributes are fetched from PostgreSQL via verified tools.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <span className="text-indigo-400 font-semibold">2. Server-side Financial Calculations</span>
                <p className="text-slate-400">The browser never dictates prices; totals are recalculated authoritatively on the backend.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <span className="text-emerald-400 font-semibold">3. Cryptographic Signature Verification</span>
                <p className="text-slate-400">Payments are confirmed only after HMAC SHA256 validation of Razorpay order/payment IDs.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Policy Engine Configuration */}
      {activeTab === 'policy' && (
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-400" />
              Merchant Deterministic Policy Guardrails
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure maximum bounds that the AI Commerce Agent cannot bypass
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl glass-card space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Max AI-Assisted Transaction Value (₹)
              </label>
              <input
                type="number"
                defaultValue={80000}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm font-mono outline-none"
              />
              <p className="text-[11px] text-slate-400">Orders exceeding this limit are blocked and flagged in the audit log.</p>
            </div>

            <div className="p-4 rounded-xl glass-card space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Max Upsell Discount (Basis Points)
              </label>
              <input
                type="number"
                defaultValue={1000}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm font-mono outline-none"
              />
              <p className="text-[11px] text-slate-400">1000 bps = 10% maximum bundle discount allowed by the agent.</p>
            </div>

            <div className="p-4 rounded-xl glass-card flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">Human Approval Gate</span>
                <p className="text-[11px] text-slate-400">Always require customer confirmation before Razorpay checkout</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-brand-500 rounded bg-slate-900" />
            </div>

            <div className="p-4 rounded-xl glass-card flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">Growth Upsell Agent</span>
                <p className="text-[11px] text-slate-400">Allow agent to propose 1 bounded complementary product</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-brand-500 rounded bg-slate-900" />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Replay Timeline */}
      {activeTab === 'audit' && (
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              Live Audit & AI Decision Replay Trail
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Immutable timeline recording customer intent, tool calls, policy checks, and Razorpay payment outcomes
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {auditEvents.map((evt, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-slate-500 bg-slate-900/80 px-2 py-1 rounded">
                    {evt.time}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-brand-300 font-mono">
                      {evt.event}
                    </span>
                    <p className="text-xs text-slate-300 mt-0.5">{evt.desc}</p>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 self-start sm:self-center">
                  Actor: {evt.actor}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
