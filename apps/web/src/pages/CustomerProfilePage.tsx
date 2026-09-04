import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User as UserIcon,
  Wallet,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Camera,
  Trash2,
  Phone,
  Mail,
  CheckCircle2,
  Globe,
  AlertCircle,
  Edit3,
  Activity,
  FileText,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { RazorpayModal } from '../components/payment/RazorpayModal';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPriceRupees: number;
  subtotalRupees: number;
}

interface Order {
  id: string;
  receipt?: string;
  merchantName?: string;
  status: string;
  amountRupees?: number;
  amountPaise?: number;
  razorpayOrderId?: string;
  createdAt: string;
  items?: OrderItem[];
  payment?: {
    razorpayPaymentId: string;
  };
  payments?: Array<{
    razorpayPaymentId: string;
  }>;
}

export const CustomerProfilePage: React.FC = () => {
  const { user, token, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'wallet' | 'orders' | 'language' | 'audit'>('profile');

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // OTP state
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Audit Events state
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Razorpay Top-Up state
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState(5000);

  // Language state
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>(() => {
    return (localStorage.getItem('paypilot_language') as any) || 'en';
  });

  useEffect(() => {
    refreshUser();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhoneNumber(user.phoneNumber || '');
    }
  }, [user]);

  const handleLanguageChange = (lang: 'en' | 'hi' | 'mr') => {
    setLanguage(lang);
    localStorage.setItem('paypilot_language', lang);
  };

  const fetchOrders = async () => {
    if (!token) return;
    setIsLoadingOrders(true);
    try {
      const res = await fetch('/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setOrders(json.data.orders);
      }
    } catch {
      // silent catch
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const fetchAuditEvents = async () => {
    setIsLoadingAudit(true);
    try {
      const res = await fetch('/api/audit/events?limit=30');
      const json = await res.json();
      if (res.ok && json.success && json.data?.items) {
        setAuditEvents(json.data.items);
      }
    } catch {
      // silent catch
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsUpdatingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phoneNumber }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setProfileMsg({ type: 'success', text: 'Profile details updated successfully!' });
        setIsEditingProfile(false);
        await refreshUser();
      } else {
        setProfileMsg({ type: 'error', text: json.message || 'Failed to update profile details.' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Network error updating profile.' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Image file size must be less than 5MB.' });
      return;
    }

    setIsUploadingAvatar(true);
    setProfileMsg(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch('/api/user/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ avatarData: base64Data }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          setProfileMsg({ type: 'success', text: 'Profile picture uploaded to Cloudinary successfully!' });
          await refreshUser();
        } else {
          setProfileMsg({ type: 'error', text: json.message || 'Cloudinary upload failed.' });
        }
      } catch {
        setProfileMsg({ type: 'error', text: 'Avatar upload error.' });
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    if (!token) return;
    setIsUploadingAvatar(true);
    try {
      const res = await fetch('/api/user/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProfileMsg({ type: 'success', text: 'Profile picture removed.' });
        await refreshUser();
      }
    } catch {
      // silent
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const [enteredOtp, setEnteredOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const handleSendOtp = async () => {
    if (!token) return;
    setIsSendingOtp(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/user/send-otp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        setShowOtpInput(true);
        setProfileMsg({ type: 'success', text: json.message || `6-Digit OTP code sent to ${user?.email}. Code expires in 5 minutes!` });
      } else {
        setProfileMsg({ type: 'error', text: json.message || 'OTP dispatch failed.' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Failed to send OTP.' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !enteredOtp.trim()) return;
    setIsVerifyingOtp(true);
    setProfileMsg(null);

    try {
      const res = await fetch('/api/user/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otpCode: enteredOtp.trim() }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setShowOtpInput(false);
        setEnteredOtp('');
        setProfileMsg({ type: 'success', text: 'Email verified successfully in PostgreSQL database! ✅' });
        await refreshUser();
      } else {
        setProfileMsg({ type: 'error', text: json.message || 'Invalid or expired OTP code.' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'OTP verification failed.' });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const walletBalance = user?.walletBalanceInr ?? 0;
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Profile Badge */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-glass relative">
        <div className="flex items-center gap-5">
          {/* Interactive Profile Avatar Container */}
          <div className="relative">
            <button
              onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
              className="relative group cursor-pointer block rounded-2xl focus:outline-none ring-2 ring-brand-400/30 hover:ring-brand-400 transition-all"
              title="Click to manage profile photo"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-400/60 shadow-glow-cyan"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-glow-cyan">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-slate-900 border border-white/20 text-brand-400 group-hover:text-white shadow-lg transition-transform group-hover:scale-110">
                <Camera className="w-4 h-4" />
              </div>
            </button>

            {/* Profile Picture Action Popover Menu */}
            {avatarMenuOpen && (
              <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl p-2 z-50 space-y-1 animate-fade-in backdrop-blur-xl text-xs">
                <div className="px-3 py-1.5 border-b border-white/10 text-[11px] font-bold text-slate-400">
                  Profile Photo Actions
                </div>

                <label className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:bg-brand-500/20 hover:text-brand-300 cursor-pointer transition-all">
                  <Camera className="w-4 h-4 text-brand-400" />
                  <span className="font-semibold">{isUploadingAvatar ? 'Uploading...' : user?.avatarUrl ? 'Update Photo' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setAvatarMenuOpen(false);
                      handleAvatarFileChange(e);
                    }}
                    className="hidden"
                  />
                </label>

                {user?.avatarUrl && (
                  <button
                    onClick={() => {
                      setAvatarMenuOpen(false);
                      handleRemoveAvatar();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-300 hover:bg-rose-950/60 transition-all font-semibold"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">{user?.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-xs font-mono font-bold border border-brand-500/30">
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 justify-center md:justify-start font-mono">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              {user?.email}
            </p>
            {user?.phoneNumber && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 justify-center md:justify-start font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {user.phoneNumber}
              </p>
            )}
          </div>
        </div>

        {/* Header Right Actions: Wallet */}
        <div className="flex items-center gap-3 justify-center md:justify-end">
          <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-center gap-4 text-right">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">PayPilot Wallet Balance</span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">
                ₹{walletBalance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="flex border-b border-white/10 space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-brand-400 text-brand-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Profile & Account</span>
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'wallet'
              ? 'border-emerald-400 text-emerald-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>PayPilot Wallet</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-purple-400 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Order History ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('language')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'language'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Language (भाषा)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('audit');
            fetchAuditEvents();
          }}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4 text-amber-400" />
          <span>Track 01 Audit Trail</span>
        </button>
      </div>

      {profileMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
            profileMsg.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
          }`}
        >
          {profileMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{profileMsg.text}</span>
        </div>
      )}

      {/* TAB 1: PROFILE & PERSONAL DETAILS */}
      {activeTab === 'profile' && (
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-brand-400" />
              <span>Personal Information & Security</span>
            </h3>
            {!isEditingProfile && (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {!isEditingProfile ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">Full Name</span>
                  <span className="text-sm font-semibold text-white">{user?.name || 'Not provided'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">Phone Number</span>
                  <span className="text-sm font-semibold text-white">{user?.phoneNumber || 'Not provided'}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">Email Address</span>
                  {user?.emailVerified ? (
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified Email Address</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Unverified Email</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white font-mono">{user?.email}</span>
                  {!user?.emailVerified && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 shadow-glow-cyan"
                    >
                      <Mail className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isSendingOtp ? 'Sending OTP...' : 'Send Verification OTP'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 6-Digit OTP Verification Form */}
              {showOtpInput && (
                <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-3 animate-fade-in shadow-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      Enter 6-Digit Verification OTP Code
                    </span>
                    <span className="text-[10px] text-amber-300 font-mono">⏱️ Valid for 5 Minutes</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    A 6-digit OTP code was dispatched from <strong className="text-purple-300 font-mono">team.aditya.invincible@gmail.com</strong> to your inbox.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      placeholder="e.g. 482910"
                      className="w-36 bg-slate-950 border border-purple-500/50 rounded-xl px-3 py-2 text-center text-lg font-mono font-bold text-emerald-400 tracking-widest outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || enteredOtp.trim().length !== 6}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        enteredOtp.trim().length === 6 && !isVerifyingOtp
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-glow-cyan cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      {isVerifyingOtp ? 'Checking DB...' : 'Confirm & Verify Email'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setName(user?.name || '');
                    setPhoneNumber(user?.phoneNumber || '');
                    setIsEditingProfile(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-extrabold shadow-glow-cyan transition-all"
                >
                  {isUpdatingProfile ? 'Saving Details...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: PREPAID WALLET */}
      {activeTab === 'wallet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                Prepaid Wallet Hub
              </h3>
              <button
                onClick={refreshUser}
                className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/30 space-y-2">
              <span className="text-xs text-slate-400 font-mono">Available Wallet Balance</span>
              <div className="text-3xl font-black text-emerald-400 font-mono">
                ₹{walletBalance.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400">
                Backed by real PostgreSQL database queries. Used for instant checkout without card entry.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-white block">Top-Up Amount (INR)</label>
              <div className="grid grid-cols-3 gap-2">
                {[1000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopupAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold font-mono border transition-all ${
                      topupAmount === amt
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    +₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsTopupModalOpen(true)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-glow-cyan transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Top-Up Wallet via Official Razorpay</span>
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Wallet Governance & Security
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              PayPilot Prepaid Wallet enforces strict database verification on every order. If your wallet balance is insufficient for a purchase, transactions are automatically blocked with clear shortfall alerts.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: ORDER HISTORY */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Your Order Receipts & History</h3>
            <button onClick={fetchOrders} className="text-xs text-brand-400 hover:underline flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Orders</span>
            </button>
          </div>

          {isLoadingOrders ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading order history...</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center glass-card rounded-2xl border border-white/10 space-y-2">
              <Package className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-xs font-bold text-white">No orders found yet</h4>
              <p className="text-xs text-slate-400">Start shopping on AI Storefront to create your first order!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">{o.receipt || o.id}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                        {o.status}
                      </span>
                      <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                        🏪 {o.merchantName || 'PayPilot Official Store'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Order ID: {o.id} • Date: {new Date(o.createdAt).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-slate-300">
                      Total Paid: <strong className="text-emerald-400 font-mono">₹{(o.amountRupees || Number(o.amountPaise) / 100).toLocaleString('en-IN')}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LANGUAGE SELECTION */}
      {activeTab === 'language' && (
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              Language & Voice Assistant Preferences (भाषा चयन)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select your preferred language. The AI Assistant and Web Speech voice engine will speak and respond in your chosen language.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleLanguageChange('en')}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                language === 'en'
                  ? 'bg-cyan-600/20 border-cyan-400 text-white shadow-glow-cyan'
                  : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <div>
                <span className="text-lg font-bold block text-white">English</span>
                <span className="text-xs text-slate-400 mt-1 block">Default system language</span>
              </div>
              {language === 'en' && <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-4" />}
            </button>

            <button
              onClick={() => handleLanguageChange('hi')}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                language === 'hi'
                  ? 'bg-amber-600/20 border-amber-400 text-white shadow-glow-cyan'
                  : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <div>
                <span className="text-lg font-bold block text-white">हिंदी (Hindi)</span>
                <span className="text-xs text-slate-400 mt-1 block">हिंदी भाषा एवं वॉयस असिस्टेंट</span>
              </div>
              {language === 'hi' && <CheckCircle2 className="w-5 h-5 text-amber-400 mt-4" />}
            </button>

            <button
              onClick={() => handleLanguageChange('mr')}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                language === 'mr'
                  ? 'bg-emerald-600/20 border-emerald-400 text-white shadow-glow-cyan'
                  : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <div>
                <span className="text-lg font-bold block text-white">मराठी (Marathi)</span>
                <span className="text-xs text-slate-400 mt-1 block">मराठी भाषा आणि व्हॉइस असिस्टंट</span>
              </div>
              {language === 'mr' && <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-4" />}
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: TRACK 01 AUDIT TRAIL & GUARDRAILS */}
      {activeTab === 'audit' && (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
          {/* Hackathon Track 01 Banner */}
          <div className="glass-panel rounded-2xl p-6 border border-amber-500/30 space-y-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 font-mono">
                  Track 01: AI Growth & Agentic Commerce
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Money Actions Audit Trail & Bounded Guardrails
                </h3>
              </div>
              <a
                href="/api/agent/catalog"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
              >
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Agent Catalog (ACP / UAP Schema)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Three Pillar Compliance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1.5">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Bounded & Gated
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Every order is validated against merchant policy limits (Max ₹100,000) and signed with PostgreSQL HMAC SHA256 hashes.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1.5">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  100% Explainable
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  All money events (`PAYMENT_VERIFIED`, `WALLET_PAYMENT_SUCCESS`) log correlation IDs and actor types in `audit_events`.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1.5">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Graceful Failure Recovery
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Insufficient funds calculate exact shortfall (`₹required` - `₹balance`) and provide 1-click Razorpay top-up recovery.
                </p>
              </div>
            </div>
          </div>

          {/* Audit Events Stream */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Live Money Actions Audit Log (PostgreSQL DB)
              </h4>
              <button
                type="button"
                onClick={fetchAuditEvents}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {isLoadingAudit ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading live audit events...</div>
            ) : auditEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No audit events recorded yet. Perform a checkout or top-up!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-mono text-[10px]">
                      <th className="pb-2">EVENT TYPE</th>
                      <th className="pb-2">ACTOR TYPE</th>
                      <th className="pb-2">REQUEST ID</th>
                      <th className="pb-2">TIMESTAMP</th>
                      <th className="pb-2 text-right">AUDIT DATA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {auditEvents.map((evt: any) => (
                      <tr key={evt.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 pr-3 font-bold text-amber-300">
                          {evt.eventType}
                        </td>
                        <td className="py-3 pr-3 text-slate-300">
                          {evt.actorType}
                        </td>
                        <td className="py-3 pr-3 text-slate-400 text-[10px]">
                          {evt.requestId || 'req_system'}
                        </td>
                        <td className="py-3 pr-3 text-slate-400 text-[10px]">
                          {new Date(evt.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3 text-right font-sans">
                          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                            {JSON.stringify(evt.data || {}).slice(0, 45)}...
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Razorpay Top-Up Modal */}
      {token && (
        <RazorpayModal
          isOpen={isTopupModalOpen}
          onClose={() => setIsTopupModalOpen(false)}
          orderId={`topup_${Date.now()}`}
          razorpayOrderId=""
          amountInr={topupAmount}
          token={token}
          mode="topup"
          onTopupSuccess={() => {
            refreshUser();
            setIsTopupModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
