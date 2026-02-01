import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaLeaf, FaLemon, FaStar, FaShippingFast } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import FeaturedProducts from '../components/FeaturedProducts';
import WhyChooseUs from '../components/WhyChooseUs';
import Footer from '../components/Footer';
import '../Home.css';

const drinkImage = "https://res.cloudinary.com/dmaeuom2i/image/upload/v1766398059/pass.png_udu5np.webp";

const HomePage = () => {
  return (
    <div className="homepage-wrapper">
      <Navbar />

      {/* --- HERO SECTION --- */}
      <section className="hero-section">
        <div className="hero-decor">
            <div className="decor-item leaf-1"><FaLeaf /></div>
            <div className="decor-item leaf-2"><FaLemon /></div>
            <div className="decor-item leaf-3"><FaLeaf /></div>
        </div>

        <div className="hero-container">
            <div className="hero-text">
                <div className="hero-badge">
                    <span className="fire-icon">🔥</span> Best Seller in Town
                </div>

                <h1>
                    Đánh Thức Vị Giác<br/>
                    Cùng <span className="highlight">Chinlu Quán</span>
                </h1>
                
                <p className="hero-desc">
                    Sự kết hợp tinh tế giữa trà tươi thượng hạng và trái cây nhiệt đới. 
                    Nạp đầy năng lượng tươi mới cho ngày dài năng động của bạn.
                </p>

                <div className="hero-actions">
                    <Link to="/menu" className="btn-primary">
                        Xem Menu Ngay <FaArrowRight />
                    </Link>
                    <Link to="/booking" className="btn-secondary">
                        Đặt Bàn Trước
                    </Link>
                </div>

                {/* Thống kê nhỏ để tạo uy tín */}
                <div className="hero-stats">
                    <div className="stat-item">
                        <span className="stat-number">50+</span>
                        <span className="stat-label">Món uống</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                        <span className="stat-number">30p</span>
                        <span className="stat-label">Giao nhanh</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                        <span className="stat-number">4.9</span>
                        <span className="stat-label">Đánh giá <FaStar className="star-icon"/></span>
                    </div>
                </div>
            </div>

            {/* CỘT PHẢI: Hình ảnh */}
            <div className="hero-image-container">
                <div className="centered-wrapper">
                    <div className="circle circle-outer"></div>
                    <div className="circle circle-inner"></div>
                    
                    <img 
                        src={drinkImage}
                        alt="Chinlu Signature Fruit Tea" 
                        className="drink-img" 
                    />

                    {/* Tag giá tiền nổi (Floating Badge) */}
                    <div className="floating-price-card">
                        <span className="price-label">Chỉ từ</span>
                        <span className="price-value">29K</span>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- MARQUEE SECTION --- */}
      <div className="marquee-section">
        <div className="marquee-content">
            <span>🌿 Nguyên liệu tươi sạch 100%</span>
            <span className="separator">•</span> 
            <span>🚀 Freeship bán kính 5km</span>
            <span className="separator">•</span>
            <span>🎉 Giảm 20% thành viên mới</span>
            <span className="separator">•</span>
            <span>🍹 Menu đa dạng update mỗi tuần</span>
        </div>
      </div>

      {/* --- FEATURED PRODUCTS --- */}
      <div className="section-featured">
         <FeaturedProducts />
      </div>

      {/* --- PROMO BANNER (MỚI: Banner quảng cáo giữa trang) --- */}
      {/* Phần này phá vỡ khoảng trắng, tạo điểm nhấn */}
      <section className="promo-banner-section">
        <div className="promo-content">
            <div className="promo-tag">Ưu đãi giờ vàng</div>
            <h2>Mua 2 Tặng 1 - Khung giờ 14h-17h</h2>
            <p>Áp dụng cho dòng Trà Trái Cây Nhiệt Đới. Đừng bỏ lỡ!</p>
            <Link to="/menu" className="btn-white">Săn Deal Ngay</Link>
        </div>
      </section>

      {/* --- WHY CHOOSE US --- */}
      <div className="section-why-choose">
        <WhyChooseUs />
      </div>

      <Footer />
    </div>
  );
};

export default HomePage;