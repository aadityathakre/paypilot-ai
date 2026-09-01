import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, ArrowRight, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';

export const CartPage: React.FC = () => {
  // Demo cart items for phase 1 shell
  const demoCartItems = [
    {
      id: 'item_1',
      name: 'Pro Developer Laptop (16GB, 512GB SSD)',
      category: 'Laptops',
      pricePaise: 6499000,
      quantity: 1,
      sku: 'LAP-DEV-001',
    },
    {
      id: 'item_2',
      name: 'Ergonomic Wireless Mouse',
      category: 'Accessories',
      pricePaise: 149900,
      quantity: 1,
      sku: 'ACC-MOU-002',
    },
  ];

  const subtotalPaise = demoCartItems.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
  const formattedSubtotal = (subtotalPaise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-indigo-400" />
            Your Shopping Cart
          </h1>
          <p className="text-xs text-slate-400 mt-1">Review items recommended by PayPilot AI</p>
        </div>

        <Link
          to="/"
          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1.5 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assistant
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {demoCartItems.map((item) => (
            <div
              key={item.id}
              className="glass-card rounded-xl p-4 flex items-center justify-between gap-4 border border-white/10"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {item.category} • {item.sku}
                </span>
                <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                <p className="text-sm font-bold text-brand-400">
                  {(item.pricePaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-white/10">
                  <button className="text-slate-400 hover:text-white p-1">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-semibold text-white w-4 text-center">{item.quantity}</span>
                  <button className="text-slate-400 hover:text-white p-1">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button className="text-slate-500 hover:text-rose-400 p-1.5 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Upsell Growth Banner */}
          <div className="glass-card rounded-xl p-4 border border-indigo-500/30 bg-indigo-950/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                AI Growth Recommendation
              </span>
              <h4 className="text-xs font-semibold text-white mt-1">Add 65W GaN Fast Charger</h4>
              <p className="text-[11px] text-slate-400">Matches your coding laptop • Special ₹1,299 bundle price</p>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors">
              + Add to Cart
            </button>
          </div>
        </div>

        {/* Order Summary & Policy Checks */}
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
            <h2 className="text-base font-semibold text-white">Order Summary</h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Items Subtotal</span>
                <span className="text-slate-200">{formattedSubtotal}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Estimated Taxes & Shipping</span>
                <span className="text-emerald-400 font-medium">Free</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold text-white">
                <span>Total Amount</span>
                <span className="text-brand-400 font-mono">{formattedSubtotal}</span>
              </div>
            </div>

            {/* Policy Check Badge */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Policy Gate Check: PASSED</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Total ₹66,489 is within merchant policy ceiling (₹80,000).
              </p>
            </div>

            <Link
              to="/checkout"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-glow-cyan transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
