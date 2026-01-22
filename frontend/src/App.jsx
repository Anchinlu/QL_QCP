// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import AuthPage from './pages/AuthPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext'; 
import CartSidebar from './components/CartSidebar';

// --- THÊM PHẦN NÀY ---
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// ---------------------

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          {/* Component này sẽ hiển thị thông báo */}
          <ToastContainer 
            position="top-right" 
            autoClose={3000} 
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />

          <CartSidebar />
          
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/orders" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;