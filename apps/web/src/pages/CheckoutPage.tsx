import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck, Lock, ArrowLeft, Check } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalPaise = 6648900;
  const formattedTotal = (totalPaise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  const handleTestPayment = () => {
    if (!confirmed) return;
    setLoading(true);

    // In Phase 1 shell, simulate the flow leading to order success
    setTimeout(() => {
      setLoading(false);
      navigate('/order-success');
    }, 1200);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lock className="w-6 h-6 text-brand-400" />
            Bounded Checkout
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Explicit confirmation gate before Razorpay test-mode transaction
          </p>
        </div>

        <Link
          to="/cart"
          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1.5 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cart
        </Link>
      </div>

      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs">
          <div className="flex items-center gap-2 text-emerald-400">
            <Check className="w-4 h-4" />
            <span>1. Intent & Cart</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className="flex items-center gap-2 text-brand-400 font-semibold">
            <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">2</span>
            <span>2. Human Approval</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]">3</span>
            <span>3. Razorpay Payment</span>
          </div>
        </div>

        {/* Amount & Items Review */}
        <div className="p-4 rounded-xl glass-card space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-300 font-medium">Payable Amount</span>
            <span className="text-xl font-bold text-brand-400 font-mono">{formattedTotal}</span>
          </div>
          <p className="text-xs text-slate-400">
            Includes: 1x Pro Developer Laptop, 1x Ergonomic Wireless Mouse.
          </p>
        </div>

        {/* Explicit Human Approval Checkbox Gate */}
        <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 text-brand-500 bg-slate-900 border-white/20 rounded focus:ring-brand-500"
            />
            <div className="space-y-1">
              <span className="text-xs font-semibold text-white">
                Explicit Purchase Authorization (Required)
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                I explicitly authorize PayPilot to create a Razorpay test-mode transaction of{' '}
                <strong className="text-brand-300">{formattedTotal}</strong>. The AI assistant cannot execute payments autonomously without this manual approval.
              </p>
            </div>
          </label>
        </div>

        {/* Security & Test Mode Notice */}
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Server-side HMAC verification and signed webhook reconciliation will occur upon completion.</span>
        </div>

        {/* Payment Button */}
        <button
          onClick={handleTestPayment}
          disabled={!confirmed || loading}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            confirmed && !loading
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-glow-cyan'
              : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>{loading ? 'Initializing Razorpay Checkout...' : `Pay ${formattedTotal} via Razorpay (Test Mode)`}</span>
        </button>
      </div>
    </div>
  );
};
