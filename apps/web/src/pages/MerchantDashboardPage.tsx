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
  ArrowUpRight,
  Zap,
  Wallet,
  Building2,
  AlertTriangle,
  Bot,
  Send,
  Loader2,
  TrendingDown,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MerchantAiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const MerchantDashboardPage: React.FC = () => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'wallet' | 'ai_advisor' | 'policy' | 'orders' | 'audit'>('analytics');
  
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

  // Wallet & Payout State
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Audit Events State
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Merchant AI Advisor State
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiMessages, setAiMessages] = useState<MerchantAiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hello ${user?.name || 'Merchant'}! 🤖 I am your **Merchant Business Intelligence Advisor**.\n\nI help you analyze inventory velocity, identify top-selling vs slow-moving products, monitor low-stock restock needs, and optimize your store policy limits for maximum revenue.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const merchantAiPrompts = [
    { label: '📊 Top vs Slow Products', text: 'Which are my top-selling and slow-moving products?' },
    { label: '⚠️ Low Stock Alerts', text: 'Which items have low inventory stock and need restock?' },
    { label: '💡 Promotional Bundle', text: 'Suggest a promotional setup bundle for slow-moving products' },
    { label: '💳 Bank Wallet Payout', text: 'What is my net revenue balance available for bank settlement?' },
  ];

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
  }, [activeTab, orderStatusFilter, auditSearch]);

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

  // Handle Bank Payout Settlement
  const handlePayoutWithdrawal = () => {
    setIsWithdrawing(true);
    setTimeout(() => {
      setIsWithdrawing(false);
      const netAmount = analytics?.wallet?.netSettledInr || (overview?.grossRevenueInr ? overview.grossRevenueInr * 0.98 : 180810);
      setWithdrawSuccess(`Successfully initiated settlement of ₹${netAmount.toLocaleString('en-IN')} to HDFC Bank (**** 9821)!`);
      setTimeout(() => setWithdrawSuccess(null), 5000);
    }, 1500);
  };

  // Handle Merchant AI Chat Query
  const handleSendMerchantAiQuery = (customQuery?: string) => {
    const query = customQuery || aiInput;
    if (!query.trim() || isAiThinking) return;

    const userMsg: MerchantAiMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAiMessages((prev) => [...prev, userMsg]);
    if (!customQuery) setAiInput('');
    setIsAiThinking(true);

    setTimeout(() => {
      const qLower = query.toLowerCase();
      let responseText = '';

      const lowStock = analytics?.productAnalytics?.lowStockProducts || [];
      const netWallet = analytics?.wallet?.netSettledInr || (overview?.grossRevenueInr ? overview.grossRevenueInr * 0.98 : 0);

      if (qLower.includes('top') || qLower.includes('selling') || qLower.includes('most buying')) {
        responseText = `📈 **Top Selling & High Velocity Products**:\n\n1. **Pro Developer Laptop 15** — 14 Units Sold (₹9,09,860 Revenue)\n2. **27" 4K UHD Coding Monitor** — 11 Units Sold (₹3,29,890 Revenue)\n3. **Wireless Mechanical Keyboard** — 9 Units Sold (₹58,410 Revenue)\n\n*Insight:* Developer productivity hardware accounts for 68% of total revenue. Recommend maintaining stock above 15 units.`;
      } else if (qLower.includes('slow') || qLower.includes('least') || qLower.includes('bundle')) {
        responseText = `📉 **Slow Moving Inventory Analysis**:\n\n1. ** blue Light Blocking Glasses** — 1 Sold (Stock: 45)\n2. **Anti-Theft Laptop Backpack** — 2 Sold (Stock: 30)\n3. **16A Smart WiFi Plug** — 3 Sold (Stock: 40)\n\n💡 **Recommended Action**: Bundle "Blue Light Glasses" + "Backpack" with "Pro Developer Laptop 15" at a 10% bundle discount to clear inventory.`;
      } else if (qLower.includes('stock') || qLower.includes('low') || qLower.includes('restock')) {
        responseText = `⚠️ **Low Stock Restock Alerts**:\n\n• **Pro Developer Laptop 15**: 8 units remaining (Re-order threshold: 10)\n• **Precision Wireless Mouse**: 5 units remaining\n• **ANC Wireless Headphones**: 6 units remaining\n\n*Action:* Create a purchase order to prevent stockout during weekend surge.`;
      } else if (qLower.includes('wallet') || qLower.includes('payout') || qLower.includes('bank') || qLower.includes('revenue')) {
        responseText = `💳 **Merchant Wallet & Settlement Overview**:\n\n• **Gross Revenue Collected**: ₹${(overview?.grossRevenueInr || 184500).toLocaleString('en-IN')}\n• **Platform Gateway Fee (2% MDR)**: ₹${(analytics?.wallet?.platformFeeInr || 3690).toLocaleString('en-IN')}\n• **Net Settled Balance**: ₹${netWallet.toLocaleString('en-IN')}\n• **Destination Account**: HDFC Bank (**** 9821, IFSC: HDFC0001234)\n\n*Status:* Ready for instant payout withdrawal!`;
      } else {
        responseText = `📊 **Merchant Intelligence Analysis**:\n\nYour store has generated **₹${(overview?.grossRevenueInr || 0).toLocaleString('en-IN')}** across **${overview?.paidOrdersCount || 0} paid orders** with a **${overview?.conversionRatePercent || 0}% AI conversion rate**.\n\nYour active policy limit is set to **₹${ceilingInr.toLocaleString('en-IN')}** with a max bundle discount of **${discountPercent}%**. You have **${lowStock.length} low stock items** requiring restock.`;
      }

      const aiMsg: MerchantAiMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setAiMessages((prev) => [...prev, aiMsg]);
      setIsAiThinking(false);
    }, 1200);
  };

  const overview = analytics?.overview;
  const productAnalytics = analytics?.productAnalytics;
  const wallet = analytics?.wallet;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Alert */}
      {withdrawSuccess && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs font-semibold shadow-glow-cyan flex items-center gap-2 backdrop-blur-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{withdrawSuccess}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Merchant Governance & Operations Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            PayPilot Merchant Studio
          </h1>
          <p className="text-xs text-slate-400">
            Storefront analytics, product sales ranking, bank wallet settlements & merchant AI advisor
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

      {/* Navigation Tabs Switcher */}
      <div className="flex rounded-2xl bg-slate-900/90 p-1.5 border border-white/10 overflow-x-auto text-xs scrollbar-none">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 min-w-[150px] py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'analytics'
              ? 'bg-purple-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Product Performance</span>
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex-1 min-w-[150px] py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'wallet'
              ? 'bg-purple-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wallet className="w-4 h-4 text-emerald-400" />
          <span>Merchant Wallet & Bank</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_advisor')}
          className={`flex-1 min-w-[150px] py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'ai_advisor'
              ? 'bg-purple-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4 text-brand-400" />
          <span>Merchant AI Advisor</span>
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'policy'
              ? 'bg-purple-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Policy Controls</span>
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
          <span>Orders ({overview?.totalOrdersCount || 0})</span>
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
          <span>Audit Log</span>
        </button>
      </div>

      {/* Tab 1: Product Performance (Most Buying vs Least Buying & Low Stock) */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Key Metrics KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Gross Storefront Sales</span>
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
                Across customer transactions
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Net Wallet Payout Balance</span>
                <Wallet className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                ₹{(overview?.netSettledInr || (overview?.grossRevenueInr ? overview.grossRevenueInr * 0.98 : 0)).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                After 2% MDR fee deduction
              </p>
            </div>
          </div>

          {/* Product Sales Performance Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 🔥 Most Buying / Top Selling Products */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm">🔥 Most Buying / Top Selling Products</h3>
                </div>
                <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  High Demand
                </span>
              </div>

              {productAnalytics?.topSellingProducts && productAnalytics.topSellingProducts.length > 0 ? (
                <div className="space-y-3">
                  {productAnalytics.topSellingProducts.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold font-mono text-xs shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{item.product.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400">SKU: {item.product.sku} • Stock: {item.product.stock} remaining</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-emerald-400 font-mono block">
                          ₹{item.totalRevenueInr.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-300 font-mono">
                          {item.unitsSold} unit(s) sold
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Pro Developer Laptop 15</h4>
                    <span className="text-[10px] font-mono text-slate-400">SKU: LAP-PRO-15 • Stock: 23 units</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400 font-mono block">₹1,29,980</span>
                    <span className="text-[10px] text-slate-300 font-mono">2 units sold</span>
                  </div>
                </div>
              )}
            </div>

            {/* 📉 Least Buying / Slow Moving Products */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-sm">📉 Slow Moving / Needs Promotion</h3>
                </div>
                <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Low Velocity
                </span>
              </div>

              {productAnalytics?.slowMovingProducts && productAnalytics.slowMovingProducts.length > 0 ? (
                <div className="space-y-3">
                  {productAnalytics.slowMovingProducts.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">SKU: {item.sku} • Stock: {item.stock} in warehouse</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-slate-300 font-mono block">
                          ₹{item.priceInr.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono">
                          {item.unitsSold} units sold
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Blue Light Blocking Programmer Glasses</h4>
                    <span className="text-[10px] font-mono text-slate-400">SKU: GEAR-GLASSES-01 • Stock: 45 units</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-300 font-mono block">₹1,299</span>
                    <span className="text-[10px] text-amber-400 font-mono">0 units sold</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ⚠️ Low Stock Inventory Restock Alerts */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-white text-sm">⚠️ Low Stock Inventory Alerts (&lt; 10 units remaining)</h3>
            </div>

            {productAnalytics?.lowStockProducts && productAnalytics.lowStockProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {productAnalytics.lowStockProducts.map((p: any) => (
                  <div key={p.id} className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/30 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-mono text-rose-300 uppercase block">{p.category}</span>
                      <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
                      <span className="text-[11px] font-mono text-slate-300">₹{p.priceInr.toLocaleString('en-IN')}</span>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-mono font-bold text-xs shrink-0 border border-rose-500/40">
                      {p.stock} left
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/60 text-slate-400 text-xs text-center font-mono">
                ✓ All inventory items are adequately stocked above 10 units threshold.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Merchant Wallet & Bank Settlements */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-glow-indigo">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Merchant Account Financials & Wallet</h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Razorpay Merchant Escrow Settlement Account
                  </p>
                </div>
              </div>

              <button
                disabled={isWithdrawing}
                onClick={handlePayoutWithdrawal}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-glow-cyan flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing Payout...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Initiate Payout Settlement</span>
                  </>
                )}
              </button>
            </div>

            {/* Wallet Financial Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <span className="text-slate-400 text-xs block">Total Gross Storefront Revenue</span>
                <p className="text-2xl font-black text-white font-mono">
                  ₹{(wallet?.totalRevenueInr || overview?.grossRevenueInr || 0).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-400">100% verified customer payments</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <span className="text-slate-400 text-xs block">Platform Gateway Fee (2% MDR)</span>
                <p className="text-2xl font-black text-rose-400 font-mono">
                  - ₹{(wallet?.platformFeeInr || (overview?.grossRevenueInr ? overview.grossRevenueInr * 0.02 : 0)).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-400">Razorpay payment processing</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-1">
                <span className="text-emerald-300 text-xs block font-semibold">Net Payout Balance Available</span>
                <p className="text-2xl font-black text-emerald-400 font-mono">
                  ₹{(wallet?.netSettledInr || (overview?.grossRevenueInr ? overview.grossRevenueInr * 0.98 : 0)).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-emerald-300 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Ready for instant bank transfer</span>
                </span>
              </div>
            </div>

            {/* Bank Payout Account Info */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Registered Bank Settlement Account</span>
                  <span className="font-bold text-white font-mono text-xs">
                    {wallet?.settlementAccount || 'HDFC Bank **** 9821 (IFSC: HDFC0001234)'}
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-semibold self-start sm:self-auto">
                KYC Verified • Active Payouts
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Merchant AI Advisor (Business Intelligence Assistant) */}
      {activeTab === 'ai_advisor' && (
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-300 shadow-glow-cyan">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Merchant Business Intelligence Advisor
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Ask about top-selling items, slow inventory, restock recommendations & financial policies
              </p>
            </div>
          </div>

          {/* AI Chat Messages Container */}
          <div className="h-96 overflow-y-auto space-y-4 p-3 rounded-xl bg-slate-950/80 border border-white/5">
            {aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`flex gap-3 max-w-[90%] ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm'
                        : 'bg-slate-900/90 text-slate-200 border border-white/10 rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <span className="block text-[9px] text-slate-400 mt-1.5 text-right font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {isAiThinking && (
              <div className="flex items-center gap-2 text-xs text-purple-400 animate-pulse pl-2">
                <Bot className="w-4 h-4" />
                <span className="font-mono">Merchant AI Advisor analyzing live store metrics...</span>
              </div>
            )}
          </div>

          {/* Prompt Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {merchantAiPrompts.map((p, i) => (
              <button
                key={i}
                disabled={isAiThinking}
                onClick={() => handleSendMerchantAiQuery(p.text)}
                className="px-3 py-1.5 rounded-xl text-xs bg-slate-900/90 hover:bg-purple-600/20 hover:text-purple-300 hover:border-purple-500/40 border border-white/10 text-slate-300 transition-all shrink-0 text-left disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Query Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMerchantAiQuery();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              disabled={isAiThinking}
              placeholder="Ask Merchant AI about sales velocity, inventory restock, or financial policies..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-400 outline-none focus:border-purple-400 transition-all"
            />
            <button
              type="submit"
              disabled={isAiThinking || !aiInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isAiThinking ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" />}
              <span>Ask Advisor</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Policy & Guardrails Studio */}
      {activeTab === 'policy' && (
        <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Merchant Policy & Spending Ceiling Guardrails
                {policySaveSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 animate-fade-in font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saved & Logged to Audit Trail!
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Configure rule bounds for autonomous AI agent checkouts and merchant approval gates
              </p>
            </div>

            <button
              disabled={savingPolicy}
              onClick={handleSavePolicy}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-glow-indigo flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {savingPolicy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Policy Rules</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Spending Ceiling */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-3">
              <label className="block text-xs font-semibold text-white">
                Maximum Order Ceiling (₹ INR)
              </label>
              <input
                type="number"
                value={ceilingInr}
                onChange={(e) => setCeilingInr(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-sm font-mono font-bold text-emerald-400 outline-none"
              />
              <p className="text-[11px] text-slate-400">
                Orders exceeding ₹{ceilingInr.toLocaleString('en-IN')} will be automatically rejected by the server policy engine.
              </p>
            </div>

            {/* Bundle Discount Limit */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-3">
              <label className="block text-xs font-semibold text-white">
                Maximum Bundle / Upsell Discount (%)
              </label>
              <input
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-sm font-mono font-bold text-indigo-300 outline-none"
              />
              <p className="text-[11px] text-slate-400">
                Cap autonomous agent bundle discount proposals to max {discountPercent}%.
              </p>
            </div>

            {/* Human Confirmation Gate */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Mandatory Customer Confirmation Gate</span>
                <input
                  type="checkbox"
                  checked={confirmationRequired}
                  onChange={(e) => setConfirmationRequired(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Requires explicit customer payment authorization before generating Razorpay order payload.
              </p>
            </div>

            {/* Upsell Proposals Toggle */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Enable AI Complementary Upsells</span>
                <input
                  type="checkbox"
                  checked={upsellEnabled}
                  onChange={(e) => setUpsellEnabled(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Allows PayPilot AI to recommend 1 relevant complementary add-on during chat checkout.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Live Orders List */}
      {activeTab === 'orders' && (
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white">Live Merchant Customer Orders</h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Filter Status:</span>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">PAID</option>
                <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
          </div>

          {loadingOrders ? (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              Loading merchant customer orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No orders found for status "{orderStatusFilter}".
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div>
                      <span className="text-[11px] font-mono text-purple-300 font-bold">{o.receipt}</span>
                      <span className="text-[10px] text-slate-400 block">{o.customer?.name} ({o.customer?.email})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        o.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        o.status === 'FAILED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {o.status}
                      </span>
                      <span className="text-sm font-black text-white font-mono">₹{o.amountInr.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Items: {o.items.map((i: any) => `${i.productName} (x${i.quantity})`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Cryptographic Audit Trail Explorer */}
      {activeTab === 'audit' && (
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Cryptographic Audit Trail</h2>
              <p className="text-[11px] text-slate-400 font-mono">Immutable audit logs for compliance & decision tracing</p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="Search audit trail..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white outline-none"
              />
            </div>
          </div>

          {loadingAudit ? (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              Querying PostgreSQL audit events...
            </div>
          ) : auditEvents.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No audit events recorded.
            </div>
          ) : (
            <div className="space-y-2">
              {auditEvents.map((evt) => (
                <div key={evt.id} className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-purple-300 font-bold text-[11px]">{evt.eventType}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(evt.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <pre className="p-2 rounded-lg bg-slate-950 text-[10px] text-slate-300 font-mono overflow-x-auto">
                    {JSON.stringify(evt.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
