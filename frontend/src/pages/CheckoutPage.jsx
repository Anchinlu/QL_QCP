import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../services/api';
import '../Checkout.css'; 

const CheckoutPage = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [info, setInfo] = useState({
    name: '',
    phone: '',
    address: '',
    note: ''
  });

  const [paymentMethod, setPaymentMethod] = useState('COD'); 

  useEffect(() => {
    if (user) {
      setInfo({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        note: ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/menu');
    }
  }, [cartItems, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Vui lòng đăng nhập để đặt hàng!");
      navigate('/login');
      return;
    }
    try {
      const orderData = {
        userId: user.id,
        customerName: info.name,
        phone: info.phone,
        address: info.address,
        note: info.note,
        totalAmount: cartTotal,
        paymentMethod: paymentMethod,
        items: cartItems
      };
      await api.post('/orders/create', orderData);
      alert("🎉 Đặt hàng thành công! Chúng tôi sẽ liên hệ sớm nhất.");
      clearCart(); 
      navigate('/'); 
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra, vui lòng thử lại.");
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="checkout-page">
      <Navbar />
      
      <div className="checkout-container">
        <div className="checkout-header">
            <h1>Xác nhận đơn hàng</h1>
            <p>Hoàn tất bước cuối cùng để thưởng thức món ngon</p>
        </div>
        
        <form className="checkout-grid" onSubmit={handleSubmit}>
          {/* CỘT TRÁI: THÔNG TIN & THANH TOÁN */}
          <div className="checkout-left">
            
            {/* Box 1: Địa chỉ */}
            <div className="card-box">
              <h3 className="card-title">📍 Địa chỉ nhận hàng</h3>
              <div className="form-row">
                 <div className="form-group half">
                    <label>Tên người nhận</label>
                    <input 
                      type="text" 
                      placeholder="VD: Minh Nhật"
                      value={info.name} 
                      onChange={(e) => setInfo({...info, name: e.target.value})} 
                      required 
                    />
                 </div>
                 <div className="form-group half">
                    <label>Số điện thoại</label>
                    <input 
                      type="text" 
                      placeholder="VD: 0909..."
                      value={info.phone} 
                      onChange={(e) => setInfo({...info, phone: e.target.value})} 
                      required 
                    />
                 </div>
              </div>
              <div className="form-group">
                  <label>Địa chỉ chi tiết</label>
                  <input 
                    type="text" 
                    placeholder="Số nhà, đường, phường/xã..."
                    value={info.address} 
                    onChange={(e) => setInfo({...info, address: e.target.value})} 
                    required 
                  />
              </div>
              <div className="form-group">
                  <label>Ghi chú (Tùy chọn)</label>
                  <input 
                    type="text"
                    placeholder="VD: Ít đá, không trân châu..."
                    value={info.note} 
                    onChange={(e) => setInfo({...info, note: e.target.value})} 
                  />
              </div>
            </div>

            {/* Box 2: Thanh toán */}
            <div className="card-box">
              <h3 className="card-title">💳 Phương thức thanh toán</h3>
              <div className="payment-list">
                
                {/* Option COD */}
                <div 
                    className={`payment-item ${paymentMethod === 'COD' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('COD')}
                >
                    <div className="radio-circle"></div>
                    <div className="pay-icon">💵</div>
                    <div className="pay-text">
                        <strong>Tiền mặt (COD)</strong>
                        <span>Thanh toán khi nhận hàng</span>
                    </div>
                </div>

                {/* Option Banking */}
                <div 
                    className={`payment-item ${paymentMethod === 'BANKING' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('BANKING')}
                >
                    <div className="radio-circle"></div>
                    <div className="pay-icon">🏦</div>
                    <div className="pay-text">
                        <strong>Chuyển khoản ngân hàng</strong>
                        <span>VietQR, Momo, ZaloPay</span>
                    </div>
                </div>
              </div>

              {/* QR Code Section */}
              {paymentMethod === 'BANKING' && (
                <div className="banking-preview">
                   <p>Quét mã để thanh toán nhanh:</p>
                   <div className="qr-wrapper">
                        <img 
                            src={`https://img.vietqr.io/image/MB-0358902347-compact2.jpg?amount=${cartTotal}&addInfo=Thanh toan don hang Chinlu`} 
                            alt="QR Code" 
                        />
                   </div>
                   <div className="bank-note">
                       Nội dung: <b>Tên + SĐT</b>
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
          <div className="checkout-right">
            <div className="order-summary-card">
              <h3>Đơn hàng ({cartItems.length} món)</h3>
              
              <div className="summary-list">
                {cartItems.map((item) => (
                  <div key={item.id} className="summary-item">
                    <div className="item-img">
                        <img src={item.image} alt={item.name} />
                        <span className="item-qty">{item.quantity}</span>
                    </div>
                    <div className="item-info">
                        <h4>{item.name}</h4>
                        <p>{formatPrice(item.price)}</p>
                    </div>
                    <div className="item-total-price">
                        {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="summary-divider"></div>

              <div className="price-row">
                  <span>Tạm tính</span>
                  <span>{formatPrice(cartTotal)}</span>
              </div>
              <div className="price-row">
                  <span>Phí giao hàng</span>
                  <span className="free-ship">Miễn phí</span>
              </div>
              
              <div className="summary-divider"></div>
              
              <div className="total-row">
                <span>Tổng thanh toán</span>
                <span className="final-price">{formatPrice(cartTotal)}</span>
              </div>
              
              <button type="submit" className="btn-confirm">
                Đặt Hàng Ngay
              </button>
            </div>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default CheckoutPage;