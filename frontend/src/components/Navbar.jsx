// src/components/Navbar.jsx
import React, { useState } from 'react'; // Import thêm useState
import { FaUser, FaShoppingCart, FaLeaf, FaHistory, FaSignOutAlt, FaUserCircle } from 'react-icons/fa'; // Import thêm icon
import { Link } from 'react-router-dom'; 
import { useCart } from '../context/CartContext'; 
import { useAuth } from '../context/AuthContext'; 
import '../Home.css';

const Navbar = () => {
  const { cartCount, setIsCartOpen } = useCart();
  const { user, logout } = useAuth();
  
  // State để quản lý việc ẩn/hiện menu con của user
  const [showDropdown, setShowDropdown] = useState(false);

  // Hàm xử lý đăng xuất
  const handleLogout = () => {
    if(window.confirm('Bạn có muốn đăng xuất không?')) {
      logout();
      setShowDropdown(false);
    }
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none' }}>
        <div className="logo">
          CHINLU QUÁN <FaLeaf size={20} color="#2ecc71" />
        </div>
      </Link>
      
      <div className="nav-links">
        <Link to="/">Trang chủ</Link>
        <Link to="/menu">Thực đơn</Link>
        {/* Đã thay đổi "Câu chuyện" thành "Đặt bàn" */}
        <Link to="/booking">Đặt bàn</Link>
        <Link to="/discounts">Ưu đãi</Link>
      </div>

      <div className="user-actions">
        {/* Icon giỏ hàng */}
        <div className="cart-btn" onClick={() => setIsCartOpen(true)}>
            <FaShoppingCart size={24} color="#2c3e50" />
            {cartCount > 0 && (
              <span className="cart-badge">{cartCount}</span>
            )}
        </div>
        
        {/* Logic hiển thị User */}
        {user ? (
          // --- TRẠNG THÁI: ĐÃ ĐĂNG NHẬP ---
          <div className="logged-user" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span className="user-name-text">
               Chào, {user.name.split(' ').pop()}
             </span>
             
             {/* Avatar: Bấm vào để hiện Menu Dropdown */}
             <div 
               className="user-avatar" 
               onClick={() => setShowDropdown(!showDropdown)} // Toggle menu
               style={{ borderColor: '#2ecc71', cursor: 'pointer' }}
             >
                <FaUser size={20} color="#2ecc71" />
             </div>

             {/* --- MENU DROPDOWN (Chỉ hiện khi showDropdown = true) --- */}
             {showDropdown && (
               <div className="user-dropdown">
                 <Link to="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                    <FaUserCircle /> Hồ sơ cá nhân
                 </Link>
                 <Link to="/orders" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                    <FaHistory /> Lịch sử đơn hàng
                 </Link>
                 <div className="dropdown-divider"></div>
                 <button className="dropdown-item logout-btn" onClick={handleLogout}>
                    <FaSignOutAlt /> Đăng xuất
                 </button>
               </div>
             )}
          </div>
        ) : (
          // --- TRẠNG THÁI: CHƯA ĐĂNG NHẬP ---
          <Link to="/login" className="user-avatar" title="Đăng nhập / Đăng ký" style={{ borderColor: '#ccc' }}>
             <FaUser size={20} color="#999" />
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;