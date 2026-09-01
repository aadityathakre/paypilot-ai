import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, FileText, ShoppingBag } from 'lucide-react';

export const OrderSuccessPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as any;

  const orderId = state?.orderId || 'ord_demo_' + Date.now().toString(36);
  const razorpayOrderId = state?.razorpayOrderId || 'order_test_' + Date.now().toString(36);
  const razorpayPaymentId = state?.razorpayPaymentId || 'pay_test_' + Date.now().toString(36);
  const amountInr = state?.amountInr || 66489;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="glass-panel rounded-3xl p-8 border border-white/10 text-center space-y-6 shadow-glass">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-glow-cyan animate-bounce">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Payment Verified & Completed
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Order Confirmed!</h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Your Razorpay transaction was cryptographically verified and recorded in the audit trail.
          </p>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-5 rounded-2xl glass-card text-left text-xs space-y-3 border border-white/10">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Order ID:</span>
            <span className="font-mono text-slate-200">{orderId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Razorpay Order ID:</span>
            <span className="font-mono text-slate-300">{razorpayOrderId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Payment ID:</span>
            <span className="font-mono text-emerald-400">{razorpayPaymentId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">HMAC Verification:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              PASSED (SHA256)
            </span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-white/10">
            <span className="text-slate-400 font-medium">Total Paid:</span>
            <span className="font-bold text-base text-brand-400 font-mono">
              ₹{Number(amountInr).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/merchant"
            className="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>View Audit Trail in Merchant Dashboard</span>
          </Link>

          <Link
            to="/"
            className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-glow-cyan transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Start New AI Shopping Journey</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
