import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Sparkles,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  razorpayOrderId?: string;
  amountInr: number;
  token?: string | null;
  mode?: 'checkout' | 'topup';
  onTopupSuccess?: (newBalanceInr: number) => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  onClose,
  orderId = '',
  razorpayOrderId: initialRazorpayOrderId,
  amountInr,
  token,
  mode = 'checkout',
  onTopupSuccess,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpayKey, setRazorpayKey] = useState<string>('rzp_test_SYAcYi8w0tPFB9');

  // Load Razorpay Standard Checkout SDK dynamically
  useEffect(() => {
    if (!document.getElementById('razorpay-sdk-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-sdk-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch Razorpay key ID on mount
  useEffect(() => {
    if (token) {
      fetch('/api/payments/key', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.keyId) {
            setRazorpayKey(data.data.keyId);
          }
        })
        .catch(() => null);
    }
  }, [token]);

  // Auto launch real Razorpay modal when dialog is opened
  useEffect(() => {
    if (isOpen) {
      launchRazorpayStandardCheckout();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const launchRazorpayStandardCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Obtain or create a real Razorpay Order ID
      let activeRzpOrderId = initialRazorpayOrderId;

      if (!activeRzpOrderId || activeRzpOrderId.startsWith('order_simulated')) {
        const orderRes = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amountInr,
            receipt: `rcpt_${Date.now().toString(36)}`,
          }),
        });
        const orderJson = await orderRes.json();
        if (orderJson.success && orderJson.data?.razorpayOrderId) {
          activeRzpOrderId = orderJson.data.razorpayOrderId;
          if (orderJson.data.keyId) {
            setRazorpayKey(orderJson.data.keyId);
          }
        }
      }

      // Ensure Razorpay SDK script is ready
      if (!(window as any).Razorpay) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!(window as any).Razorpay) {
        throw new Error('Razorpay SDK failed to load. Check your internet connection.');
      }

      // 2. Configure Official Razorpay Standard Checkout Options
      const options: any = {
        key: razorpayKey || 'rzp_test_SYAcYi8w0tPFB9',
        amount: Math.round(amountInr * 100), // Amount in paise
        currency: 'INR',
        name: mode === 'topup' ? 'PayPilot Customer Wallet' : 'PayPilot AI Official Store',
        description: mode === 'topup' ? 'Prepaid Wallet Top-Up (Razorpay Test Mode)' : 'Agentic Commerce Order Payment',
        order_id: activeRzpOrderId,
        prefill: {
          name: user?.name || 'Customer',
          email: user?.email || 'customer@paypilot.ai',
          contact: user?.phoneNumber || '9821054321',
        },
        notes: {
          merchant_name: 'PayPilot AI',
          mode: mode,
        },
        theme: {
          color: '#2563eb',
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
          },
        },

        // 3. Handle official Razorpay Payment Success Callback
        handler: async function (response: any) {
          setIsLoading(true);
          try {
            if (mode === 'topup') {
              // Call wallet top-up API with real Razorpay Payment ID
              const topupRes = await fetch('/api/auth/wallet/topup', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  amountInr,
                  paymentId: response.razorpay_payment_id,
                }),
              });
              const topupJson = await topupRes.json();
              if (!topupRes.ok || !topupJson.success) {
                throw new Error(topupJson?.message || 'Wallet topup verification failed.');
              }

              if (onTopupSuccess) {
                onTopupSuccess(topupJson.data.walletBalanceInr);
              }
              onClose();
            } else {
              // Verify payment signature on backend
              const verifyRes = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  orderId,
                  razorpayOrderId: response.razorpay_order_id || activeRzpOrderId,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  paymentMethod: 'razorpay_standard_checkout',
                }),
              });

              const verifyJson = await verifyRes.json();
              if (!verifyRes.ok || !verifyJson.success) {
                throw new Error(verifyJson?.message || 'Payment verification failed.');
              }

              onClose();
              navigate('/order-success', {
                state: {
                  orderId,
                  razorpayOrderId: response.razorpay_order_id || activeRzpOrderId,
                  razorpayPaymentId: response.razorpay_payment_id,
                  amountInr,
                  paymentMethod: 'Razorpay Test Mode',
                },
              });
            }
          } catch (err: any) {
            setError(err.message || 'Payment verification error.');
            setIsLoading(false);
          }
        },
      };

      // 4. Open Real Razorpay Standard Checkout SDK Iframe
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to launch Razorpay Checkout:', err);
      setError(err.message || 'Unable to open Razorpay Checkout SDK.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-blue-500/30 shadow-2xl p-6 space-y-6 text-slate-100 relative">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 font-black text-white text-lg flex items-center justify-center shadow-lg">
              R
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white leading-tight">
                Official Razorpay Standard Checkout
              </h3>
              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Razorpay Test Mode Active ({razorpayKey})
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Price & Mode Info Card */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-mono">
              {mode === 'topup' ? 'Wallet Deposit Amount' : 'Total Order Amount'}
            </span>
            <span className="text-2xl font-black text-white font-mono">
              ₹{amountInr.toLocaleString('en-IN')}
            </span>
          </div>

          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-mono font-bold">
            TEST MODE
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button to Launch Real Razorpay SDK */}
        <div className="space-y-3 py-2 text-center">
          <button
            onClick={launchRazorpayStandardCheckout}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Launching Razorpay Checkout...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-cyan-300" />
                <span>Launch Official Razorpay Test Checkout</span>
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-xs text-slate-400">
            Opens official Razorpay standard popup with test UPI QR code, test cards, netbanking & wallet sandbox.
          </p>
        </div>

        {/* Security Footer */}
        <div className="border-t border-white/10 pt-3 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Powered by Razorpay standard checkout SDK</span>
          </div>
          <span className="font-mono text-slate-400">256-Bit SSL Encrypted</span>
        </div>
      </div>
    </div>
  );
};
