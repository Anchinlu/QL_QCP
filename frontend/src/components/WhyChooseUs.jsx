import React from 'react';
import { FaShippingFast, FaLeaf, FaCoffee } from 'react-icons/fa';
import '../Home.css';

const WhyChooseUs = () => {
  const features = [
    {
      id: 1,
      icon: <FaLeaf />,
      title: 'Nguyên Liệu Sạch 100%',
      desc: 'Cam kết sử dụng trái cây tươi mỗi ngày, không chất bảo quản.'
    },
    {
      id: 2,
      icon: <FaShippingFast />,
      title: 'Giao Hàng Thần Tốc',
      desc: 'Nhận nước mát lạnh chỉ trong vòng 30 phút đặt hàng.'
    },
    {
      id: 3,
      icon: <FaCoffee />,
      title: 'Công Thức Độc Quyền',
      desc: 'Hương vị pha chế riêng biệt, chỉ có tại Chinlu Quán.'
    }
  ];

  return (
    <section className="why-section">
      <div className="why-grid">
        {features.map((item) => (
          <div key={item.id} className="why-card">
            <div className="icon-box">
              {item.icon}
            </div>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WhyChooseUs;