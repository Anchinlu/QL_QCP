// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FaUser, FaHistory, FaSignOutAlt } from 'react-icons/fa';
import '../Profile.css';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('history'); // Mặc định vào tab lịch sử
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Kiểm tra đăng nhập và lấy dữ liệu
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      fetchOrders();
    }
  }, [user, navigate]);

  // Gọi API lấy lịch sử đơn hàng
  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/my-orders');
      setOrders(res.data);
    } catch (error) {
      console.error("Lỗi lấy đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Hàm render trạng thái tiếng Việt
  const renderStatus = (status) => {
    switch(status) {
      case 'pending': return <span className="status-badge status-pending">Đang chờ duyệt</span>;
      case 'preparing': return <span className="status-badge status-preparing">Đang pha chế</span>;
      case 'shipping': return <span className="status-badge status-shipping">Đang giao hàng</span>;
      case 'completed': return <span className="status-badge status-completed">Hoàn thành</span>;
      case 'cancelled': return <span className="status-badge status-cancelled">Đã hủy</span>;
      default: return <span>{status}</span>;
    }
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <Navbar />

      <div className="profile-container">
        {/* SIDEBAR TRÁI */}
        <aside className="profile-sidebar">
          <div className="profile-avatar-large">
            <FaUser />
          </div>
          <h2 className="profile-name">{user.name}</h2>
          <p className="profile-email">{user.email}</p>

          <div className="profile-menu">
            <button 
              className={`menu-btn ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <FaUser /> Thông tin tài khoản
            </button>
            <button 
              className={`menu-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <FaHistory /> Lịch sử đơn hàng
            </button>
            <button className="menu-btn" onClick={logout} style={{color: '#e74c3c'}}>
              <FaSignOutAlt /> Đăng xuất
            </button>
          </div>
        </aside>

        {/* CONTENT PHẢI */}
        <main className="profile-content">
          
          {/* TAB 1: THÔNG TIN */}
          {activeTab === 'info' && (
            <div className="tab-pane">
              <h2 className="content-title">Thông tin cá nhân</h2>
              <form>
                <div className="info-row">
                  <div className="info-group">
                    <label>Họ và tên</label>
                    <input type="text" className="info-input" value={user.name} readOnly />
                  </div>
                  <div className="info-group">
                    <label>Số điện thoại</label>
                    <input type="text" className="info-input" value={user.phone || 'Chưa cập nhật'} readOnly />
                  </div>
                </div>
                <div className="info-group">
                  <label>Email</label>
                  <input type="text" className="info-input" value={user.email} readOnly />
                </div>
                <div className="info-group" style={{marginTop: '20px'}}>
                  <label>Địa chỉ giao hàng mặc định</label>
                  <input type="text" className="info-input" value={user.address || 'Chưa cập nhật'} readOnly />
                </div>
                <p style={{marginTop: '20px', fontSize: '0.9rem', color: '#888', fontStyle: 'italic'}}>
                  * Để thay đổi thông tin, vui lòng liên hệ bộ phận CSKH hoặc chờ bản cập nhật sau.
                </p>
              </form>
            </div>
          )}

          {/* TAB 2: LỊCH SỬ ĐƠN HÀNG */}
          {activeTab === 'history' && (
            <div className="tab-pane">
              <h2 className="content-title">Đơn hàng của tôi</h2>
              
              {loading ? (
                <p>Đang tải dữ liệu...</p>
              ) : orders.length === 0 ? (
                <div style={{textAlign: 'center', color: '#888', padding: '50px'}}>
                  <img src="https://cdn-icons-png.flaticon.com/512/2038/2038854.png" width="80" alt="No orders" style={{opacity: 0.5}}/>
                  <p style={{marginTop: '20px', fontSize: '1.1rem'}}>Bạn chưa có đơn hàng nào.</p>
                </div>
              ) : (
                <div className="order-list">
                  {orders.map(order => (
                    <div key={order.id} className="order-card">
                      <div className="order-header">
                        <div>
                          <span className="order-id">Đơn hàng #{order.id}</span>
                          <span style={{margin: '0 10px', color: '#ccc'}}>|</span>
                          <span className="order-date">{formatDate(order.created_at)}</span>
                        </div>
                        {renderStatus(order.status)}
                      </div>

                      <div className="order-items">
                        {order.items && order.items.map((item, idx) => (
                          <div key={idx} className="order-item-row">
                             <span><b>{item.quantity}x</b> {item.product_name}</span>
                             <span>{formatPrice(item.price)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="order-footer">
                        <span className="total-label">Thanh toán bằng {order.payment_method}</span>
                        <span className="total-val">{formatPrice(order.total_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
      <Footer />
    </div>
  );
};

export default ProfilePage;