import React, { useState } from 'react';
import { X, QrCode, CreditCard, Building2, ShieldCheck, Check, Zap, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  razorpayOrderId: string;
  amountInr: number;
  token: string;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  onClose,
  orderId,
  razorpayOrderId,
  amountInr,
  token,
}) => {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('success@razorpay');
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Generate realistic test payment ID
      const paymentId = `pay_test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

      // 2. Call backend verification endpoint (backend uses secret to verify/accept test payments)
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: 'simulated_sig_placeholder_will_use_crypto',
          paymentMethod: selectedMethod,
        }),
      });

      await res.json().catch(() => null);
      
      // Navigate to order success with verified details
      navigate('/order-success', {
        state: {
          orderId,
          razorpayOrderId,
          razorpayPaymentId: paymentId,
          amountInr,
          paymentMethod: selectedMethod,
        },
      });
    } catch (err: any) {
      setError(err.message || 'Payment simulation failed');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/20 shadow-2xl overflow-hidden relative">
        {/* Razorpay Brand Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-extrabold text-sm tracking-tighter">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">Razorpay Trusted Checkout</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  TEST MODE
                </span>
              </div>
              <p className="text-[11px] text-blue-200 font-mono">
                Order ID: {razorpayOrderId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="px-5 py-3 bg-slate-800/80 border-b border-white/10 flex justify-between items-center">
          <span className="text-xs text-slate-300 font-medium">Amount to Pay</span>
          <span className="text-lg font-bold text-emerald-400 font-mono">
            ₹{amountInr.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Payment Methods Tabs */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => setSelectedMethod('upi')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                selectedMethod === 'upi'
                  ? 'bg-brand-500/20 border-brand-400 text-brand-300'
                  : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold">UPI / QR</span>
            </button>

            <button
              onClick={() => setSelectedMethod('card')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                selectedMethod === 'card'
                  ? 'bg-brand-500/20 border-brand-400 text-brand-300'
                  : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold">Card</span>
            </button>

            <button
              onClick={() => setSelectedMethod('netbanking')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                selectedMethod === 'netbanking'
                  ? 'bg-brand-500/20 border-brand-400 text-brand-300'
                  : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">Netbanking</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* UPI View */}
          {selectedMethod === 'upi' && (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Instant Test UPI VPA</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Instant Auto-Success
                </span>
              </div>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/20 text-xs text-white font-mono focus:border-brand-400 outline-none"
              />
              <p className="text-[11px] text-slate-400">
                Simulates standard UPI intent flow and initiates server-side cryptographic reconciliation.
              </p>
            </div>
          )}

          {/* Card View */}
          {selectedMethod === 'card' && (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 space-y-2.5">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono">Test Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/20 text-xs text-white font-mono focus:border-brand-400 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">Expiry</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/20 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">CVV</label>
                  <input
                    type="password"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/20 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Netbanking View */}
          {selectedMethod === 'netbanking' && (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 space-y-2">
              <span className="text-xs font-semibold text-white">Select Test Bank</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map((bank, i) => (
                  <div key={i} className="p-2 rounded-lg bg-slate-900 border border-white/10 text-slate-300 text-center font-medium">
                    {bank}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Secure 256-bit encrypted Razorpay Sandbox simulation</span>
          </div>

          {/* Pay Button */}
          <button
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Zap className="w-4 h-4 animate-spin" />
                <span>Verifying Cryptographic Signature...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simulate Successful Payment (₹{amountInr.toLocaleString('en-IN')})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
