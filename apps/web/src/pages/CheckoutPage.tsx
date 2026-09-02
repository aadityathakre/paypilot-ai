import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck, Lock, ArrowLeft, Check, AlertTriangle, Wallet, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { RazorpayModal } from '../components/payment/RazorpayModal';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const { cart, refreshCart } = useCart();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'wallet'>('razorpay');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Razorpay Modal state for Razorpay standard checkout / top-up
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState('');
  const [activeRazorpayOrderId, setActiveRazorpayOrderId] = useState('');
  const [activeAmountInr, setActiveAmountInr] = useState(0);
  const [razorpayModalMode, setRazorpayModalMode] = useState<'checkout' | 'topup'>('checkout');

  useEffect(() => {
    refreshCart();
    refreshUser();
  }, []);

  const walletBalance = user?.walletBalanceInr ?? 0;
  const cartTotal = cart?.totalInr ?? 0;
  const isWalletInsufficient = walletBalance < cartTotal;

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
        throw new Error(orderJson.message || orderJson.error?.message || 'Policy or order creation failed');
      }

      const { orderId, razorpayOrderId, amountInr } = orderJson.data;

      // 2A. Pay via PayPilot Prepaid Wallet (Strict DB Balance Check)
      if (paymentMethod === 'wallet') {
        if (isWalletInsufficient) {
          throw new Error(`Insufficient Wallet Balance! Your wallet has ₹${walletBalance.toLocaleString('en-IN')}, but order total is ₹${cartTotal.toLocaleString('en-IN')}. Please top up your wallet via Razorpay by ₹${(cartTotal - walletBalance).toLocaleString('en-IN')} to proceed.`);
        }

        const walletRes = await fetch('/api/payments/pay-with-wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId }),
        });

        const walletJson = await walletRes.json();
        if (!walletRes.ok || !walletJson.success) {
          throw new Error(walletJson.message || 'Wallet payment failed');
        }

        await refreshUser();
        await refreshCart();

        navigate('/order-success', {
          state: {
            orderId,
            razorpayPaymentId: walletJson.data.paymentId,
            amountInr,
            merchantName: user?.merchant?.name || 'PayPilot Official Store',
            paymentMethod: 'PayPilot Prepaid Wallet (PostgreSQL Verified)',
          },
        });
        return;
      }

      // 2B. Pay via Official Razorpay Standard Checkout
      setActiveOrderId(orderId);
      setActiveRazorpayOrderId(razorpayOrderId);
      setActiveAmountInr(amountInr);
      setRazorpayModalMode('checkout');
      setIsRazorpayModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const formattedTotal = cart ? `₹${cart.totalInr.toLocaleString('en-IN')}` : '₹0';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lock className="w-6 h-6 text-brand-400" />
            Bounded Checkout Gate
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Explicit human authorization gate with real PostgreSQL balance enforcement
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
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs">
          <div className="flex items-center gap-2 text-emerald-400">
            <Check className="w-4 h-4" />
            <span>1. Cart & Policy Verified</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className="flex items-center gap-2 text-brand-400 font-semibold">
            <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">2</span>
            <span>2. Select Payment Method</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]">3</span>
            <span>3. Payment Settlement</span>
          </div>
        </div>

        {/* Amount & Items Review */}
        <div className="p-4 rounded-xl glass-card space-y-3 border border-white/10">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-300 font-medium">Authoritative Payable Amount</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{formattedTotal}</span>
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

        {/* Payment Method Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-white block">Choose Payment Method</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Option A: Razorpay Standard Checkout */}
            <button
              type="button"
              onClick={() => setPaymentMethod('razorpay')}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden ${
                paymentMethod === 'razorpay'
                  ? 'bg-blue-600/20 border-blue-400 text-white shadow-glow-cyan'
                  : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <span className="text-xs font-bold text-white">Razorpay Checkout</span>
                </div>
                {paymentMethod === 'razorpay' && <Check className="w-4 h-4 text-blue-400" />}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                UPI, QR Code, Cards & Netbanking via official Razorpay SDK.
              </p>
              <span className="text-[10px] font-mono text-blue-300 mt-2 font-semibold">Test Mode Active</span>
            </button>

            {/* Option B: PayPilot Prepaid Wallet */}
            <button
              type="button"
              onClick={() => setPaymentMethod('wallet')}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden ${
                paymentMethod === 'wallet'
                  ? 'bg-emerald-600/20 border-emerald-400 text-white shadow-glow-cyan'
                  : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold text-white">PayPilot Wallet</span>
                </div>
                {paymentMethod === 'wallet' && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <div className="mt-2">
                <span className="text-[10px] text-slate-400 block font-mono">PostgreSQL Live Balance</span>
                <span className={`text-sm font-black font-mono ${isWalletInsufficient ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ₹{walletBalance.toLocaleString('en-IN')}
                </span>
              </div>
              {isWalletInsufficient && paymentMethod === 'wallet' && (
                <span className="text-[10px] font-bold text-rose-400 mt-1 block">
                  ⚠️ Insufficient Balance (Shortfall: ₹{(cartTotal - walletBalance).toLocaleString('en-IN')})
                </span>
              )}
            </button>
          </div>

          {/* Wallet Insufficient Warning & Quick TopUp CTA */}
          {paymentMethod === 'wallet' && isWalletInsufficient && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Wallet has ₹{walletBalance.toLocaleString('en-IN')}, but total is ₹{cartTotal.toLocaleString('en-IN')}.</span>
              </div>
              <button
                onClick={() => {
                  setActiveAmountInr(Math.max(2000, cartTotal - walletBalance));
                  setRazorpayModalMode('topup');
                  setIsRazorpayModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1 shrink-0 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Top-Up Wallet</span>
              </button>
            </div>
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
                I explicitly authorize PayPilot to process{' '}
                <strong className="text-emerald-300">{formattedTotal}</strong> via{' '}
                <strong className="text-cyan-300">{paymentMethod === 'wallet' ? 'Prepaid Wallet' : 'Razorpay Checkout'}</strong>. The AI assistant cannot execute payments autonomously without this manual human approval.
              </p>
            </div>
          </label>
        </div>

        {/* Security & DB Verification Notice */}
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Real PostgreSQL database verification and inventory stock management on every transaction.</span>
        </div>

        {/* Payment Button */}
        <button
          onClick={handleExecutePayment}
          disabled={!confirmed || loading || !cart || cart.items.length === 0}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            confirmed && !loading && cart && cart.items.length > 0
              ? paymentMethod === 'wallet' && isWalletInsufficient
                ? 'bg-rose-950 border border-rose-500/50 text-rose-300 hover:bg-rose-900'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-glow-cyan'
              : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
          }`}
        >
          {paymentMethod === 'wallet' ? <Wallet className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
          <span>
            {loading
              ? 'Processing Order & Checking Database...'
              : paymentMethod === 'wallet' && isWalletInsufficient
              ? `Insufficient Wallet Balance (Requires Top-Up)`
              : `Authorize & Pay ${formattedTotal} via ${paymentMethod === 'wallet' ? 'PayPilot Wallet' : 'Razorpay'}`}
          </span>
        </button>
      </div>

      {/* Razorpay SDK Modal */}
      {token && (
        <RazorpayModal
          isOpen={isRazorpayModalOpen}
          onClose={() => setIsRazorpayModalOpen(false)}
          orderId={activeOrderId}
          razorpayOrderId={activeRazorpayOrderId}
          amountInr={activeAmountInr}
          token={token}
          mode={razorpayModalMode}
          onTopupSuccess={() => {
            refreshUser();
            setIsRazorpayModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
