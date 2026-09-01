import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ShieldCheck, Lock, ArrowLeft, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { RazorpayModal } from '../components/payment/RazorpayModal';

export const CheckoutPage: React.FC = () => {
  const { token } = useAuth();
  const { cart, refreshCart } = useCart();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Razorpay Modal state
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState('');
  const [activeRazorpayOrderId, setActiveRazorpayOrderId] = useState('');
  const [activeAmountInr, setActiveAmountInr] = useState(0);

  useEffect(() => {
    refreshCart();
  }, []);

  const handleExecutePayment = async () => {
    if (!confirmed || !token || !cart || cart.items.length === 0 || loading) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Create Checkout Order & Validate Policy on backend
      const orderRes = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ customerConfirmed: true }),
      });

      const orderJson = await orderRes.json();
      if (!orderJson.success || !orderJson.data) {
        throw new Error(orderJson.error?.message || 'Policy or order creation failed');
      }

      const { orderId, razorpayOrderId, amountInr } = orderJson.data;

      setActiveOrderId(orderId);
      setActiveRazorpayOrderId(razorpayOrderId);
      setActiveAmountInr(amountInr);
      setIsRazorpayModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const formattedTotal = cart
    ? `₹${cart.totalInr.toLocaleString('en-IN')}`
    : '₹0';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lock className="w-6 h-6 text-brand-400" />
            Bounded Checkout Gate
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

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

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
        <div className="p-4 rounded-xl glass-card space-y-3 border border-white/10">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-300 font-medium">Authoritative Payable Amount</span>
            <span className="text-xl font-bold text-brand-400 font-mono">{formattedTotal}</span>
          </div>
          {cart && cart.items.length > 0 ? (
            <p className="text-xs text-slate-400">
              Includes: {cart.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
            </p>
          ) : (
            <p className="text-xs text-amber-300">
              Your cart is empty. Please add items from the AI Assistant before checking out.
            </p>
          )}
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
                Explicit Purchase Authorization Gate (Mandatory)
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                I explicitly authorize PayPilot to initiate a Razorpay test-mode transaction of{' '}
                <strong className="text-brand-300">{formattedTotal}</strong>. The AI assistant cannot execute payments autonomously without this manual human approval.
              </p>
            </div>
          </label>
        </div>

        {/* Security & Test Mode Notice */}
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Cryptographic HMAC SHA256 signature verification occurs on the backend before order completion.</span>
        </div>

        {/* Payment Button */}
        <button
          onClick={handleExecutePayment}
          disabled={!confirmed || loading || !cart || cart.items.length === 0}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            confirmed && !loading && cart && cart.items.length > 0
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-glow-cyan'
              : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>
            {loading
              ? 'Validating Policy & Creating Razorpay Order...'
              : `Authorize & Pay ${formattedTotal} via Razorpay (Test Mode)`}
          </span>
        </button>
      </div>

      {/* Razorpay Simulation Modal */}
      {token && (
        <RazorpayModal
          isOpen={isRazorpayModalOpen}
          onClose={() => setIsRazorpayModalOpen(false)}
          orderId={activeOrderId}
          razorpayOrderId={activeRazorpayOrderId}
          amountInr={activeAmountInr}
          token={token}
        />
      )}
    </div>
  );
};
