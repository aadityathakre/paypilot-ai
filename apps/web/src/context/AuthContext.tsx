import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
  walletBalanceInr?: number;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  emailVerified?: boolean;
  merchant?: {
    id: string;
    name: string;
    currency: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshTokenVal: string | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role?: 'CUSTOMER' | 'MERCHANT') => Promise<boolean>;
  quickLoginAs: (role: 'CUSTOMER' | 'MERCHANT') => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshAuthTokens: () => Promise<boolean>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('paypilot_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('paypilot_token') || localStorage.getItem('paypilot_access_token') || null;
  });

  const [refreshTokenVal, setRefreshTokenVal] = useState<string | null>(() => {
    return localStorage.getItem('paypilot_refresh_token') || null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Auto initialize demo customer only on first visit if user has not explicitly logged out
  useEffect(() => {
    const wasExplicitlyLoggedOut = localStorage.getItem('paypilot_logged_out') === 'true';
    if (!token && !wasExplicitlyLoggedOut) {
      quickLoginAs('CUSTOMER');
    }
  }, []);

  const refreshAuthTokens = async (): Promise<boolean> => {
    const rfToken = refreshTokenVal || localStorage.getItem('paypilot_refresh_token');
    if (!rfToken) return false;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rfToken }),
      });
      const data = await res.json();
      if (data.success && data.data?.accessToken) {
        const newAccess = data.data.accessToken;
        const newRefresh = data.data.refreshToken || rfToken;
        setToken(newAccess);
        setRefreshTokenVal(newRefresh);
        localStorage.setItem('paypilot_token', newAccess);
        localStorage.setItem('paypilot_access_token', newAccess);
        localStorage.setItem('paypilot_refresh_token', newRefresh);
        return true;
      }
    } catch (err) {
      console.error('Failed to refresh tokens:', err);
    }
    return false;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && (data.data?.token || data.data?.accessToken)) {
        const accToken = data.data.accessToken || data.data.token;
        const refToken = data.data.refreshToken || '';
        setUser(data.data.user);
        setToken(accToken);
        setRefreshTokenVal(refToken);
        localStorage.setItem('paypilot_user', JSON.stringify(data.data.user));
        localStorage.setItem('paypilot_token', accToken);
        localStorage.setItem('paypilot_access_token', accToken);
        if (refToken) localStorage.setItem('paypilot_refresh_token', refToken);
        localStorage.removeItem('paypilot_logged_out');
        setIsAuthModalOpen(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: 'CUSTOMER' | 'MERCHANT' = 'CUSTOMER'
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (data.success && (data.data?.token || data.data?.accessToken)) {
        const accToken = data.data.accessToken || data.data.token;
        const refToken = data.data.refreshToken || '';
        setUser(data.data.user);
        setToken(accToken);
        setRefreshTokenVal(refToken);
        localStorage.setItem('paypilot_user', JSON.stringify(data.data.user));
        localStorage.setItem('paypilot_token', accToken);
        localStorage.setItem('paypilot_access_token', accToken);
        if (refToken) localStorage.setItem('paypilot_refresh_token', refToken);
        localStorage.removeItem('paypilot_logged_out');
        setIsAuthModalOpen(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Register error:', err);
      return false;
    }
  };

  const quickLoginAs = async (role: 'CUSTOMER' | 'MERCHANT'): Promise<boolean> => {
    localStorage.removeItem('paypilot_logged_out');
    if (role === 'CUSTOMER') {
      return login('customer@paypilot.ai', 'CustomerPass@123');
    } else {
      return login('merchant@paypilot.ai', 'MerchantPass@123');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRefreshTokenVal(null);
    localStorage.removeItem('paypilot_user');
    localStorage.removeItem('paypilot_token');
    localStorage.removeItem('paypilot_access_token');
    localStorage.removeItem('paypilot_refresh_token');
    localStorage.setItem('paypilot_logged_out', 'true');
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      let res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        const refreshed = await refreshAuthTokens();
        if (refreshed) {
          const freshToken = localStorage.getItem('paypilot_token');
          res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${freshToken}` },
          });
        }
      }
      const data = await res.json();
      if (data.success && data.data?.user) {
        setUser(data.data.user);
        localStorage.setItem('paypilot_user', JSON.stringify(data.data.user));
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshTokenVal,
        isAuthenticated: !!user && !!token,
        isAuthModalOpen,
        login,
        register,
        quickLoginAs,
        logout,
        refreshUser,
        refreshAuthTokens,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
