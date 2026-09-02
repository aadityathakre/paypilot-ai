import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Shield, AlertCircle, Sparkles, Key, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register, quickLoginAs } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'MERCHANT'>('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot password OTP states
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    let success = false;
    if (tab === 'login') {
      success = await login(email, password);
      if (!success) setError('Invalid email or password. Please try again.');
    } else if (tab === 'register') {
      success = await register(name, email, password, role);
      if (!success) setError('Registration failed. Email may already be in use.');
    }
    setLoading(false);
  };

  const handleRequestForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setForgotStep(2);
        setSuccessMsg(`6-Digit OTP sent via Nodemailer from team.aditya.invincible@gmail.com to ${email}. Code valid for 5 minutes!`);
      } else {
        setError(json.message || 'Failed to send password reset OTP.');
      }
    } catch {
      setError('Network error requesting OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !forgotOtp || !newPassword) {
      setError('Email, 6-digit OTP code, and new password are required.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpCode: forgotOtp, newPassword }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg('Password updated successfully in PostgreSQL database! Logging you in...');
        setTimeout(async () => {
          await login(email, newPassword);
        }, 1200);
      } else {
        setError(json.message || 'Invalid or expired OTP code.');
      }
    } catch {
      setError('Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (selectedRole: 'CUSTOMER' | 'MERCHANT') => {
    setLoading(true);
    setError(null);
    const success = await quickLoginAs(selectedRole);
    if (!success) setError('Quick login failed.');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/15 shadow-2xl relative space-y-5">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PayPilot Authentication</span>
          </div>
          <h2 className="text-xl font-bold text-white">
            {tab === 'login' ? 'Welcome Back' : tab === 'register' ? 'Create Account' : 'Forgot Password (OTP)'}
          </h2>
          <p className="text-xs text-slate-400">
            Sign in to access AI assistant, cart management & policy controls
          </p>
        </div>

        {/* 1-Click Quick Demo Switcher */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            1-Click Demo Profiles
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickLogin('CUSTOMER')}
              disabled={loading}
              className="p-2.5 rounded-lg bg-slate-800 hover:bg-brand-500/20 hover:border-brand-500/40 border border-white/10 text-left transition-all text-xs group"
            >
              <div className="font-semibold text-white group-hover:text-brand-300 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Demo Customer</span>
              </div>
              <span className="text-[10px] text-slate-400">customer@paypilot.ai</span>
            </button>

            <button
              onClick={() => handleQuickLogin('MERCHANT')}
              disabled={loading}
              className="p-2.5 rounded-lg bg-slate-800 hover:bg-purple-500/20 hover:border-purple-500/40 border border-white/10 text-left transition-all text-xs group"
            >
              <div className="font-semibold text-white group-hover:text-purple-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Demo Merchant</span>
              </div>
              <span className="text-[10px] text-slate-400">merchant@paypilot.ai</span>
            </button>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 border border-white/5 text-xs">
          <button
            onClick={() => {
              setTab('login');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              tab === 'login'
                ? 'bg-brand-500 text-white shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab('register');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              tab === 'register'
                ? 'bg-brand-500 text-white shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        {tab !== 'forgot' ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === 'register' && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white placeholder-slate-500 focus:border-brand-400 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white placeholder-slate-500 focus:border-brand-400 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-medium text-slate-300">Password</label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setForgotStep(1);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[10px] text-brand-400 hover:underline font-semibold"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white placeholder-slate-500 focus:border-brand-400 outline-none"
                />
              </div>
            </div>

            {tab === 'register' && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Account Type</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRole('CUSTOMER')}
                    className={`py-2 px-3 rounded-lg border text-left font-medium transition-all ${
                      role === 'CUSTOMER'
                        ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                        : 'bg-slate-900 border-white/10 text-slate-400'
                    }`}
                  >
                    Customer (Shopper)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('MERCHANT')}
                    className={`py-2 px-3 rounded-lg border text-left font-medium transition-all ${
                      role === 'MERCHANT'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-slate-900 border-white/10 text-slate-400'
                    }`}
                  >
                    Merchant (Seller)
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-cyan transition-all disabled:opacity-50 mt-2"
            >
              {loading
                ? 'Processing...'
                : tab === 'login'
                ? 'Sign In to PayPilot'
                : 'Create Account'}
            </button>
          </form>
        ) : (
          /* Forgot Password OTP Form */
          <div className="space-y-4">
            {forgotStep === 1 ? (
              <form onSubmit={handleRequestForgotOtp} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Enter Your Registered Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white placeholder-slate-500 focus:border-brand-400 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-glow-indigo transition-all"
                >
                  {loading ? 'Sending OTP Code...' : 'Send 6-Digit Reset OTP via Nodemailer'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordWithOtp} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">6-Digit OTP Code (Sent via Email)</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="e.g. 482910"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-purple-500/50 text-xs font-mono font-bold text-emerald-400 placeholder-slate-500 focus:border-purple-400 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white placeholder-slate-500 focus:border-brand-400 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || forgotOtp.length !== 6}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-glow-cyan transition-all"
                >
                  {loading ? 'Verifying OTP & Resetting...' : 'Confirm OTP & Reset Password'}
                </button>
              </form>
            )}

            <button
              onClick={() => {
                setTab('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-slate-400 hover:text-white underline w-full text-center block"
            >
              ← Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
