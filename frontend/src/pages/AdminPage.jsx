import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../Admin.css';
import { 
  FaLeaf, FaClipboardList, FaUsers, FaSignOutAlt, FaSyncAlt,
  FaDollarSign, FaCoffee, FaPlus, FaEdit, FaTrash,
  FaCalendarCheck, FaPhone, FaChair, FaChartBar, FaSearch, FaFilter
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';

// Import thư viện biểu đồ
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';

const AdminPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // --- 1. STATE QUẢN LÝ TABS & DATA ---
  const [activeTab, setActiveTab] = useState('dashboard'); 
  
  // Dữ liệu hiển thị
  const [statsDashboard, setStatsDashboard] = useState({ 
      revenue_today: 0, revenue_total: 0, orders_today: 0, bookings_upcoming: 0 
  });
  const [revenueChart, setRevenueChart] = useState([]);
  const [categoryChart, setCategoryChart] = useState([]);
  
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- 2. STATE BỘ LỌC (FILTER) ---
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]); // Mặc định hôm nay
  const [filterBookingType, setFilterBookingType] = useState('upcoming'); // 'upcoming' | 'date'
  const [chartMode, setChartMode] = useState('day'); // 'day' (7 ngày) | 'month' (Theo tháng)

  // Form State (Thêm/Sửa món)
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', price: '', image: '', description: '', category_id: '', stock_quantity: '', file: null, preview: null
  });

  // --- 3. SOCKET.IO: REAL-TIME UPDATE ---
  useEffect(() => {
    if (user && user.role === 'admin') {
        // Lưu ý: Đổi port 5001 nếu backend bạn chạy port khác
        const socket = io('http://localhost:5001');

        socket.on('new_order', (newOrder) => {
            const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3'); 
            audio.play().catch(() => {}); 
            toast.info(`🔔 Đơn mới: ${newOrder.customer_name} - ${formatPrice(newOrder.total_amount)}`);
            
            // Reload dữ liệu tùy tab đang đứng
            if (activeTab === 'orders') fetchOrders(); 
            if (activeTab === 'dashboard') fetchDashboardData();
        });

        socket.on('new_booking', (newBooking) => {
            const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-10.mp3'); 
            audio.play().catch(() => {});
            toast.success(`📅 Khách đặt bàn mới: ${newBooking.guest_count} người`);
            
            if (activeTab === 'bookings') fetchBookings();
            if (activeTab === 'dashboard') fetchDashboardData();
        });

        return () => socket.disconnect();
    }
  }, [user, activeTab]);

  // --- 4. DATA FETCHING ---
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast.error("Truy cập bị từ chối!");
      navigate('/'); 
      return;
    }
    
    if (activeTab === 'dashboard') fetchDashboardData();
    else if (activeTab === 'orders') fetchOrders();
    else if (activeTab === 'bookings') fetchBookings();
    else if (activeTab === 'products') fetchProducts();
    else if (activeTab === 'customers') fetchCustomers();

  }, [user, activeTab, chartMode]); 

  // --- API CALLS ---
  const fetchDashboardData = async () => {
      setLoading(true);
      try {
          const [dashRes, revRes, catRes] = await Promise.all([
              api.get('/stats/dashboard'),
              api.get(`/stats/revenue-chart?type=${chartMode}`), 
              api.get('/stats/category-pie')
          ]);
          setStatsDashboard(dashRes.data);
          setRevenueChart(revRes.data);
          setCategoryChart(catRes.data);
      } catch (error) {
          console.error("Lỗi tải thống kê:", error);
      } finally { setLoading(false); }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try { 
        const res = await api.get('/orders/admin/all', { params: { date: filterDate } }); 
        setOrders(res.data); 
    } 
    catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try { 
        const params = filterBookingType === 'date' ? { date: filterDate } : { filterType: 'upcoming' };
        const res = await api.get('/bookings/admin/all', { params }); 
        setBookings(res.data); 
    } 
    catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([api.get('/products'), api.get('/products/categories')]);
      setProducts(prodRes.data); setCategories(catRes.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try { const res = await api.get('/users'); setCustomers(res.data); } 
    catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // --- ACTIONS ---
  const handleOrderStatus = async (id, status) => {
    if(!window.confirm(`Xác nhận đổi trạng thái đơn #${id}?`)) return;
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
        toast.success(`Đã cập nhật lịch đặt #${id}!`);
    } catch (e) { toast.error("Lỗi cập nhật!"); }
  };

  const handleDeleteProduct = async (id) => {
    if(window.confirm("Bạn chắc chắn muốn xóa món này?")) {
      try {
        await api.delete(`/products/delete/${id}`);
        toast.success("Đã xóa món ăn!");
        setProducts(prev => prev.filter(p => p.id !== id));
      } catch (e) { toast.error("Xóa thất bại!"); }
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name, price: product.price, image: product.image, description: product.desc, 
      category_id: product.category_id, stock_quantity: product.stock_quantity || '', file: null, preview: null 
    });
    setShowForm(true);
  };

  const handleAddNewClick = () => {
    setEditingProduct(null);
    setFormData({ name: '', price: '', image: '', description: '', category_id: categories[0]?.id || '', stock_quantity: '', file: null, preview: null });
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
      data.append('stock_quantity', formData.stock_quantity);
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
    } catch (error) { console.error(error); toast.error("Có lỗi xảy ra khi lưu!"); }
  };

  const handleLogout = () => { logout(); navigate('/login'); toast.info("Đã đăng xuất"); };
  const formatPrice = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);
  const formatDate = (d) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-logo"><FaLeaf /> QUẢN TRỊ VIÊN</div>
        <nav className="admin-menu">
          <div className={`admin-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><FaChartBar /> Dashboard</div>
          <div className={`admin-menu-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}><FaClipboardList /> Đơn Giao Hàng</div>
          <div className={`admin-menu-item ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}><FaCalendarCheck /> Đặt Bàn</div>
          <div className={`admin-menu-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}><FaCoffee /> Thực Đơn</div>
          <div className={`admin-menu-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}><FaUsers /> Khách Hàng</div>
          <div className="sidebar-footer"><div className="admin-menu-item logout" onClick={handleLogout}><FaSignOutAlt /> Đăng xuất</div></div>
        </nav>
      </aside>

      <main className="admin-main">
        {/* === DASHBOARD === */}
        {activeTab === 'dashboard' && statsDashboard && (
          <>
            <header className="admin-header">
              <h1 className="admin-title">Tổng Quan Kinh Doanh</h1>
              <div className="filter-bar">
                  <button className={`btn-filter ${chartMode === 'day' ? 'active' : ''}`} onClick={() => setChartMode('day')}>7 Ngày</button>
                  <button className={`btn-filter ${chartMode === 'month' ? 'active' : ''}`} onClick={() => setChartMode('month')}>Theo Tháng</button>
                  <button className="btn-refresh" onClick={fetchDashboardData}><FaSyncAlt /></button>
              </div>
            </header>

            <div className="stats-grid">
               {/* Giữ nguyên các Card thống kê */}
               <div className="stat-card">
                  <div className="stat-icon revenue"><FaDollarSign /></div>
                  <div className="stat-info"><span className="stat-label">Doanh thu hôm nay</span><span className="stat-value revenue">{formatPrice(statsDashboard.revenue_today || 0)}</span></div>
               </div>
               <div className="stat-card">
                  <div className="stat-icon orders"><FaClipboardList /></div>
                  <div className="stat-info"><span className="stat-label">Đơn hôm nay</span><span className="stat-value">{statsDashboard.orders_today || 0}</span></div>
               </div>
               <div className="stat-card">
                  <div className="stat-icon bookings"><FaChair /></div>
                  <div className="stat-info"><span className="stat-label">Khách sắp đến</span><span className="stat-value">{statsDashboard.bookings_upcoming || 0}</span></div>
               </div>
               <div className="stat-card">
                  <div className="stat-icon customers"><FaDollarSign /></div>
                  <div className="stat-info"><span className="stat-label">Tổng doanh thu</span><span className="stat-value">{formatPrice(statsDashboard.revenue_total || 0)}</span></div>
               </div>
            </div>

            <div className="charts-container">
               <div className="chart-box full-width">
                  <h3>Biểu đồ doanh thu ({chartMode === 'day' ? '7 ngày qua' : 'Theo tháng trong năm'})</h3>
                  {/* SỬA LỖI: Dùng width="99%" thay vì 100% để tránh lỗi resize loop trong Grid */}
                  <div style={{width: '100%', height: 300, minWidth: 0}}>
                    <ResponsiveContainer width="99%" height="100%">
                      <LineChart data={revenueChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatPrice(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="value" name="Doanh thu (VND)" stroke="#27ae60" strokeWidth={3} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="chart-box">
                  <h3>Tỉ lệ danh mục bán ra</h3>
                  <div style={{width: '100%', height: 300, minWidth: 0}}>
                    <ResponsiveContainer width="99%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChart} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryChart.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </>
        )}

        {/* === ORDERS === */}
        {activeTab === 'orders' && (
          <>
            <header className="admin-header">
              <h1 className="admin-title">Quản lý Đơn Hàng</h1>
              <div className="filter-bar">
                  <span style={{fontWeight:'600', marginRight:'10px'}}>Xem ngày: </span>
                  <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="date-picker"/>
                  <button className="btn-search" onClick={fetchOrders}><FaSearch /> Lọc</button>
                  <button className="btn-refresh" onClick={fetchOrders}><FaSyncAlt /></button>
              </div>
            </header>
            <div className="table-wrapper">
              {loading ? <div className="loading-spinner">Đang tải dữ liệu...</div> : (
                <table className="admin-table">
                  <thead><tr><th>ID</th><th>Thời gian</th><th>Khách hàng</th><th>Chi tiết món</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead>
                  <tbody>
                    {orders.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>Không có đơn hàng nào trong ngày {new Date(filterDate).toLocaleDateString('vi-VN')}.</td></tr> :
                    orders.map(o => (
                      <tr key={o.id} className={o.status === 'pending' ? 'highlight-row' : ''}>
                        <td className="col-id">#{o.id}</td>
                        <td>{new Date(o.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</td>
                        <td><strong>{o.customer_name}</strong><br/><small className="text-muted"><FaPhone/> {o.phone}</small><br/><small className="text-muted">{o.address}</small></td>
                        <td>{o.items?.map((i, idx) => (<div key={idx} className="mini-item"><span className="qty-badge">{i.quantity}</span> {i.product_name}</div>))}{o.note && <div className="order-note">Note: {o.note}</div>}</td>
                        <td className="col-price">{formatPrice(o.total_amount)}</td>
                        <td>
                          <select className={`status-select ${o.status}`} value={o.status} onChange={(e) => handleOrderStatus(o.id, e.target.value)}>
                            <option value="pending">🟡 Chờ xác nhận</option><option value="preparing">🔵 Đang pha chế</option><option value="shipping">🛵 Đang giao</option><option value="completed">✅ Hoàn thành</option><option value="cancelled">🔴 Đã hủy</option>
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

        {/* === BOOKINGS === */}
        {activeTab === 'bookings' && (
            <>
                <header className="admin-header">
                    <h1 className="admin-title">Quản lý Đặt Bàn</h1>
                    <div className="filter-bar">
                        <button className={`btn-filter ${filterBookingType === 'upcoming' ? 'active' : ''}`} onClick={() => { setFilterBookingType('upcoming'); }}>Sắp tới</button>
                        <button className={`btn-filter ${filterBookingType === 'date' ? 'active' : ''}`} onClick={() => setFilterBookingType('date')}>Lịch sử theo ngày</button>
                        {filterBookingType === 'date' && (<input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="date-picker"/>)}
                        <button className="btn-search" onClick={fetchBookings}><FaSearch /> Xem</button>
                    </div>
                </header>
                <div className="table-wrapper">
                    {loading ? <div className="loading-spinner">Đang tải lịch đặt...</div> : (
                        <table className="admin-table">
                            <thead><tr><th>Mã</th><th>Giờ đến</th><th>Khách hàng</th><th>Vị trí & Yêu cầu</th><th>Món gọi trước</th><th>Trạng thái</th></tr></thead>
                            <tbody>
                                {bookings.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>Không có lịch đặt nào phù hợp.</td></tr> :
                                bookings.map(b => (
                                    <tr key={b.id} className={b.status === 'pending' ? 'highlight-row' : ''}>
                                        <td className="col-id">#{b.id}</td>
                                        <td><div className="time-highlight">{new Date(b.booking_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</div><div className="date-sub">{new Date(b.booking_time).toLocaleDateString('vi-VN')}</div></td>
                                        <td><strong>{b.full_name || 'Khách vãng lai'}</strong><br/>{b.phone && <small><FaPhone/> {b.phone}</small>}</td>
                                        <td><span className="info-tag branch">{b.branch_name}</span><div className="info-row"><FaChair/> Bàn {b.table_number} - {b.guest_count} khách</div>{b.note && <div className="order-note">"{b.note}"</div>}</td>
                                        <td>{b.items && b.items.length > 0 ? (b.items.map((i, idx) => (<div key={idx} className="mini-item"><span className="qty-badge">{i.quantity}</span> {i.product_name}</div>))) : <span className="text-muted" style={{fontStyle:'italic'}}>--</span>}</td>
                                        <td><select className={`status-select ${b.status}`} value={b.status} onChange={(e) => handleBookingStatus(b.id, e.target.value)}><option value="pending">🟡 Chờ duyệt</option><option value="confirmed">🔵 Đã nhận</option><option value="completed">✅ Đã xong</option><option value="cancelled">🔴 Hủy</option></select></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </>
        )}

        {/* === PRODUCTS === */}
        {activeTab === 'products' && (
          <>
            <header className="admin-header"><h1 className="admin-title">Quản lý Thực Đơn</h1><button className="btn-add" onClick={handleAddNewClick}><FaPlus /> Thêm món</button></header>
            {showForm && (
              <div className="form-overlay"><div className="form-modal"><h3>{editingProduct ? 'Cập nhật món' : 'Thêm món mới'}</h3><form onSubmit={handleFormSubmit}><div className="form-group"><label>Tên món</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div><div className="form-row-2"><div className="form-group"><label>Giá</label><input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required /></div><div className="form-group"><label>Tồn kho</label><input type="number" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} /></div></div><div className="form-group"><label>Danh mục</label><select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="form-group"><label>Ảnh</label><input type="file" onChange={(e) => { const file = e.target.files[0]; if(file) setFormData({ ...formData, file, preview: URL.createObjectURL(file) }); }} /></div><div className="form-actions"><button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Hủy</button><button type="submit" className="btn-save">Lưu</button></div></form></div></div>
            )}
            <div className="table-wrapper"><table className="admin-table"><thead><tr><th>Ảnh</th><th>Tên</th><th>Giá</th><th>Danh mục</th><th>Kho</th><th>Hành động</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><img src={p.image} className="product-thumb" alt=""/></td><td>{p.name}</td><td className="col-price">{formatPrice(p.price)}</td><td><span className="qty-badge">{categories.find(c=>c.id===p.category_id)?.name}</span></td><td>{p.stock_quantity}</td><td><div className="action-btns"><button className="btn-icon edit" onClick={() => handleEditClick(p)}><FaEdit/></button><button className="btn-icon delete" onClick={() => handleDeleteProduct(p.id)}><FaTrash/></button></div></td></tr>)}</tbody></table></div>
          </>
        )}

        {/* === CUSTOMERS === */}
        {activeTab === 'customers' && (
          <>
            <header className="admin-header"><h1 className="admin-title">Khách Hàng</h1><button className="btn-refresh" onClick={fetchCustomers}><FaSyncAlt /></button></header>
            <div className="table-wrapper"><table className="admin-table"><thead><tr><th>ID</th><th>Họ tên</th><th>Email</th><th>Vai trò</th></tr></thead><tbody>{customers.map(c => <tr key={c.id}><td>#{c.id}</td><td>{c.full_name}</td><td>{c.email}</td><td><span className={`role-badge ${c.role}`}>{c.role}</span></td></tr>)}</tbody></table></div>
          </>
        )}

      </main>
    </div>
  );
};

export default AdminPage;