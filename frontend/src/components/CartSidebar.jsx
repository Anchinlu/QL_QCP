import React from 'react';
import { FaTimes, FaTrash, FaMinus, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom'; // 1. Import hook chuyển trang
import { useCart } from '../context/CartContext';
import '../Home.css';

const CartSidebar = () => {
  const navigate = useNavigate(); // 2. Khởi tạo hook
  const { 
    isCartOpen, 
    setIsCartOpen, 
    cartItems, 
    removeFromCart, 
    updateQuantity, 
    cartTotal 
  } = useCart();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // 3. Hàm xử lý khi bấm Thanh Toán
  const handleCheckout = () => {
    setIsCartOpen(false); // Đóng thanh bên lại cho gọn
    navigate('/checkout'); // Chuyển sang trang thanh toán
  };

  return (
    <>
      {/* Màn đen mờ che phía sau */}
      <div 
        className={`overlay ${isCartOpen ? 'open' : ''}`} 
        onClick={() => setIsCartOpen(false)}
      ></div>

      {/* Sidebar chính */}
      <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h3>Giỏ hàng của bạn ({cartItems.length} món)</h3>
          <button className="btn-close" onClick={() => setIsCartOpen(false)}>
            <FaTimes />
          </button>
        </div>

        <div className="cart-body">
          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <img src="https://cdn-icons-png.flaticon.com/512/11329/11329060.png" alt="Empty" width="100" />
              <p>Chưa có món nào cả...</p>
              <button className="btn-shop-now" onClick={() => setIsCartOpen(false)}>Mua ngay</button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} />
                <div className="item-details">
                  <h4>{item.name}</h4>
                  <div className="item-price">{formatPrice(item.price)}</div>
                  
                  <div className="quantity-controls">
                    <button onClick={() => updateQuantity(item.id, -1)}><FaMinus /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}><FaPlus /></button>
                  </div>
                </div>
                <button className="btn-remove" onClick={() => removeFromCart(item.id)}>
                  <FaTrash />
                </button>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="total-row">
              <span>Tổng cộng:</span>
              <span className="total-price">{formatPrice(cartTotal)}</span>
            </div>
            
            {/* 4. Gắn hàm xử lý vào nút thanh toán */}
            <button className="btn-checkout" onClick={handleCheckout}>
                Thanh Toán Ngay
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;