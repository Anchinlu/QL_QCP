import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('cartItems');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product) => {
    // Kiểm tra tồn kho trước khi thêm
    if (!product.stock_quantity || product.stock_quantity <= 0) {
      toast.error(`Xin lỗi, "${product.name}" đã hết hàng!`);
      return;
    }

    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === product.id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;
        
        // Kiểm tra tổng số lượng có vượt quá tồn kho không
        if (newQuantity > product.stock_quantity) {
          toast.error(`Xin lỗi, "${product.name}" chỉ còn ${product.stock_quantity} phần!`);
          return prev; // Không thay đổi giỏ hàng
        }
        
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: newQuantity } : item
        );
      }
      
      // Kiểm tra cho sản phẩm mới
      if (1 > product.stock_quantity) {
        toast.error(`Xin lỗi, "${product.name}" chỉ còn ${product.stock_quantity} phần!`);
        return prev;
      }
      
      return [...prev, { ...product, quantity: 1 }];
    });
    
    setIsCartOpen(true);
    toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
  };

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id, amount) => {
    setCartItems((prev) => 
      prev.map((item) => {
        if (item.id === id) {
          const newQuantity = item.quantity + amount;
          
          // Kiểm tra không cho phép giảm xuống 0 hoặc âm
          if (newQuantity <= 0) {
            return item;
          }
          
          // Kiểm tra tồn kho
          if (item.stock_quantity && newQuantity > item.stock_quantity) {
            toast.error(`Xin lỗi, "${item.name}" chỉ còn ${item.stock_quantity} phần!`);
            return item; // Giữ nguyên số lượng cũ
          }
          
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cartItems');
  };

  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cartItems, 
      addToCart, 
      removeFromCart, 
      updateQuantity,
      clearCart,
      cartTotal, 
      cartCount,
      isCartOpen, 
      setIsCartOpen 
    }}>
      {children}
    </CartContext.Provider>
  );
};