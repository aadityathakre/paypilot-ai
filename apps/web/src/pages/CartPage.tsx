import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, ArrowRight, Trash2, Plus, Minus, ArrowLeft, AlertTriangle, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface PolicyStatus {
  approved: boolean;
  message?: string;
  policy?: {
    maxOrderValueInr: number;
  };
}

export const CartPage: React.FC = () => {
  const { cart, loading, updateQuantity, removeItem } = useCart();
  const { token } = useAuth();
  const [policyStatus, setPolicyStatus] = useState<PolicyStatus | null>(null);

  // Validate Cart Policy against current active cart
  useEffect(() => {
    async function validatePolicy() {
      if (!token || !cart || cart.items.length === 0) return;
      try {
        const policyRes = await fetch('/api/checkout/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ customerConfirmed: true }),
        });
        const policyJson = await policyRes.json();
        if (policyJson.data?.policy) {
          setPolicyStatus(policyJson.data.policy);
        }
      } catch (err) {
        console.error('Error validating cart policy:', err);
      }
    }

    validatePolicy();
  }, [token, cart]);

  const handleUpdateQuantity = async (itemId: string, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty < 1) {
      await removeItem(itemId);
      return;
    }
    await updateQuantity(itemId, newQty);
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeItem(itemId);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-indigo-400" />
            Your Verified Shopping Cart
          </h1>
          <p className="text-xs text-slate-400 mt-1">Authoritative prices and stock calculated live from PostgreSQL</p>
        </div>

        <Link
          to="/"
          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1.5 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to AI Assistant
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 font-mono text-sm animate-pulse">
          Loading active cart...
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-4 border border-white/10">
          <ShoppingCart className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-white">Your Cart is Currently Empty</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Ask our AI Assistant to find coding laptops, 4K monitors, or accessories matching your budget.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold shadow-glow-cyan transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Discover Products with AI</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="glass-card rounded-xl p-4 flex items-center justify-between gap-4 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {item.product.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      SKU: {item.product.sku}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{item.product.name}</h3>
                  <p className="text-sm font-bold text-brand-400 font-mono">
                    ₹{item.totalPriceInr.toLocaleString('en-IN')}
                    <span className="text-xs font-normal text-slate-400 ml-1.5">
                      (₹{item.unitPriceInr.toLocaleString('en-IN')} × {item.quantity})
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-white/10">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                      className="text-slate-400 hover:text-white p-1 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-semibold text-white w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                      className="text-slate-400 hover:text-white p-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary & Policy Checks */}
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
              <h2 className="text-base font-semibold text-white">Authoritative Summary</h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Items Total ({cart.itemCount} items)</span>
                  <span className="text-slate-200 font-mono">₹{cart.subtotalInr.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Taxes & Delivery</span>
                  <span className="text-emerald-400 font-medium">Free</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold text-white">
                  <span>Payable Amount</span>
                  <span className="text-brand-400 font-mono">₹{cart.totalInr.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Policy Check Badge */}
              {policyStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    policyStatus.approved
                      ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {policyStatus.approved ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Policy Check: PASSED</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Policy Check: BLOCKED</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {policyStatus.approved
                      ? `Total ₹${cart.totalInr.toLocaleString('en-IN')} is within merchant policy limit (₹${(policyStatus.policy?.maxOrderValueInr || 80000).toLocaleString('en-IN')}).`
                      : policyStatus.message}
                  </p>
                </div>
              )}

              <Link
                to="/checkout"
                className={`w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  policyStatus && !policyStatus.approved
                    ? 'bg-slate-700 opacity-60 cursor-not-allowed'
                    : 'bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 shadow-glow-cyan'
                }`}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
