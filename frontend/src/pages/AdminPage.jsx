// src/pages/AdminPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../Admin.css';
import { 
  FaLeaf, FaClipboardList, FaUsers, FaSignOutAlt, FaSyncAlt,
  FaDollarSign, FaShoppingBag, FaCoffee, FaPlus, FaEdit, FaTrash,
  FaCalendarCheck, FaPhone, FaChair, FaChartBar
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';

// 1. IMPORT RECHARTS (THƯ VIỆN BIỂU ĐỒ)
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';

const AdminPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // 2. State Tab: Thêm 'dashboard' và đặt làm mặc định
  const [activeTab, setActiveTab] = useState('dashboard'); 
  
  // Dữ liệu
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bookings, setBookings] = useState([]); 
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State (Cho món ăn)
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', price: '', image: '', description: '', category_id: '', file: null, preview: null
  });

  // --- 3. CẤU HÌNH SOCKET.IO ---
  useEffect(() => {
    if (user && user.role === 'admin') {
        const socket = io('http://localhost:5001');

        socket.on('new_order', (newOrder) => {
            const audio = new Audio('/sounds/notification.mp3'); audio.play().catch(() => {}); 
            toast.info(<div><strong>🔔 Đơn Mới!</strong><br/>{newOrder.customer_name}</div>);
            setOrders(prev => [newOrder, ...prev]);
        });

        socket.on('new_booking', (newBooking) => {
            const audio = new Audio('/sounds/notification.mp3'); audio.play().catch(() => {});
            toast.success(<div><strong>📅 Đặt Bàn Mới!</strong><br/>{newBooking.guest_count} khách</div>);
            setBookings(prev => [newBooking, ...prev]);
        });

        return () => socket.disconnect();
    }
  }, [user]);

  // --- 4. LOGIC TẢI DỮ LIỆU ---
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error("Bạn không có quyền truy cập! ⛔");
      navigate('/'); 
    } else if (user) {
      // Nếu đang ở Dashboard, tải tất cả để tính toán
      if (activeTab === 'dashboard') {
          loadAllData();
      } else {
          loadData();
      }
    }
  }, [user, activeTab]); 

  // Hàm tải từng phần (Cũ)
  const loadData = () => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'bookings') fetchBookings();
    if (activeTab === 'customers') fetchCustomers();
  };

  // Hàm tải TẤT CẢ (Mới - Cho Dashboard)
  const loadAllData = async () => {
    setLoading(true);
    try {
        const [ordRes, prodRes, catRes, bookRes, userRes] = await Promise.all([
            api.get('/orders/admin/all'),
            api.get('/products'),
            api.get('/products/categories'),
            api.get('/bookings/admin/all'),
            api.get('/users')
        ]);
        setOrders(ordRes.data);
        setProducts(prodRes.data);
        setCategories(catRes.data);
        setBookings(bookRes.data);
        setCustomers(userRes.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try { const res = await api.get('/orders/admin/all'); setOrders(res.data); } 
    catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([api.get('/products'), api.get('/products/categories')]);
      setProducts(prodRes.data); setCategories(catRes.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try { const res = await api.get('/bookings/admin/all'); setBookings(res.data); } 
    catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try { const res = await api.get('/users'); setCustomers(res.data); } 
    catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // --- 5. TÍNH TOÁN DỮ LIỆU BIỂU ĐỒ (MỚI) ---
  const statsData = useMemo(() => {
    if (orders.length === 0) return { revenueData: [], categoryData: [], topProducts: [] };

    // A. Doanh thu 7 ngày gần nhất
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const revenueData = last7Days.map(date => {
        const dailyRevenue = orders
            .filter(o => o.created_at.startsWith(date) && o.status === 'completed')
            .reduce((sum, o) => sum + Number(o.total_amount), 0);
        return { date: date.slice(5), revenue: dailyRevenue }; // MM-DD
    });

    // B. Tỉ lệ danh mục
    const categoryStats = {};
    orders.forEach(order => {
        if (order.status === 'completed') {
            order.items.forEach(item => {
                // Logic đơn giản: mapping tên món để tìm category (Tốt nhất nên lưu cat_id trong order_items)
                const product = products.find(p => p.name === item.product_name);
                if (product) {
                    const catName = categories.find(c => c.id === product.category_id)?.name || 'Khác';
                    categoryStats[catName] = (categoryStats[catName] || 0) + item.quantity;
                }
            });
        }
    });
    const categoryData = Object.keys(categoryStats).map(key => ({ name: key, value: categoryStats[key] }));

    // C. Top 5 món bán chạy
    const productCount = {};
    orders.forEach(order => {
        if (order.status !== 'cancelled') {
            order.items.forEach(item => {
                productCount[item.product_name] = (productCount[item.product_name] || 0) + item.quantity;
            });
        }
    });
    const topProducts = Object.entries(productCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return { revenueData, categoryData, topProducts };
  }, [orders, products, categories]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  // --- 6. CÁC HÀM XỬ LÝ (ACTION HANDLERS) ---
  const handleOrderStatus = async (id, status) => {
    try {
      await api.put(`/orders/admin/update-status/${id}`, { status });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      toast.success(`Đã cập nhật đơn #${id}!`);
    } catch (e) { toast.error("Lỗi cập nhật!"); }
  };

  const handleBookingStatus = async (id, status) => {
    try {
        await api.put(`/bookings/${id}`, { status });
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
        toast.success(`Lịch đặt #${id}: ${status}`);
    } catch (e) { toast.error("Lỗi cập nhật!"); }
  };

  const handleDeleteProduct = async (id) => {
    if(window.confirm("Bạn chắc chắn muốn xóa món này?")) {
      try {
        await api.delete(`/products/delete/${id}`);
        toast.info("Đã xóa món ăn! 🗑️");
        fetchProducts(); 
      } catch (e) { toast.error("Xóa thất bại!"); }
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name, price: product.price, image: product.image, description: product.desc, category_id: product.category_id, file: null, preview: null 
    });
    setShowForm(true);
  };

  const handleAddNewClick = () => {
    setEditingProduct(null);
    setFormData({ name: '', price: '', image: '', description: '', category_id: categories[0]?.id || '', file: null, preview: null });
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('price', formData.price);
      data.append('description', formData.description);
      data.append('category_id', formData.category_id);
      if (formData.file) data.append('image', formData.file);
      else data.append('image', formData.image);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (editingProduct) {
        await api.put(`/products/update/${editingProduct.id}`, data, config);
        toast.success("Cập nhật thành công!");
      } else {
        await api.post('/products/create', data, config);
        toast.success("Thêm món thành công!");
      }
      setShowForm(false);
      fetchProducts(); 
    } catch (error) { console.error(error); toast.error("Có lỗi xảy ra!"); }
  };

  const handleLogout = () => { logout(); navigate('/login'); toast.info("Đã đăng xuất"); };
  const formatPrice = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);
  const formatDate = (d) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});
  const totalRevenue = orders.reduce((sum, o) => o.status === 'completed' ? sum + Number(o.total_amount) : sum, 0);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="admin-page">
      {/* --- SIDEBAR --- */}
      <aside className="admin-sidebar">
        <div className="admin-logo"><FaLeaf /> CHINLU ADMIN</div>
        <nav className="admin-menu">
          {/* TAB THỐNG KÊ (MỚI) */}
          <div className={`admin-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <FaChartBar /> Thống kê (Dashboard)
          </div>

          <div className={`admin-menu-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <FaClipboardList /> Đơn Giao Hàng
          </div>
          <div className={`admin-menu-item ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
            <FaCalendarCheck /> Đặt Bàn (Booking)
          </div>
          <div className={`admin-menu-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            <FaCoffee /> Quản lý Món Ăn
          </div>
          <div className={`admin-menu-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
            <FaUsers /> Khách hàng
          </div>
          
          <div className="sidebar-footer">
            <div className="admin-menu-item" onClick={() => navigate('/')}>← Về trang chủ</div>
            <div className="admin-menu-item" onClick={handleLogout} style={{color: '#ef4444'}}><FaSignOutAlt /> Đăng xuất</div>
          </div>
        </nav>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="admin-main">
        
        {/* === [MỚI] TAB 1: DASHBOARD THỐNG KÊ === */}
        {activeTab === 'dashboard' && (
          <>
            <header className="admin-header">
              <h1 className="admin-title">Tổng Quan Kinh Doanh</h1>
              <button className="btn-refresh" onClick={loadAllData}><FaSyncAlt /> Cập nhật</button>
            </header>

            {/* CARD SỐ LIỆU */}
            <div className="stats-grid">
               <div className="stat-card">
                  <div className="stat-icon" style={{background:'#e0f2fe', color:'#0284c7'}}><FaDollarSign /></div>
                  <div className="stat-info">
                      <span className="stat-label">Tổng doanh thu</span>
                      <span className="stat-value" style={{color:'#0284c7'}}>{formatPrice(totalRevenue)}</span>
                  </div>
               </div>
               <div className="stat-card">
                  <div className="stat-icon" style={{background:'#dcfce7', color:'#16a34a'}}><FaClipboardList /></div>
                  <div className="stat-info">
                      <span className="stat-label">Đơn hoàn thành</span>
                      <span className="stat-value">{orders.filter(o => o.status === 'completed').length}</span>
                  </div>
               </div>
               <div className="stat-card">
                  <div className="stat-icon" style={{background:'#fae8ff', color:'#9333ea'}}><FaUsers /></div>
                  <div className="stat-info">
                      <span className="stat-label">Tổng khách hàng</span>
                      <span className="stat-value">{customers.length}</span>
                  </div>
               </div>
               <div className="stat-card">
                  <div className="stat-icon" style={{background:'#ffedd5', color:'#ea580c'}}><FaChair /></div>
                  <div className="stat-info">
                      <span className="stat-label">Lượt đặt bàn</span>
                      <span className="stat-value">{bookings.length}</span>
                  </div>
               </div>
            </div>

            {/* KHU VỰC BIỂU ĐỒ (ĐÃ FIX LỖI WIDTH -1) */}
            <div className="charts-container" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginTop: '20px'}}>
               
               {/* 1. BIỂU ĐỒ DOANH THU */}
               <div className="chart-box" style={{background:'white', padding:'20px', borderRadius:'15px', boxShadow:'0 5px 15px rgba(0,0,0,0.05)', minWidth: 0}}>
                  <h3>📈 Doanh thu 7 ngày qua</h3>
                  <div style={{width: '100%', height: 300}}>
                    {statsData.revenueData.length > 0 ? (
                      <ResponsiveContainer width="99%" height="100%">
                        <LineChart data={statsData.revenueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatPrice(value)} />
                          <Legend />
                          <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#8884d8" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <p style={{textAlign:'center', marginTop:'50px'}}>Chưa có dữ liệu</p>}
                  </div>
               </div>

               {/* 2. BIỂU ĐỒ TRÒN */}
               <div className="chart-box" style={{background:'white', padding:'20px', borderRadius:'15px', boxShadow:'0 5px 15px rgba(0,0,0,0.05)', minWidth: 0}}>
                  <h3>🍰 Tỉ lệ danh mục</h3>
                  <div style={{width: '100%', height: 300}}>
                    {statsData.categoryData.length > 0 ? (
                      <ResponsiveContainer width="99%" height="100%">
                        <PieChart>
                          <Pie
                            data={statsData.categoryData}
                            cx="50%" cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {statsData.categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <p style={{textAlign:'center', marginTop:'50px'}}>Chưa có dữ liệu</p>}
                  </div>
               </div>

               {/* 3. BIỂU ĐỒ CỘT (TOP MÓN) */}
               <div className="chart-box" style={{gridColumn: '1 / -1', background:'white', padding:'20px', borderRadius:'15px', boxShadow:'0 5px 15px rgba(0,0,0,0.05)', minWidth: 0}}>
                  <h3>🏆 Top 5 Món Bán Chạy</h3>
                  <div style={{width: '100%', height: 300}}>
                    {statsData.topProducts.length > 0 ? (
                      <ResponsiveContainer width="99%" height="100%">
                        <BarChart data={statsData.topProducts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" name="Số lượng bán" fill="#13c95f" barSize={50} radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p style={{textAlign:'center', marginTop:'50px'}}>Chưa có dữ liệu</p>}
                  </div>
               </div>

            </div>
          </>
        )}

        {/* === TAB 2: QUẢN LÝ ĐƠN GIAO HÀNG === */}
        {activeTab === 'orders' && (
          <>
            <header className="admin-header">
              <h1 className="admin-title">Quản lý Đơn Giao Hàng</h1>
              <button className="btn-refresh" onClick={fetchOrders}><FaSyncAlt /> Làm mới</button>
            </header>
            
            <div className="table-wrapper">
              {loading ? <p style={{padding: '20px'}}>Đang tải dữ liệu...</p> : (
                <table className="admin-table">
                  <thead>
                    <tr><th>ID</th><th>Ngày đặt</th><th>Khách hàng</th><th>Chi tiết món</th><th>Tổng tiền</th><th>Trạng thái</th></tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} className={o.status === 'pending' ? 'new-order-highlight' : ''}>
                        <td className="col-id">#{o.id}</td>
                        <td>{formatDate(o.created_at)}</td>
                        <td className="col-customer">
                            <strong>{o.customer_name}</strong><br/>
                            <small><FaPhone size={10}/> {o.phone}</small><br/>
                            <small style={{color:'#666'}}>{o.address}</small>
                        </td>
                        <td>
                          <div className="item-list-mini">
                            {o.items?.map((i, idx) => <div key={idx} className="mini-item"><span className="qty-badge">{i.quantity}</span> {i.product_name}</div>)}
                            {o.note && <div className="order-note">Note: {o.note}</div>}
                          </div>
                        </td>
                        <td className="col-total">{formatPrice(o.total_amount)}</td>
                        <td>
                          <select className={`status-select ${o.status}`} value={o.status} onChange={(e) => handleOrderStatus(o.id, e.target.value)}>
                            <option value="pending">🟡 Chờ xác nhận</option>
                            <option value="preparing">🔵 Đang pha chế</option>
                            <option value="shipping">🟢 Đang giao</option>
                            <option value="completed">✅ Hoàn thành</option>
                            <option value="cancelled">🔴 Đã hủy</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* === TAB 3: QUẢN LÝ ĐẶT BÀN === */}
        {activeTab === 'bookings' && (
            <>
                <header className="admin-header">
                    <h1 className="admin-title">Lịch Đặt Bàn</h1>
                    <button className="btn-refresh" onClick={fetchBookings}><FaSyncAlt /> Làm mới</button>
                </header>
                <div className="table-wrapper">
                    {loading ? <p style={{padding: '20px'}}>Đang tải lịch đặt...</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr><th>Mã</th><th>Ngày giờ đến</th><th>Khách hàng</th><th>Vị trí & Số khách</th><th>Món gọi trước</th><th>Trạng thái</th></tr>
                            </thead>
                            <tbody>
                                {bookings.map(b => (
                                    <tr key={b.id} className={b.status === 'pending' ? 'new-order-highlight' : ''}>
                                        <td className="col-id">#{b.id}</td>
                                        <td>
                                            <div style={{fontWeight:'bold', color:'#2c3e50'}}>{new Date(b.booking_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</div>
                                            <div style={{fontSize:'0.85rem', color:'#888'}}>{new Date(b.booking_time).toLocaleDateString('vi-VN')}</div>
                                        </td>
                                        <td className="col-customer">
                                            <strong>{b.full_name || 'Khách vãng lai'}</strong><br/>
                                            {b.phone && <small><FaPhone size={10}/> {b.phone}</small>}
                                        </td>
                                        <td>
                                            <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                                                <span className="qty-badge" style={{background:'#dbeafe', color:'#1e40af'}}><FaChair/> Bàn {b.table_number}</span>
                                                <span className="qty-badge"><FaUsers/> {b.guest_count}</span>
                                            </div>
                                            {b.note && <div className="order-note" style={{marginTop:'5px'}}>Note: {b.note}</div>}
                                        </td>
                                        <td>
                                            {b.items && b.items.length > 0 ? (
                                                <div className="item-list-mini">
                                                    {b.items.map((i, idx) => <div key={idx} className="mini-item"><span className="qty-badge">{i.quantity}</span> {i.product_name}</div>)}
                                                </div>
                                            ) : <span style={{color:'#ccc', fontStyle:'italic'}}>Không gọi trước</span>}
                                        </td>
                                        <td>
                                            <select className={`status-select ${b.status}`} value={b.status} onChange={(e) => handleBookingStatus(b.id, e.target.value)}>
                                                <option value="pending">🟡 Chờ xác nhận</option>
                                                <option value="confirmed">🔵 Đã nhận bàn</option>
                                                <option value="completed">✅ Đã xong</option>
                                                <option value="cancelled">🔴 Hủy lịch</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </>
        )}

        {/* === TAB 4: QUẢN LÝ MÓN ĂN === */}
        {activeTab === 'products' && (
          <>
            <header className="admin-header">
              <h1 className="admin-title">Quản lý Thực Đơn</h1>
              <button className="btn-refresh" style={{background: '#13c95f', color: 'white', border: 'none'}} onClick={handleAddNewClick}>
                <FaPlus /> Thêm món mới
              </button>
            </header>

            {showForm && (
              <div className="form-overlay">
                <div className="form-modal">
                  <h3>{editingProduct ? 'Cập nhật món' : 'Thêm món mới'}</h3>
                  <form onSubmit={handleFormSubmit}>
                    <div className="form-group"><label>Tên món</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                    <div className="form-row-2">
                      <div className="form-group"><label>Giá (VNĐ)</label><input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required /></div>
                      <div className="form-group"><label>Danh mục</label><select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    </div>
                    <div className="form-group"><label>Hình ảnh</label><input type="file" accept="image/*" onChange={(e) => { const file = e.target.files[0]; if(file) setFormData({ ...formData, file, preview: URL.createObjectURL(file) }); }} />{(formData.preview || formData.image) && (<div style={{marginTop: '10px'}}><img src={formData.preview || formData.image} alt="Preview" style={{height: '100px', width: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd'}} /></div>)}</div>
                    <div className="form-group"><label>Mô tả</label><textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea></div>
                    <div className="form-actions"><button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Hủy</button><button type="submit" className="btn-save">Lưu lại</button></div>
                  </form>
                </div>
              </div>
            )}

            <div className="table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Ảnh</th><th>Tên món</th><th>Giá</th><th>Danh mục</th><th>Mô tả</th><th>Hành động</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td><img src={p.image} alt="" style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px'}} /></td>
                      <td style={{fontWeight: '600'}}>{p.name}</td>
                      <td style={{color: '#13c95f', fontWeight: 'bold'}}>{formatPrice(p.price)}</td>
                      <td><span className="qty-badge">{p.category_name}</span></td>
                      <td style={{fontSize: '0.85rem', color: '#64748b', maxWidth: '200px'}}>{p.desc}</td>
                      <td>
                        <div style={{display: 'flex', gap: '10px'}}>
                          <button className="action-btn edit" onClick={() => handleEditClick(p)}><FaEdit /></button>
                          <button className="action-btn delete" onClick={() => handleDeleteProduct(p.id)}><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* === TAB 5: QUẢN LÝ KHÁCH HÀNG === */}
        {activeTab === 'customers' && (
          <>
            <header className="admin-header">
              <h1 className="admin-title">Danh sách Khách Hàng</h1>
              <button className="btn-refresh" onClick={fetchCustomers}><FaSyncAlt /> Làm mới</button>
            </header>

            <div className="table-wrapper">
              {loading ? <p style={{padding: '20px'}}>Đang tải dữ liệu...</p> : (
                <table className="admin-table">
                  <thead>
                    <tr><th>ID</th><th>Họ tên</th><th>Liên hệ</th><th>Địa chỉ</th><th>Vai trò</th><th>Ngày tham gia</th></tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center'}}>Chưa có khách hàng</td></tr> :
                    customers.map(c => (
                      <tr key={c.id}>
                        <td className="col-id">#{c.id}</td>
                        <td style={{fontWeight:'bold'}}>{c.full_name}</td>
                        <td><div>{c.email}</div><small style={{color:'#666'}}>{c.phone || '---'}</small></td>
                        <td style={{maxWidth:'200px', fontSize:'0.9rem'}}>{c.address || 'Chưa cập nhật'}</td>
                        <td><span className={`qty-badge ${c.role === 'admin' ? 'admin-role' : ''}`}>{c.role}</span></td>
                        <td>{new Date(c.created_at).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

      </main>
    </div>
  );
};

export default AdminPage;