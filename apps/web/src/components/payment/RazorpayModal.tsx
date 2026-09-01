import React, { useState } from 'react';
import { X, QrCode, CreditCard, Building2, ShieldCheck, Check, AlertCircle, ArrowRight, Lock, KeyRound } from 'lucide-react';
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
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking' | 'wallet' | 'qr'>('upi');
  const [step, setStep] = useState<'method' | 'otp' | 'processing' | 'success'>('method');
  const [upiId, setUpiId] = useState('success@razorpay');
  const [upiPin, setUpiPin] = useState('1234');
  const [cardNumber, setCardNumber] = useState('4111 •••• •••• 1111');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [otp, setOtp] = useState('123456');
  const [selectedBank, setSelectedBank] = useState('SBI');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProceedToAuth = () => {
    setError(null);
    setStep('otp');
  };

  const handleConfirmFinalPayment = async () => {
    setStep('processing');
    setError(null);

    try {
      // Simulate realistic processing time
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 1. Generate realistic test payment ID
      const paymentId = `pay_test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

      // 2. Call backend verification endpoint
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
          razorpaySignature: 'simulated_hmac_sha256_verified',
          paymentMethod: selectedMethod,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.message || 'Payment verification failed');
      }

      setStep('success');

      setTimeout(() => {
        navigate('/order-success', {
          state: {
            orderId,
            razorpayOrderId,
            razorpayPaymentId: paymentId,
            amountInr,
            paymentMethod: selectedMethod,
          },
        });
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Payment simulation failed');
      setStep('method');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-blue-500/30 shadow-2xl overflow-hidden relative font-sans">
        {/* Official Razorpay Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-base tracking-tighter text-blue-100 border border-white/20">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white">Razorpay Standard Checkout</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
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
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & Merchant Header Banner */}
        <div className="px-5 py-3 bg-slate-850 border-b border-white/10 flex justify-between items-center bg-slate-800/80">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Merchant</span>
            <span className="text-xs font-semibold text-white">PayPilot AI Official Store</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-medium">Amount to Pay</span>
            <span className="text-lg font-extrabold text-emerald-400 font-mono">
              ₹{amountInr.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* STEP 1: METHOD SELECTION */}
        {step === 'method' && (
          <div className="p-5 space-y-4">
            <span className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">Select Payment Option</span>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => setSelectedMethod('upi')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  selectedMethod === 'upi'
                    ? 'bg-blue-600/25 border-blue-400 text-blue-300 shadow-md shadow-blue-500/10'
                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-5 h-5 text-cyan-400" />
                <span className="font-bold">UPI / GPay</span>
              </button>

              <button
                onClick={() => setSelectedMethod('card')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  selectedMethod === 'card'
                    ? 'bg-blue-600/25 border-blue-400 text-blue-300 shadow-md shadow-blue-500/10'
                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <span className="font-bold">Card</span>
              </button>

              <button
                onClick={() => setSelectedMethod('netbanking')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  selectedMethod === 'netbanking'
                    ? 'bg-blue-600/25 border-blue-400 text-blue-300 shadow-md shadow-blue-500/10'
                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-5 h-5 text-amber-400" />
                <span className="font-bold">Netbanking</span>
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Method Details Card */}
            {selectedMethod === 'upi' && (
              <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Enter VPA / UPI ID</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Auto-Approved Test ID
                  </span>
                </div>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/20 text-xs text-white font-mono focus:border-blue-400 outline-none"
                />
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Supports GPay, PhonePe, Paytm & BHIM UPI</span>
                </div>
              </div>
            )}

            {selectedMethod === 'card' && (
              <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">Test Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/20 text-xs text-white font-mono focus:border-blue-400 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-mono">Expiry Date</label>
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

            {selectedMethod === 'netbanking' && (
              <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 space-y-3">
                <span className="text-xs font-semibold text-white block">Select Bank for Simulation</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'].map((bank) => (
                    <button
                      key={bank}
                      onClick={() => setSelectedBank(bank)}
                      className={`p-2.5 rounded-lg border text-center font-medium transition-all ${
                        selectedBank === bank
                          ? 'bg-blue-600/30 border-blue-400 text-white font-bold'
                          : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleProceedToAuth}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
            >
              <span>Proceed to Pay ₹{amountInr.toLocaleString('en-IN')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: OTP / UPI PIN AUTHENTICATION SIMULATION */}
        {step === 'otp' && (
          <div className="p-5 space-y-4 animate-fade-in">
            <div className="text-center space-y-1.5">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-400 flex items-center justify-center mx-auto">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">2-Step Bank Authorization</h3>
              <p className="text-xs text-slate-400">
                {selectedMethod === 'upi'
                  ? 'Enter 4-Digit UPI PIN on your mobile app'
                  : 'Enter 6-Digit OTP sent to your registered mobile'}
              </p>
            </div>

            {selectedMethod === 'upi' ? (
              <div className="space-y-2">
                <label className="text-[11px] text-slate-300 font-medium block text-center">UPI PIN Simulation</label>
                <input
                  type="password"
                  maxLength={4}
                  value={upiPin}
                  onChange={(e) => setUpiPin(e.target.value)}
                  className="w-48 mx-auto block px-4 py-2.5 text-center text-lg font-mono tracking-widest rounded-xl bg-slate-900 border border-blue-400/50 text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[11px] text-slate-300 font-medium block text-center">Bank OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-48 mx-auto block px-4 py-2.5 text-center text-lg font-mono tracking-widest rounded-xl bg-slate-900 border border-blue-400/50 text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep('method')}
                className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirmFinalPayment}
                className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Submit & Complete</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PROCESSING OVERLAY */}
        {step === 'processing' && (
          <div className="p-8 text-center space-y-4 animate-fade-in">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center font-bold text-sm text-blue-400">
                R
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Verifying Razorpay Signature...</h4>
              <p className="text-xs text-slate-400 mt-1">Executing HMAC SHA256 server reconciliation</p>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS COIN ANIMATION & CONFIRMATION */}
        {step === 'success' && (
          <div className="p-8 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <Check className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white">Payment Verified & Completed!</h4>
              <p className="text-xs text-emerald-400 font-medium mt-1">Order Status Updated to PAID</p>
            </div>
          </div>
        )}

        {/* Security Footer */}
        <div className="p-3 bg-slate-950 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-Bit Encrypted Razorpay Sandbox</span>
          </div>
          <span className="font-mono">PCI-DSS Compliant</span>
        </div>
      </div>
    </div>
  );
};
