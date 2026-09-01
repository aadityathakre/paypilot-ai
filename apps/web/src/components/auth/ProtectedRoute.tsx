import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'CUSTOMER' | 'MERCHANT' | 'ADMIN'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white font-sans">
        <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Access Restricted</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your active account role is <span className="font-bold text-brand-400">{user.role}</span>. You do not have permission to view this view.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <a
              href="/"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Storefront</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
