// src/pages/MenuPage.jsx
import React, { useState, useEffect } from 'react';
import { FaShoppingCart, FaSearch, FaStar } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import api from '../services/api';
import '../Menu.css';

// 1. Import toast từ thư viện
import { toast } from 'react-toastify';

const MenuPage = () => {
  const { addToCart } = useCart();
  
  // Dữ liệu từ API
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Logic hiển thị
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Logic món đang được chọn (Spotlight)
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [catsRes, prodsRes] = await Promise.all([
          api.get('/products/categories'),
          api.get('/products')
        ]);

        setCategories([{ id: 'all', name: 'Tất cả', slug: 'all' }, ...catsRes.data]);
        setProducts(prodsRes.data);

        if (prodsRes.data.length > 0) {
          setSelectedProduct(prodsRes.data[0]);
        }

      } catch (error) {
        console.error("Lỗi tải menu:", error);
        toast.error("Không thể tải thực đơn, vui lòng thử lại sau!");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    if (window.innerWidth < 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price));
  };

  return (
    <div className="menu-page">
      <Navbar />

      <div className="menu-header">
        <h1>Thực Đơn Chinlu</h1>
        <p>Chọn món yêu thích của bạn</p>
      </div>

      <div className="menu-toolbar">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Tìm kiếm món..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`cat-btn ${activeCategory === (cat.slug || 'all') ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.slug || 'all')}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="menu-layout-container">
        {loading ? (
          <div className="loading-state">Đang tải thực đơn thơm ngon...</div>
        ) : (
          <>
            {/* --- CỘT TRÁI: SPOTLIGHT --- */}
            <div className="spotlight-column">
              {selectedProduct && (
                <div className="spotlight-card">
                  <div className="spotlight-image-box">
                     <img src={selectedProduct.image} alt={selectedProduct.name} />
                  </div>
                  <div className="spotlight-info">
                     <div className="tag-category">
                        {categories.find(c => c.slug === selectedProduct.category)?.name}
                     </div>
                     <h2>{selectedProduct.name}</h2>
                     <p className="desc-text">{selectedProduct.desc}</p>
                     
                     <div className="rating">
                        <FaStar color="#f1c40f" /> 5.0 (Best Seller)
                     </div>

                     <div className="spotlight-action">
                        <span className="price-big">{formatPrice(selectedProduct.price)}</span>
                        
                        {/* 2. Cập nhật nút thêm to */}
                        <button 
                            className="btn-add-big" 
                            onClick={() => {
                                addToCart(selectedProduct);
                                toast.success(`Đã thêm ${selectedProduct.name} vào giỏ! 😋`);
                            }}
                        >
                           <FaShoppingCart /> Thêm vào giỏ
                        </button>

                     </div>
                  </div>
                </div>
              )}
            </div>

            {/* --- CỘT PHẢI: LIST --- */}
            <div className="list-column">
              <h3 className="list-title">Danh sách món ({filteredProducts.length})</h3>
              <div className="product-grid-compact">
                {filteredProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className={`product-card-mini ${selectedProduct?.id === product.id ? 'active' : ''}`}
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="mini-img">
                      <img src={product.image} alt={product.name} />
                    </div>
                    <div className="mini-info">
                      <h4>{product.name}</h4>
                      <span className="mini-price">{formatPrice(product.price)}</span>
                    </div>
                    
                    {/* 3. Cập nhật nút thêm nhỏ */}
                    <button 
                        className="btn-add-mini" 
                        onClick={(e) => {
                            e.stopPropagation(); 
                            addToCart(product);
                            toast.success(`+1 ${product.name}`);
                        }}
                    >
                        +
                    </button>
                  </div>
                ))}
              </div>
              
              {filteredProducts.length === 0 && (
                 <p className="no-result">Không tìm thấy món nào.</p>
              )}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MenuPage;