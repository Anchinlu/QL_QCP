// src/pages/HomePage.jsx
import React from 'react';
// Import thêm icon mũi tên cho nút bấm
import { FaArrowRight } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import FeaturedProducts from '../components/FeaturedProducts';
import WhyChooseUs from '../components/WhyChooseUs'; // Mới
import Footer from '../components/Footer';
import '../Home.css';

// Link ảnh ly trà trái cây đẹp và sắc nét hơn
const drinkImage = "https://res.cloudinary.com/dmaeuom2i/image/upload/v1766398059/pass.png_udu5np.webp";

const HomePage = () => {
  return (
    <div>
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        {/* Bên trái: Nội dung chữ hấp dẫn hơn */}
        <div className="hero-text">
          <h1>
            Đánh Thức Vị Giác<br/>
            Với <span className="highlight">Chinlu Quán</span>
          </h1>
          <p>
            Khám phá sự hòa quyện tuyệt vời giữa trà tươi thượng hạng và trái cây nhiệt đới thanh mát. 
            Mỗi ngụm là một trải nghiệm sảng khoái, nạp đầy năng lượng tươi mới cho ngày dài năng động của bạn.
          </p>
          <button className="btn-order">
            Xem Thực Đơn Ngay <FaArrowRight />
          </button>
        </div>

        {/* Bên phải: Ảnh + Vòng tròn đã căn giữa */}
        <div className="hero-image-container">
            <div className="centered-wrapper">
                 {/* Vòng tròn ngoài (vàng kem nhạt) */}
                <div className="circle circle-outer"></div>
                 {/* Vòng tròn trong (vàng kem đậm hơn) */}
                <div className="circle circle-inner"></div>
                
                {/* Ảnh ly nước nghiêng, có bóng đổ sâu */}
                <img 
                    src={drinkImage}
                    alt="Chinlu Signature Fruit Tea" 
                    className="drink-img" 
                />
            </div>
        </div>
      </section>

      {/* Marquee: Chữ chạy chân trang */}
      <div className="marquee-container">
        <div className="marquee-text">
          🌿 Chào mừng bạn đến với Chinlu Quán - Nơi vị ngon hội tụ! 
          &nbsp;&nbsp;•&nbsp;&nbsp; 
          🎉 Ưu đãi đặc biệt: Giảm ngay 20% cho đơn hàng đầu tiên.
          &nbsp;&nbsp;•&nbsp;&nbsp; 
          🚀 Freeship thần tốc trong bán kính 5km. 
          &nbsp;&nbsp;•&nbsp;&nbsp; 
          Nguyên liệu tươi sạch mỗi ngày. Thưởng thức ngay!
        </div>
      </div>

      {/* Sửa lỗi: Đưa FeaturedProducts vào bên trong thẻ div */}
      <FeaturedProducts />
      {/* 4. Why Choose Us (Mới) */}
      <WhyChooseUs />

      {/* 5. Footer (Mới) */}
      <Footer />

    </div>
  );
};

export default HomePage;