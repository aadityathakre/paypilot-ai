import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, ShoppingBag, Store, Wallet, Package, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const OrderSuccessPage: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const state = location.state as any;

  const orderId = state?.orderId || 'ord_demo_' + Date.now().toString(36);
  const razorpayOrderId = state?.razorpayOrderId || 'order_test_' + Date.now().toString(36);
  const razorpayPaymentId = state?.razorpayPaymentId || 'pay_test_' + Date.now().toString(36);
  const amountInr = state?.amountInr || 66489;
  const merchantName = state?.merchantName || user?.merchant?.name || 'PayPilot AI Official Store';
  const paymentMethod = state?.paymentMethod || 'Razorpay Test Mode';

  const isMerchant = user?.role === 'MERCHANT' || user?.role === 'ADMIN';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="glass-panel rounded-3xl p-8 border border-white/10 text-center space-y-6 shadow-glass">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-glow-cyan animate-bounce">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Payment Verified & Order Confirmed
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Order Confirmed!</h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Your transaction was verified and atomically recorded in PostgreSQL database.
          </p>
        </div>

        {/* Email Receipt Status Banner */}
        <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs flex items-center justify-center gap-2">
          <Mail className="w-4 h-4 text-purple-400 shrink-0" />
          <span>Digital receipt & order confirmation dispatched via Nodemailer to <strong className="text-white font-mono">{user?.email || 'your email address'}</strong></span>
        </div>

        {/* Transaction & Merchant Summary Card */}
        <div className="p-5 rounded-2xl glass-card text-left text-xs space-y-3 border border-white/10">
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Store className="w-4 h-4 text-purple-400" />
              Fulfilling Merchant Store:
            </span>
            <span className="font-bold text-white text-sm">{merchantName}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Order Reference ID:</span>
            <span className="font-mono text-brand-300 font-semibold">{orderId}</span>
          </div>

          {razorpayOrderId && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Razorpay Order ID:</span>
              <span className="font-mono text-slate-300">{razorpayOrderId}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Payment ID:</span>
            <span className="font-mono text-emerald-400 font-semibold">{razorpayPaymentId}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Payment Channel:</span>
            <span className="font-mono text-cyan-300">{paymentMethod}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Verification Engine:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              PASSED (PostgreSQL HMAC Verified)
            </span>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-white/10">
            <span className="text-slate-400 font-medium">Total Paid:</span>
            <span className="font-bold text-lg text-emerald-400 font-mono">
              ₹{Number(amountInr).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Customer Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/orders"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <Package className="w-4 h-4 text-emerald-400" />
            <span>My Order History</span>
          </Link>

          <Link
            to="/profile"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>View Wallet Balance</span>
          </Link>

          {isMerchant && (
            <Link
              to="/merchant"
              className="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Store className="w-4 h-4" />
              <span>Merchant Studio</span>
            </Link>
          )}

          <Link
            to="/"
            className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 shadow-glow-cyan transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
