// src/pages/MenuPage.jsx
import React, { useState, useEffect } from 'react';
import { FaShoppingCart, FaSearch, FaStar, FaFire, FaLeaf } from 'react-icons/fa'; // Thêm icon Fire, Leaf
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import '../Menu.css';

const MenuPage = () => {
  const { addToCart } = useCart();
  
  // Dữ liệu & State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Fetch Data
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

        // Mặc định chọn món đầu tiên làm Spotlight
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

  // Xử lý click chọn món
  const handleProductClick = (product) => {
    setSelectedProduct(product);
    // Scroll lên top trên mobile để thấy món vừa chọn
    if (window.innerWidth < 768) {
        const spotlightElement = document.getElementById('spotlight-section');
        if(spotlightElement) spotlightElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Logic lọc sản phẩm
  const filteredProducts = products.filter((product) => {
    const matchCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price));
  };

  return (
    <div className="menu-page-wrapper">
      <Navbar />

      {/* --- 1. MENU HERO BANNER --- */}
      <div className="menu-hero">
        <div className="menu-hero-content">
            <h1>Thực Đơn <span className="highlight-text">Chinlu</span></h1>
            <p>Hương vị tự nhiên - Đánh thức mọi giác quan</p>
        </div>
        {/* Decor items (Lá bay) */}
        <div className="hero-decor-icon leaf-1"><FaLeaf /></div>
        <div className="hero-decor-icon leaf-2"><FaLeaf /></div>
      </div>

      {/* --- 2. TOOLBAR (SEARCH & FILTER) --- */}
      <div className="menu-toolbar-wrapper">
        <div className="menu-toolbar">
            {/* Ô tìm kiếm */}
            <div className="search-box-modern">
                <FaSearch className="search-icon" />
                <input 
                    type="text" 
                    placeholder="Bạn muốn uống gì hôm nay?..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Các Tabs danh mục */}
            <div className="category-scroll">
                {categories.map((cat) => (
                <button
                    key={cat.id}
                    className={`cat-pill ${activeCategory === (cat.slug || 'all') ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat.slug || 'all')}
                >
                    {cat.name}
                </button>
                ))}
            </div>
        </div>
      </div>

      {/* --- 3. MAIN LAYOUT --- */}
      <div className="menu-main-container">
        {loading ? (
          <div className="loading-state">
             <div className="spinner"></div>
             <p>Đang pha chế thực đơn...</p>
          </div>
        ) : (
          <div className="menu-grid-layout">
            
            {/* === CỘT TRÁI: SPOTLIGHT (Món tiêu điểm) === */}
            <div className="spotlight-column" id="spotlight-section">
              {selectedProduct && (
                <div className="spotlight-card">
                  {/* Badge nổi bật */}
                  <div className="badge-best-seller"><FaFire /> Món ngon phải thử</div>
                  
                  <div className="spotlight-img-container">
                      {/* Vòng tròn nền hiệu ứng */}
                      <div className="spotlight-circle"></div>
                      <img src={selectedProduct.image} alt={selectedProduct.name} className="spotlight-img" />
                  </div>

                  <div className="spotlight-content">
                      <div className="spotlight-header">
                        <span className="category-tag">
                            {categories.find(c => c.slug === selectedProduct.category)?.name}
                        </span>
                        <div className="rating-pill">
                            <FaStar color="#f1c40f" /> 4.9
                        </div>
                      </div>

                      <h2 className="spotlight-title">{selectedProduct.name}</h2>
                      <p className="spotlight-desc">{selectedProduct.desc || "Mô tả hương vị tuyệt vời đang được cập nhật..."}</p>

                      <div className="spotlight-footer">
                         <div className="price-display">
                            <span className="price-label">Giá chỉ</span>
                            <span className="price-value">{formatPrice(selectedProduct.price)}</span>
                         </div>
                         
                         <button 
                            className="btn-add-spotlight"
                            onClick={() => {
                                addToCart(selectedProduct);
                                toast.success(`Đã thêm ${selectedProduct.name} vào giỏ!`);
                            }}
                         >
                            <FaShoppingCart /> Thêm Ngay
                         </button>
                      </div>
                  </div>
                </div>
              )}
            </div>

            {/* === CỘT PHẢI: MENU LIST === */}
            <div className="list-column">
              <div className="list-header">
                 <h3>Danh sách món</h3>
                 <span className="item-count">{filteredProducts.length} món</span>
              </div>

              <div className="product-grid-modern">
                {filteredProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className={`product-card-item ${selectedProduct?.id === product.id ? 'active-card' : ''}`}
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="card-img-wrapper">
                      <img src={product.image} alt={product.name} loading="lazy" />
                    </div>
                    
                    <div className="card-info">
                      <h4>{product.name}</h4>
                      <div className="card-bottom">
                         <span className="card-price">{formatPrice(product.price)}</span>
                         <button 
                            className="btn-icon-add"
                            title="Thêm nhanh"
                            onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                                toast.success(`+1 ${product.name}`);
                            }}
                         >
                            +
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredProducts.length === 0 && (
                 <div className="empty-search">
                    <img src="https://cdn-icons-png.flaticon.com/512/6134/6134065.png" alt="Not found" width="60" />
                    <p>Hic, không tìm thấy món nào tên là "{searchTerm}" cả!</p>
                 </div>
              )}
            </div>

          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MenuPage;