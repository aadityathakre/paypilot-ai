import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Shield, 
  ShoppingCart, 
  FileText, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  Save, 
  Search,
  ArrowUpRight,
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MerchantDashboardPage: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'policy' | 'orders' | 'audit'>('analytics');
  
  // Analytics State
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Policy State
  const [ceilingInr, setCeilingInr] = useState(80000);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [upsellEnabled, setUpsellEnabled] = useState(true);
  const [confirmationRequired, setConfirmationRequired] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policySaveSuccess, setPolicySaveSuccess] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Audit Events State
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [auditFilter, setAuditFilter] = useState<string>('');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Fetch Analytics
  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch('/api/merchant/analytics', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAnalytics(data.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch Policy
  const fetchPolicy = async () => {
    try {
      const res = await fetch('/api/merchant/policy', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.data?.policy) {
        const p = data.data.policy;
        setCeilingInr(p.maxOrderValueInr);
        setDiscountPercent(p.maxUpsellDiscountPercent);
        setUpsellEnabled(p.upsellEnabled);
        setConfirmationRequired(p.paymentConfirmationRequired);
      }
    } catch (err) {
      console.error('Failed to load policy:', err);
    }
  };

  // Fetch Orders
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const url = orderStatusFilter !== 'ALL'
        ? `/api/merchant/orders?status=${orderStatusFilter}`
        : '/api/merchant/orders';
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.data?.orders) {
        setOrders(data.data.orders);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch Audit Trail
  const fetchAuditEvents = async () => {
    try {
      setLoadingAudit(true);
      const params = new URLSearchParams();
      if (auditFilter) params.append('eventType', auditFilter);
      if (auditSearch) params.append('search', auditSearch);
      params.append('limit', '40');

      const res = await fetch(`/api/audit/events?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data?.events) {
        setAuditEvents(data.data.events);
      }
    } catch (err) {
      console.error('Failed to load audit events:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchPolicy();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'audit') fetchAuditEvents();
  }, [activeTab, orderStatusFilter, auditFilter]);

  // Handle Policy Save
  const handleSavePolicy = async () => {
    try {
      setSavingPolicy(true);
      const res = await fetch('/api/merchant/policy', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          maxOrderValueInr: ceilingInr,
          maxUpsellDiscountPercent: discountPercent,
          upsellEnabled,
          paymentConfirmationRequired: confirmationRequired,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPolicySaveSuccess(true);
        setTimeout(() => setPolicySaveSuccess(false), 3000);
        fetchPolicy();
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Failed to save policy:', err);
    } finally {
      setSavingPolicy(false);
    }
  };

  const overview = analytics?.overview;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Merchant Governance & Control Plane</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            PayPilot Tech Emporium Dashboard
          </h1>
          <p className="text-xs text-slate-400">
            Real-time PostgreSQL analytics, spending guardrails & cryptographic audit trail
          </p>
        </div>

        <button
          onClick={() => {
            fetchAnalytics();
            if (activeTab === 'orders') fetchOrders();
            if (activeTab === 'audit') fetchAuditEvents();
          }}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs font-medium flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalytics ? 'animate-spin' : ''}`} />
          <span>Refresh Live Data</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex rounded-2xl bg-slate-900/90 p-1.5 border border-white/10 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 min-w-[130px] py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'analytics'
              ? 'bg-purple-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`flex-1 min-w-[130px] py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'policy'
              ? 'bg-purple-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Policy & Guardrails Studio</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 min-w-[130px] py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'orders'
              ? 'bg-purple-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Live Orders ({overview?.totalOrdersCount || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 min-w-[130px] py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'audit'
              ? 'bg-purple-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Trail Explorer</span>
        </button>
      </div>

      {/* Tab 1: Analytics Overview */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Key Metrics KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Gross Verified Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                ₹{(overview?.grossRevenueInr || 0).toLocaleString('en-IN')}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 pt-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{overview?.paidOrdersCount || 0} Paid Transactions</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>AI Conversion Rate</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                {overview?.conversionRatePercent || 0}%
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                {overview?.paidOrdersCount || 0} completed / {overview?.totalOrdersCount || 0} initiated
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Average Order Value (AOV)</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                ₹{(overview?.averageOrderValueInr || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Across verified customer orders
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Upsell Attach Rate</span>
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                {overview?.upsellAttachRatePercent || 0}%
              </p>
              <p className="text-[11px] text-purple-300 pt-1">
                {overview?.upsellsProposedCount || 0} bundle proposals evaluated
              </p>
            </div>
          </div>

          {/* Middle Row: Policy Safety & Top Recommended SKUs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                Policy Enforcement Status
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-300">Active Spending Ceiling</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ₹{(ceilingInr || 80000).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-300">Policy Overages Blocked</span>
                  <span className="font-mono font-bold text-rose-400">
                    {overview?.policyBlockedCount || 0} Blocked
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-300">Policy Approved Checkouts</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {overview?.policyApprovedCount || 0} Approved
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-300">Human Approval Gate</span>
                  <span className="font-semibold text-emerald-400">Mandatory (100% Enforced)</span>
                </div>
              </div>
            </div>

            {/* Top Recommended Products */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                AI Agent Top Recommended SKUs
              </h3>

              <div className="space-y-2.5">
                {analytics?.topRecommendedSkus && analytics.topRecommendedSkus.length > 0 ? (
                  analytics.topRecommendedSkus.map((item: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900/70 border border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-brand-500/20 text-brand-300 font-bold flex items-center justify-center text-[10px]">
                          #{i + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-white font-mono">{item.sku}</span>
                          <span className="block text-[11px] text-slate-400">Verified PostgreSQL Catalog Item</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
                        {item.count} Recommendations
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Initiate shopping queries in the AI assistant to track recommended SKUs.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Policy & Guardrails Studio */}
      {activeTab === 'policy' && (
        <div className="max-w-3xl mx-auto glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-400" />
              Merchant Spending Ceiling & Policy Studio
            </h2>
            <p className="text-xs text-slate-400">
              Configure deterministic transaction ceilings and discount limits. Changes immediately apply to live checkouts.
            </p>
          </div>

          {policySaveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Merchant policy successfully updated and active in PostgreSQL!</span>
            </div>
          )}

          <div className="space-y-5">
            {/* Spending Ceiling Slider */}
            <div className="p-4 rounded-xl glass-card space-y-3 border border-white/10">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-bold text-white block">Maximum Order Ceiling (Hard Cap)</label>
                  <p className="text-[11px] text-slate-400">
                    Any cart exceeding this value is rejected by the server policy engine.
                  </p>
                </div>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  ₹{ceilingInr.toLocaleString('en-IN')}
                </span>
              </div>

              <input
                type="range"
                min="10000"
                max="150000"
                step="5000"
                value={ceilingInr}
                onChange={(e) => setCeilingInr(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>₹10,000</span>
                <span>₹80,000 (Default)</span>
                <span>₹1,50,000</span>
              </div>
            </div>

            {/* Bundle Discount % Slider */}
            <div className="p-4 rounded-xl glass-card space-y-3 border border-white/10">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-bold text-white block">Maximum Upsell Discount Bound</label>
                  <p className="text-[11px] text-slate-400">
                    Cap the maximum discount percentage the AI can propose on complementary bundles.
                  </p>
                </div>
                <span className="text-lg font-bold text-indigo-400 font-mono">
                  {discountPercent}% ({discountPercent * 100} bps)
                </span>
              </div>

              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>5% (500 bps)</span>
                <span>10% (Default)</span>
                <span>25% (2500 bps)</span>
              </div>
            </div>

            {/* Guardrail Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="p-4 rounded-xl glass-card border border-white/10 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={upsellEnabled}
                  onChange={(e) => setUpsellEnabled(e.target.checked)}
                  className="mt-1 w-4 h-4 text-purple-600 bg-slate-900 border-white/20 rounded"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block">Autonomous Upsell Engine</span>
                  <p className="text-[11px] text-slate-400">
                    Allow AI agent to propose complementary items within discount bounds.
                  </p>
                </div>
              </label>

              <label className="p-4 rounded-xl glass-card border border-white/10 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmationRequired}
                  onChange={(e) => setConfirmationRequired(e.target.checked)}
                  className="mt-1 w-4 h-4 text-purple-600 bg-slate-900 border-white/20 rounded"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block">Mandatory Confirmation Gate</span>
                  <p className="text-[11px] text-slate-400">
                    Require explicit human authorization checkbox before Razorpay order creation.
                  </p>
                </div>
              </label>
            </div>

            <button
              onClick={handleSavePolicy}
              disabled={savingPolicy}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-glow-indigo transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingPolicy ? 'Saving to Database...' : 'Save & Enforce Live Policy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Live Orders Management */}
      {activeTab === 'orders' && (
        <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-brand-400" />
              Merchant Orders Log ({orders.length})
            </h3>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 text-xs">
              {['ALL', 'PAID', 'PENDING_PAYMENT', 'FAILED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setOrderStatusFilter(status)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    orderStatusFilter === status
                      ? 'bg-brand-500 text-white shadow-glow-cyan'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {loadingOrders ? (
            <p className="text-xs text-slate-400 py-8 text-center">Loading live orders...</p>
          ) : orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 pl-2">Order Receipt</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Items</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 pl-2 text-brand-400 font-semibold">{o.receipt}</td>
                      <td className="py-3 font-sans">
                        <span className="block text-white font-medium">{o.customer?.name || 'Customer'}</span>
                        <span className="block text-[10px] text-slate-400">{o.customer?.email}</span>
                      </td>
                      <td className="py-3 font-sans text-[11px] text-slate-300">
                        {o.items?.map((i: any) => `${i.quantity}x ${i.productName}`).join(', ')}
                      </td>
                      <td className="py-3 text-emerald-400 font-bold">
                        ₹{o.amountInr.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            o.status === 'PAID'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : o.status === 'FAILED'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 text-[11px] text-slate-400">
                        {new Date(o.createdAt).toLocaleDateString()} {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No orders found for this status. Complete a test checkout to see live records.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Audit Trail Explorer */}
      {activeTab === 'audit' && (
        <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Immutable Audit Trail Explorer ({auditEvents.length} Events)
              </h3>
              <p className="text-[11px] text-slate-400">
                Complete chronological trace of AI intent, tool calls, policy gates, and payment reconciliations.
              </p>
            </div>

            {/* Search and Filter Selectors */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search audit trail..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchAuditEvents(); }}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-500 outline-none w-44 focus:w-56 transition-all"
                />
              </div>

              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white outline-none"
              >
                <option value="">All Event Types</option>
                <option value="INTENT_STRUCTURED">INTENT_STRUCTURED</option>
                <option value="TOOL_CATALOG_SEARCH">TOOL_CATALOG_SEARCH</option>
                <option value="RECOMMENDATIONS_GENERATED">RECOMMENDATIONS_GENERATED</option>
                <option value="UPSELL_PROPOSED">UPSELL_PROPOSED</option>
                <option value="POLICY_APPROVED">POLICY_APPROVED</option>
                <option value="POLICY_BLOCKED">POLICY_BLOCKED</option>
                <option value="PAYMENT_VERIFIED">PAYMENT_VERIFIED</option>
                <option value="WEBHOOK_PAYMENT_CAPTURED">WEBHOOK_PAYMENT_CAPTURED</option>
                <option value="WEBHOOK_PAYMENT_FAILED">WEBHOOK_PAYMENT_FAILED</option>
                <option value="POLICY_CONFIG_UPDATED">POLICY_CONFIG_UPDATED</option>
              </select>
            </div>
          </div>

          {loadingAudit ? (
            <p className="text-xs text-slate-400 py-8 text-center">Loading audit log from PostgreSQL...</p>
          ) : auditEvents.length > 0 ? (
            <div className="space-y-2.5">
              {auditEvents.map((evt) => {
                const isExpanded = expandedEventId === evt.id;
                return (
                  <div
                    key={evt.id}
                    className="glass-card rounded-xl p-3.5 border border-white/10 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            evt.eventType.includes('BLOCKED') || evt.eventType.includes('FAILED')
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : evt.eventType.includes('VERIFIED') || evt.eventType.includes('CAPTURED') || evt.eventType.includes('APPROVED')
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {evt.eventType}
                        </span>

                        <span className="text-slate-300 font-mono text-[11px]">
                          Actor: <strong className="text-white">{evt.actorType}</strong>
                        </span>

                        {evt.requestId && (
                          <span className="hidden sm:inline text-[10px] text-slate-500 font-mono">
                            Req: {evt.requestId}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(evt.createdAt).toLocaleTimeString()}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-white/10">
                        <span className="text-[10px] text-slate-400 block mb-1 font-mono uppercase">Event Payload Data</span>
                        <pre className="p-3 rounded-lg bg-slate-950 border border-white/10 text-[11px] text-cyan-300 font-mono overflow-x-auto max-h-48">
                          {JSON.stringify(evt.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No audit events found. Run transactions or AI queries to populate audit log.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
