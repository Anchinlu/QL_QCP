import React from 'react';
import { FaFacebookF, FaInstagram, FaTiktok, FaPhoneAlt, FaMapMarkerAlt, FaEnvelope } from 'react-icons/fa';
import '../Home.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Cột 1: Giới thiệu */}
        <div className="footer-col">
          <h2 className="footer-logo">CHINLU QUÁN 🍃</h2>
          <p>
            Nơi lan tỏa hương vị thiên nhiên qua từng ly nước. 
            Chúng tôi mong muốn mang lại niềm vui và sức khỏe cho mọi khách hàng.
          </p>
          <div className="social-links">
            <a href="#"><FaFacebookF /></a>
            <a href="#"><FaInstagram /></a>
            <a href="#"><FaTiktok /></a>
          </div>
        </div>

        {/* Cột 2: Liên kết nhanh */}
        <div className="footer-col">
          <h3>Liên Kết</h3>
          <ul>
            <li><a href="/">Trang Chủ</a></li>
            <li><a href="/menu">Thực Đơn</a></li>
            <li><a href="/about">Về Chúng Tôi</a></li>
            <li><a href="/contact">Liên Hệ</a></li>
          </ul>
        </div>

        {/* Cột 3: Thông tin liên hệ */}
        <div className="footer-col">
          <h3>Liên Hệ</h3>
          <ul className="contact-info">
            <li><FaMapMarkerAlt /> 123 Đường 3/2, Q. Ninh Kiều, Cần Thơ</li>
            <li><FaPhoneAlt /> 0909.123.456</li>
            <li><FaEnvelope /> chinluquan@gmail.com</li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2025 Chinlu Quán. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;