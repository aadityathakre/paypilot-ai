import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface CartItem {
  id: string;
  productId: string;
  product: {
    id: string;
    sku: string;
    name: string;
    category: string;
    imageUrl: string | null;
    stock: number;
  };
  quantity: number;
  unitPriceInr: number;
  totalPriceInr: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotalInr: number;
  totalInr: number;
}

interface CartContextType {
  cart: Cart | null;
  itemCount: number;
  subtotalInr: number;
  totalInr: number;
  loading: boolean;
  addItem: (productId: string, quantity?: number) => Promise<boolean>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<boolean>;
  removeItem: (cartItemId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshCart = async () => {
    if (!token) {
      setCart(null);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/carts/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.cart) {
        setCart(data.data.cart);
      }
    } catch (err) {
      console.error('Error refreshing cart:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [token]);

  const addItem = async (productId: string, quantity = 1): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/carts/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();
      if (data.success && data.data?.cart) {
        setCart(data.data.cart);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error adding to cart:', err);
      return false;
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`/api/carts/items/${cartItemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      if (data.success && data.data?.cart) {
        setCart(data.data.cart);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating item quantity:', err);
      return false;
    }
  };

  const removeItem = async (cartItemId: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`/api/carts/items/${cartItemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.cart) {
        setCart(data.data.cart);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error removing item from cart:', err);
      return false;
    }
  };

  const clearCart = async (): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/carts', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.cart) {
        setCart(data.data.cart);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error clearing cart:', err);
      return false;
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount: cart?.itemCount || 0,
        subtotalInr: cart?.subtotalInr || 0,
        totalInr: cart?.totalInr || 0,
        loading,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
