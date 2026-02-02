import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  FaUser, FaHistory, FaSignOutAlt, FaCalendarCheck, 
  FaMapMarkerAlt, FaUtensils, FaFilter, FaSearch 
} from 'react-icons/fa';
import '../Profile.css';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State quản lý Tabs
  const [activeTab, setActiveTab] = useState('bookings'); // 'info' | 'bookings' | 'orders'
  
  // State dữ liệu
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // State bộ lọc (Filter)
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      // Reset filter khi đổi tab
      setStatusFilter('all');
      
      if (activeTab === 'orders') fetchOrders();
      if (activeTab === 'bookings') fetchBookings();
    }
  }, [user, navigate, activeTab]);

  // --- API HELPER ---
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders/my-orders');
      setOrders(res.data);
    } catch (error) {
      console.error("Lỗi lấy đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/my-bookings');
      setBookings(res.data);
    } catch (error) {
      console.error("Lỗi lấy đặt bàn:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC LỌC DỮ LIỆU ---
  const filterData = (dataList, type) => {
    if (statusFilter === 'all') return dataList;

    return dataList.filter(item => {
      const s = item.status;
      if (type === 'booking') {
        if (statusFilter === 'pending') return s === 'pending';
        if (statusFilter === 'confirmed') return s === 'confirmed' || s === 'reserved';
        if (statusFilter === 'completed') return s === 'completed';
        if (statusFilter === 'cancelled') return s === 'cancelled';
      }
      if (type === 'order') {
        if (statusFilter === 'pending') return s === 'pending';
        if (statusFilter === 'processing') return s === 'preparing' || s === 'shipping';
        if (statusFilter === 'completed') return s === 'completed';
        if (statusFilter === 'cancelled') return s === 'cancelled';
      }
      return true;
    });
  };

  // Format Helpers
  const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Render Status Badge
  const renderStatus = (status) => {
    const statusMap = {
      pending: { text: 'Chờ duyệt', class: 'status-pending' },
      preparing: { text: 'Đang chuẩn bị', class: 'status-preparing' },
      shipping: { text: 'Đang giao', class: 'status-shipping' },
      completed: { text: 'Hoàn thành', class: 'status-completed' },
      cancelled: { text: 'Đã hủy', class: 'status-cancelled' },
      reserved: { text: 'Đang giữ chỗ', class: 'status-preparing' },
      confirmed: { text: 'Đã xác nhận', class: 'status-completed' }
    };
    const s = statusMap[status] || { text: status, class: 'status-pending' };
    return <span className={`status-badge ${s.class}`}>{s.text}</span>;
  };

  // Component Bộ Lọc UI
  const FilterTabs = ({ type }) => {
    const filters = type === 'booking' 
      ? [
          { key: 'all', label: 'Tất cả' },
          { key: 'pending', label: 'Chờ xác nhận' },
          { key: 'confirmed', label: 'Đã xác nhận' },
          { key: 'completed', label: 'Hoàn thành' },
          { key: 'cancelled', label: 'Đã hủy' },
        ]
      : [
          { key: 'all', label: 'Tất cả' },
          { key: 'pending', label: 'Chờ duyệt' },
          { key: 'processing', label: 'Đang xử lý' },
          { key: 'completed', label: 'Hoàn thành' },
          { key: 'cancelled', label: 'Đã hủy' },
        ];

    return (
      <div className="filter-tabs-container">
        {filters.map(f => (
          <button
            key={f.key}
            className={`filter-tab-btn ${statusFilter === f.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
    );
  };

  if (!user) return null;

  // Lấy danh sách đã lọc
  const filteredBookings = filterData(bookings, 'booking');
  const filteredOrders = filterData(orders, 'order');

  return (
    <div className="profile-page">
      <Navbar />

      <div className="profile-container">
        {/* SIDEBAR TRÁI */}
        <aside className="profile-sidebar">
          <div className="profile-avatar-large">
            <FaUser />
          </div>
          <h2 className="profile-name">{user.full_name || user.name}</h2>
          <p className="profile-email">{user.email}</p>

          <div className="profile-menu">
            <button 
              className={`menu-btn ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <FaUser /> Thông tin tài khoản
            </button>
            <button 
              className={`menu-btn ${activeTab === 'bookings' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookings')}
            >
              <FaCalendarCheck /> Lịch sử Đặt bàn
            </button>
            <button 
              className={`menu-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <FaHistory /> Lịch sử Đơn hàng
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
                    <input type="text" className="info-input" value={user.full_name || user.name} readOnly />
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
              </form>
            </div>
          )}

          {/* TAB 2: LỊCH SỬ ĐẶT BÀN (BOOKINGS) */}
          {activeTab === 'bookings' && (
            <div className="tab-pane">
              <h2 className="content-title">Lịch sử Đặt bàn</h2>
              
              {/* BỘ LỌC BOOKING */}
              <FilterTabs type="booking" />

              {loading ? (
                <p className="text-center py-4">Đang tải dữ liệu...</p>
              ) : filteredBookings.length === 0 ? (
                <div className="empty-state">
                   <p>Không tìm thấy lịch đặt bàn nào.</p>
                </div>
              ) : (
                <div className="order-list">
                  {filteredBookings.map(booking => (
                    <div key={booking.id} className="order-card booking-card">
                      <div className="order-header">
                        <div>
                          <span className="order-id">
                            <FaCalendarCheck style={{marginRight: '5px'}}/> 
                            Bàn {booking.table_number}
                          </span>
                          <div className="branch-info">
                             <FaMapMarkerAlt /> {booking.branch_name}
                          </div>
                          <div className="branch-addr">
                             {booking.branch_address}
                          </div>
                        </div>
                        <div className="text-right">
                           {renderStatus(booking.status)}
                           <div className="order-date">
                              {formatDate(booking.booking_time)}
                           </div>
                        </div>
                      </div>

                      <div className="order-items">
                         <div className="booking-details">
                            <span>👥 <b>Khách:</b> {booking.guest_count} người</span>
                            {booking.note && <span>📝 <b>Ghi chú:</b> {booking.note}</span>}
                         </div>

                         {booking.items && booking.items.length > 0 && (
                           <div className="pre-order-items">
                              <div className="item-title"><FaUtensils /> Món gọi trước:</div>
                              {booking.items.map((item, idx) => (
                                <div key={idx} className="order-item-row">
                                   <span><b>{item.quantity}x</b> {item.name || item.product_name}</span>
                                   <span>{formatPrice(item.price)}</span>
                                </div>
                              ))}
                           </div>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LỊCH SỬ ĐƠN HÀNG (ORDERS) */}
          {activeTab === 'orders' && (
            <div className="tab-pane">
              <h2 className="content-title">Đơn mua về</h2>
              
              {/* BỘ LỌC ORDER */}
              <FilterTabs type="order" />

              {loading ? (
                <p className="text-center py-4">Đang tải dữ liệu...</p>
              ) : filteredOrders.length === 0 ? (
                <div className="empty-state">
                  <p>Không tìm thấy đơn hàng nào.</p>
                </div>
              ) : (
                <div className="order-list">
                  {filteredOrders.map(order => (
                    <div key={order.id} className="order-card">
                      <div className="order-header">
                        <div>
                          <span className="order-id">Đơn hàng #{order.id}</span>
                          <span className="divider">|</span>
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
                        <span className="total-label">Thanh toán: {order.payment_method}</span>
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