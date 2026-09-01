import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { CartProvider } from './context/CartContext.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { ProtectedRoute } from './components/auth/ProtectedRoute.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { OrderSuccessPage } from './pages/OrderSuccessPage.tsx';
import { CustomerOrdersPage } from './pages/CustomerOrdersPage.tsx';
import { MerchantDashboardPage } from './pages/MerchantDashboardPage.tsx';
import { MerchantProductsPage } from './pages/MerchantProductsPage.tsx';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 font-sans selection:bg-brand-500 selection:text-white">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Storefront & Customer Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order-success" element={<OrderSuccessPage />} />
                
                {/* Customer Orders Route */}
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute allowedRoles={['CUSTOMER', 'MERCHANT', 'ADMIN']}>
                      <CustomerOrdersPage />
                    </ProtectedRoute>
                  }
                />

                {/* Merchant Studio Routes (Strictly Guarded) */}
                <Route
                  path="/merchant"
                  element={
                    <ProtectedRoute allowedRoles={['MERCHANT', 'ADMIN']}>
                      <MerchantDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/merchant/products"
                  element={
                    <ProtectedRoute allowedRoles={['MERCHANT', 'ADMIN']}>
                      <MerchantProductsPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
            <AuthModal />
          </div>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
