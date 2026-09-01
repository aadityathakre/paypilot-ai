import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, Calendar, CheckCircle2, Clock, XCircle, FileText, ShoppingBag, ShieldCheck, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPriceRupees: number;
  subtotalRupees: number;
}

interface Order {
  id: string;
  status: 'PAID' | 'PENDING_PAYMENT' | 'FAILED' | 'CANCELLED';
  amountRupees: number;
  createdAt: string;
  itemCount: number;
  items: OrderItem[];
  payment?: {
    razorpayPaymentId: string;
    method: string;
    verifiedAt: string;
  } | null;
}

export const CustomerOrdersPage: React.FC = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setOrders(json.data.orders);
      } else {
        setError(json.message || 'Failed to fetch order history');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>PAID & VERIFIED</span>
          </span>
        );
      case 'PENDING_PAYMENT':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 w-fit">
            <Clock className="w-3.5 h-3.5" />
            <span>PENDING PAYMENT</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 w-fit">
            <XCircle className="w-3.5 h-3.5" />
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-brand-400" />
              <h1 className="text-xl font-bold text-white">Order History & Financial Details</h1>
            </div>
            <p className="text-xs text-slate-400">
              Logged in as <span className="font-semibold text-white">{user?.name}</span> ({user?.email})
            </p>
          </div>

          {/* PayPilot Demo Wallet Widget */}
          <div className="flex items-center gap-4 bg-slate-950 px-4 py-3 rounded-xl border border-white/10">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">PayPilot Credit Wallet</span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono">₹10,000.00 Demo</span>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin mx-auto mb-3" />
            Loading order history...
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs text-center">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/40 border border-white/5 text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-white">No Orders Found</h3>
              <p className="text-xs text-slate-400 mt-1">You haven't placed any orders yet.</p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs transition-colors"
            >
              <span>Explore Products</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="bg-slate-900/80 rounded-2xl border border-white/10 p-5 space-y-4 hover:border-white/20 transition-all shadow-lg"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">Order ID:</span>
                      <span className="text-xs font-mono text-brand-400 font-semibold">{ord.id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(ord.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {getStatusBadge(ord.status)}
                    <button
                      onClick={() => setSelectedOrder(ord)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Receipt</span>
                    </button>
                  </div>
                </div>

                {/* Line Items */}
                <div className="divide-y divide-white/5">
                  {ord.items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">{item.productName}</span>
                        <span className="text-slate-400 block text-[11px]">Quantity: {item.quantity}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-200">
                        ₹{item.subtotalRupees.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer Breakdown */}
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    {ord.payment?.razorpayPaymentId && (
                      <span className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Payment ID: {ord.payment.razorpayPaymentId}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[11px] block">Total Amount Paid</span>
                    <span className="text-base font-extrabold text-emerald-400 font-mono">
                      ₹{ord.amountRupees.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Digital Receipt Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-white/20 space-y-5 shadow-2xl relative">
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>

              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Digital Payment Receipt</h3>
                <p className="text-xs text-slate-400">Cryptographically Verified Transaction</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Order ID:</span>
                  <span className="text-slate-200">{selectedOrder.id}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold">{selectedOrder.status}</span>
                </div>
                {selectedOrder.payment?.razorpayPaymentId && (
                  <div className="flex justify-between text-slate-400">
                    <span>Razorpay ID:</span>
                    <span className="text-emerald-400">{selectedOrder.payment.razorpayPaymentId}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Date:</span>
                  <span className="text-slate-200">{new Date(selectedOrder.createdAt).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-300 block">Items Purchased</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedOrder.items.map((i) => (
                    <div key={i.id} className="flex justify-between p-2 rounded-lg bg-slate-800/50">
                      <span>{i.productName} × {i.quantity}</span>
                      <span className="font-mono font-bold text-emerald-400">₹{i.subtotalRupees.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-300">Total Amount Paid</span>
                <span className="text-emerald-400 font-mono text-lg">₹{selectedOrder.amountRupees.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
