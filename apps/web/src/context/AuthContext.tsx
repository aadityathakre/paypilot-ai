import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
  merchant?: {
    id: string;
    name: string;
    currency: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role?: 'CUSTOMER' | 'MERCHANT') => Promise<boolean>;
  quickLoginAs: (role: 'CUSTOMER' | 'MERCHANT') => Promise<boolean>;
  logout: () => void;
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
    return localStorage.getItem('paypilot_token') || null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Auto initialize demo customer if no active session
  useEffect(() => {
    if (!token) {
      quickLoginAs('CUSTOMER');
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.data?.token) {
        setUser(data.data.user);
        setToken(data.data.token);
        localStorage.setItem('paypilot_user', JSON.stringify(data.data.user));
        localStorage.setItem('paypilot_token', data.data.token);
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
      if (data.success && data.data?.token) {
        setUser(data.data.user);
        setToken(data.data.token);
        localStorage.setItem('paypilot_user', JSON.stringify(data.data.user));
        localStorage.setItem('paypilot_token', data.data.token);
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
    if (role === 'CUSTOMER') {
      return login('customer@paypilot.ai', 'CustomerPass@123');
    } else {
      return login('merchant@paypilot.ai', 'MerchantPass@123');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('paypilot_user');
    localStorage.removeItem('paypilot_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isAuthModalOpen,
        login,
        register,
        quickLoginAs,
        logout,
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
