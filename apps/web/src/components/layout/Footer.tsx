import React from 'react';
import { Shield, Sparkles, Terminal, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/5 bg-slate-950/60 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Column 1: Identity */}
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span className="font-semibold text-sm text-slate-200">PayPilot AI</span>
              <span className="text-xs px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
                v1.0.0-phase1
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              AI Growth & Agentic Commerce with Bounded Checkout. Built for Razorpay Buildathon.
            </p>
          </div>

          {/* Column 2: Guiding Principle */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-300">
            <Shield className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>
              <strong className="text-white">Safety Guarantee:</strong> LLM proposes recommendations; server-side deterministic policy engine gates money actions.
            </span>
          </div>

          {/* Column 3: Quick Links */}
          <div className="flex md:justify-end items-center gap-4 text-xs text-slate-400">
            <a
              href="/health"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-brand-400 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              API Diagnostics
            </a>
            <a
              href="https://razorpay.com/buildathon/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-brand-400 transition-colors"
            >
              <span>Buildathon Track 1</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
