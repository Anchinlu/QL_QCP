import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  // Lấy dữ liệu từ LocalStorage nếu có (để F5 không mất giỏ hàng)
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('cartItems');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Lưu vào LocalStorage mỗi khi giỏ hàng thay đổi
  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  // 1. Hàm thêm vào giỏ
  const addToCart = (product) => {
    setCartItems((prev) => {
      // Kiểm tra xem món này đã có trong giỏ chưa
      const existingItem = prev.find((item) => item.id === product.id);
      if (existingItem) {
        // Nếu có rồi thì tăng số lượng lên 1
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      // Nếu chưa thì thêm mới với số lượng 1
      return [...prev, { ...product, quantity: 1 }];
    });
    // Mở giỏ hàng ra luôn cho khách thấy
    setIsCartOpen(true);
  };

  // 2. Hàm xóa khỏi giỏ
  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  // 3. Hàm tăng/giảm số lượng
  const updateQuantity = (id, amount) => {
    setCartItems((prev) => 
      prev.map((item) => {
        if (item.id === id) {
          const newQuantity = item.quantity + amount;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      })
    );
  };

  // 4. Hàm xóa sạch giỏ hàng (Dùng khi thanh toán thành công) -> MỚI THÊM
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cartItems');
  };

  // 5. Tính tổng tiền
  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  // 6. Tính tổng số lượng món (để hiện lên icon giỏ hàng)
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cartItems, 
      addToCart, 
      removeFromCart, 
      updateQuantity,
      clearCart, // Đừng quên xuất hàm này ra để dùng
      cartTotal, 
      cartCount,
      isCartOpen, 
      setIsCartOpen 
    }}>
      {children}
    </CartContext.Provider>
  );
};