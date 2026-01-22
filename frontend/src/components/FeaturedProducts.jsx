import React, { useState } from 'react';
import { FaCartPlus } from 'react-icons/fa';
import { useCart } from '../context/CartContext'; // 1. Import hook giỏ hàng
import '../Home.css';

// Dữ liệu mẫu
const products = [
  {
    id: 1,
    name: 'Nước Chanh đá',
    price: 25000, // Lưu số nguyên để tính toán cho dễ (CartContext sẽ format sau)
    formattedPrice: '25.000đ',
    image: 'https://res.cloudinary.com/dmaeuom2i/image/upload/v1766398786/lemon.png_n0jjzw.webp' 
  },
  {
    id: 2,
    name: 'Nước ép dưa hấu',
    price: 35000,
    formattedPrice: '35.000đ',
    image: 'https://res.cloudinary.com/dmaeuom2i/image/upload/v1766398780/le.png_bouef8.webp'
  },
  {
    id: 3,
    name: 'Cà Phê Muối',
    price: 50000,
    formattedPrice: '50.000đ',
    image: 'https://res.cloudinary.com/dmaeuom2i/image/upload/v1766400465/salt.png_huplzm.webp'
  },
  {
    id: 4,
    name: 'Trà xoài',
    price: 29000,
    formattedPrice: '29.000đ',
    image: 'https://res.cloudinary.com/dmaeuom2i/image/upload/v1766400334/mango-1.png_kdzpz6.webp'
  }
];

const FeaturedProducts = () => {
  const [activeId, setActiveId] = useState(1);
  const { addToCart } = useCart(); // 2. Lấy hàm thêm vào giỏ

  return (
    <section className="featured-section">
      <h2 className="section-title">Thực Đơn <span className="highlight">Hôm Nay</span></h2>
      <p className="section-subtitle">Rê chuột vào món bạn thích</p>

      <div className="drink-sequence">
        {products.map((item) => (
          <div 
            key={item.id} 
            className={`drink-item ${activeId === item.id ? 'active' : ''}`}
            // Sự kiện: onMouseEnter để đổi món active
            onMouseEnter={() => setActiveId(item.id)}
          >
            <div className="drink-img-box">
               {/* Vòng tròn hiệu ứng (Chỉ hiện khi active) */}
               {activeId === item.id && (
                  <div className="bg-animation">
                    <div className="circle-yellow-outer"></div>
                    <div className="circle-yellow-inner"></div>
                  </div>
                )}
              
              <img src={item.image} alt={item.name} className="main-img" />
            </div>
            
            <div className="drink-info">
              <h3 className="drink-name">{item.name}</h3>
              {/* Hiển thị giá đã format */}
              <div className="drink-price">{item.formattedPrice}</div>
              
              {/* 3. Gắn sự kiện thêm vào giỏ */}
              <button 
                className={`btn-mini-add ${activeId === item.id ? 'show' : ''}`}
                onClick={(e) => {
                    e.stopPropagation(); // Ngăn sự kiện lan ra ngoài (nếu có click parent)
                    addToCart(item);
                }}
              >
                 <FaCartPlus /> Thêm
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedProducts;