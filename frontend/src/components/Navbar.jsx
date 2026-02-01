// src/components/Navbar.jsx
import React, { useState } from 'react';
import { 
  FaUser, FaShoppingCart, FaLeaf, FaHistory, 
  FaSignOutAlt, FaUserCircle, FaTachometerAlt // Import thêm icon Bảng điều khiển
} from 'react-icons/fa';
import { Link } from 'react-router-dom'; 
import { useCart } from '../context/CartContext'; 
import { useAuth } from '../context/AuthContext'; 
import '../Home.css';

const Navbar = () => {
  const { cartCount, setIsCartOpen } = useCart();
  const { user, logout } = useAuth();
  
  // State quản lý dropdown
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    if(window.confirm('Bạn có muốn đăng xuất không?')) {
      logout();
      setShowDropdown(false);
    }
  };

  return (
    <nav className="navbar">
      {/* --- LOGO --- */}
      <Link to="/" style={{ textDecoration: 'none' }}>
        <div className="logo">
          CHINLU QUÁN <FaLeaf size={20} color="#2ecc71" />
        </div>
      </Link>
      
      {/* --- NAV LINKS --- */}
      <div className="nav-links">
        <Link to="/">Trang chủ</Link>
        <Link to="/menu">Thực đơn</Link>
        <Link to="/booking">Đặt bàn</Link>
        <Link to="/discounts">Ưu đãi</Link>
      </div>

      {/* --- USER ACTIONS --- */}
      <div className="user-actions">
        {/* Giỏ hàng */}
        <div className="cart-btn" onClick={() => setIsCartOpen(true)}>
            <FaShoppingCart size={24} color="#2c3e50" />
            {cartCount > 0 && (
              <span className="cart-badge">{cartCount}</span>
            )}
        </div>
        
        {/* Logic User */}
        {user ? (
          <div className="logged-user" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span className="user-name-text">
               Chào, {user.name ? user.name.split(' ').pop() : 'Bạn'}
             </span>
             
             {/* Avatar Click -> Toggle Dropdown */}
             <div 
               className="user-avatar" 
               onClick={() => setShowDropdown(!showDropdown)}
               style={{ borderColor: '#2ecc71', cursor: 'pointer' }}
             >
                <FaUser size={20} color="#2ecc71" />
             </div>

             {/* --- MENU DROPDOWN --- */}
             {showDropdown && (
               <div className="user-dropdown">
                 
                 {/* 🔥 CHỈ HIỆN VỚI ADMIN 🔥 */}
                 {user.role === 'admin' && (
                   <>
                     <Link to="/admin" className="dropdown-item admin-link" onClick={() => setShowDropdown(false)} style={{ color: '#d35400', fontWeight: 'bold' }}>
                        <FaTachometerAlt /> Trang Quản Lý
                     </Link>
                     <div className="dropdown-divider"></div>
                   </>
                 )}

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
          <Link to="/login" className="user-avatar" title="Đăng nhập" style={{ borderColor: '#ccc' }}>
             <FaUser size={20} color="#999" />
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;