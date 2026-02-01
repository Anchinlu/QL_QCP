import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FaLeaf, FaLemon, FaStore, FaCalendarAlt, FaClock, 
  FaUserFriends, FaChair, FaCommentDots, FaUtensils, FaCheckCircle 
} from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { branches } from '../data/branches';
import { useAuth } from '../context/AuthContext';
import '../Booking.css';

const MOCK_TABLES = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  label: `Bàn ${i + 1}`
}));

const BookingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    branchId: '',
    bookingDate: '',
    bookingTime: '',
    guestCount: 2,
    tableNumber: '',
    note: ''
  });

  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});

  useEffect(() => {
    if (!user) {
      toast.warning("Vui lòng đăng nhập để đặt bàn!");
      navigate('/auth');
      return;
    }

    axios.get('http://localhost:5001/api/products')
      .then(res => setProducts(res.data))
      .catch(err => console.error("Lỗi lấy menu:", err));
  }, [user, navigate]);

  // Handle Form Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle Chọn Món (+/-)
  const handleQuantityChange = (productId, change) => {
    setSelectedItems(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = currentQty + change;
      if (newQty <= 0) {
        const { [productId]: deleted, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  // Submit Đặt Bàn
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.branchId) return toast.error("Vui lòng chọn chi nhánh!");
    if (!formData.tableNumber) return toast.error("Vui lòng chọn bàn trên sơ đồ!");

    try {
      const fullDateTime = `${formData.bookingDate} ${formData.bookingTime}:00`;
      
      const itemsPayload = Object.keys(selectedItems).map(pId => {
        const product = products.find(p => p.id === parseInt(pId));
        return {
          id: product.id,
          price: product.price,
          quantity: selectedItems[pId]
        };
      });

      const payload = {
        branchId: formData.branchId,
        bookingTime: fullDateTime,
        guestCount: formData.guestCount,
        tableNumber: formData.tableNumber,
        note: formData.note,
        items: itemsPayload
      };

      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5001/api/bookings', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if(res.status === 201) {
        toast.success("🎉 Đặt bàn thành công! Mã đơn: #" + res.data.bookingId);
        navigate('/');
      }

    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Lỗi đặt bàn");
    }
  };

  return (
    <div className="booking-page">
      <Navbar />
      
      {/* --- PHẦN TRANG TRÍ (DECORATION ICONS) --- */}
      {/* Thêm nhiều icon bay lượn để trang web sinh động */}
      <div className="booking-decor-wrapper">
         <div className="floating-icon leaf-1"><FaLeaf /></div>
         <div className="floating-icon leaf-2"><FaLemon /></div>
         <div className="floating-icon leaf-3"><FaLeaf /></div>
         <div className="floating-icon leaf-4"><FaLeaf /></div>
         <div className="floating-icon leaf-5"><FaLemon /></div>
         <div className="floating-icon leaf-6"><FaLeaf /></div>
      </div>

      <div className="booking-container">
        {/* HEADER ĐƯỢC TRAU CHUỐT HƠN */}
        <div className="booking-header">
           <h1 className="page-title">📅 Đặt Bàn Trực Tuyến</h1>
           <p className="page-subtitle">Giữ chỗ ngay để thưởng thức trọn vẹn không gian & hương vị Chinlu</p>
        </div>
        
        <form onSubmit={handleSubmit} className="booking-layout">
          
          {/* === CỘT TRÁI: THÔNG TIN & SƠ ĐỒ === */}
          <div className="booking-info-card">
            <h3 className="card-title"><FaCheckCircle className="icon-title"/> 1. Thông tin đặt chỗ</h3>
            
            <div className="form-group">
              <label><FaStore className="input-icon"/> Chọn Quán</label>
              <select name="branchId" className="form-control" onChange={handleChange} required>
                <option value="">-- Chọn chi nhánh gần bạn --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} - {b.address}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><FaCalendarAlt className="input-icon"/> Ngày đến</label>
                <input type="date" name="bookingDate" className="form-control" onChange={handleChange} required/>
              </div>
              <div className="form-group">
                <label><FaClock className="input-icon"/> Giờ đến</label>
                <input type="time" name="bookingTime" className="form-control" onChange={handleChange} required/>
              </div>
            </div>

            <div className="form-group">
              <label><FaUserFriends className="input-icon"/> Số người</label>
              <input type="number" name="guestCount" className="form-control" min="1" max="20" value={formData.guestCount} onChange={handleChange} />
            </div>

            {/* SƠ ĐỒ BÀN */}
            <div className="form-group">
              <label><FaChair className="input-icon"/> Chọn vị trí ngồi ({formData.tableNumber ? `Đang chọn Bàn ${formData.tableNumber}` : 'Vui lòng chọn bàn'})</label>
              <div className="table-map-section">
                <div className="map-legend">
                  <div className="legend-item"><span className="box available"></span> Trống</div>
                  <div className="legend-item"><span className="box selected"></span> Đang chọn</div>
                  <div className="legend-item"><span className="box booked"></span> Đã đặt</div>
                </div>
                <div className="table-grid">
                  {MOCK_TABLES.map((table) => (
                    <div 
                      key={table.id}
                      className={`table-seat ${formData.tableNumber == table.id ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, tableNumber: table.id })}
                    >
                      <span>🍽️</span>
                      <span>{table.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label><FaCommentDots className="input-icon"/> Ghi chú thêm</label>
              <textarea name="note" className="form-control" rows="2" placeholder="VD: Trang trí sinh nhật, cần ghế trẻ em..." onChange={handleChange}></textarea>
            </div>
          </div>

          {/* === CỘT PHẢI: CHỌN MÓN === */}
          <div className="booking-menu-card">
            <h3 className="card-title"><FaUtensils className="icon-title"/> 2. Gọi món trước (Tùy chọn)</h3>
            <p className="hint-text">Món sẽ được chuẩn bị sẵn khi bạn đến để tiết kiệm thời gian chờ đợi.</p>
            
            <div className="mini-menu-list">
              {products.map(product => (
                <div key={product.id} className="mini-product-item">
                  <img src={product.image} alt={product.name} />
                  <div className="mini-info">
                    <span className="name">{product.name}</span>
                    <span className="price">{parseInt(product.price).toLocaleString()}đ</span>
                  </div>
                  <div className="qty-control">
                    <button type="button" onClick={() => handleQuantityChange(product.id, -1)}>-</button>
                    <span>{selectedItems[product.id] || 0}</span>
                    <button type="button" onClick={() => handleQuantityChange(product.id, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <button type="submit" className="btn-confirm-booking">
              Xác Nhận Đặt Bàn
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default BookingPage;