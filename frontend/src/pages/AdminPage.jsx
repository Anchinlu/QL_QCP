// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../Admin.css';
import { 
  FaLeaf, FaClipboardList, FaUsers, FaChartPie, FaSignOutAlt, FaSyncAlt,
  FaDollarSign, FaShoppingBag, FaCoffee, FaPlus, FaEdit, FaTrash
} from 'react-icons/fa';
import { toast } from 'react-toastify';

// 1. Import Socket Client
import { io } from 'socket.io-client';

const AdminPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('orders');
  
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', price: '', image: '', description: '', category_id: '', file: null, preview: null
  });

  // --- 2. CẤU HÌNH SOCKET.IO ---
  useEffect(() => {
    // Chỉ kết nối khi là Admin
    if (user && user.role === 'admin') {
        const socket = io('http://localhost:5000'); // Kết nối tới Backend

        // Lắng nghe sự kiện 'new_order' từ Server
        socket.on('new_order', (newOrder) => {
            // A. Hiện thông báo kèm âm thanh "Ting ting" (bằng icon chuông)
            toast.info(
                <div>
                    <strong>🔔 Ting ting! Đơn hàng mới!</strong><br/>
                    Khách: {newOrder.customer_name}<br/>
                    Tổng: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(newOrder.total_amount)}
                </div>, 
                { autoClose: 5000 }
            );

            // B. Cập nhật danh sách đơn hàng ngay lập tức (Thêm vào đầu mảng)
            setOrders(prevOrders => [newOrder, ...prevOrders]);
        });

        // Dọn dẹp khi thoát trang (Ngắt kết nối)
        return () => {
            socket.disconnect();
        };
    }
  }, [user]);
  // -----------------------------

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error("Bạn không có quyền truy cập trang này! ⛔");
      navigate('/'); 
    } else if (user) {
      loadData();
    }
  }, [user, navigate, activeTab]);

  const loadData = () => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'products') fetchProducts();
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders/admin/all');
      setOrders(res.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/categories')
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/admin/update-status/${orderId}`, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Đã cập nhật đơn #${orderId}!`);
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
  const totalRevenue = orders.reduce((sum, o) => o.status !== 'cancelled' ? sum + Number(o.total_amount) : sum, 0);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-logo"><FaLeaf /> CHINLU ADMIN</div>
        <nav className="admin-menu">
          <div className={`admin-menu-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <FaClipboardList /> Quản lý Đơn Hàng
          </div>
          <div className={`admin-menu-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            <FaCoffee /> Quản lý Món Ăn
          </div>
          <div className="admin-menu-item"><FaUsers /> Khách hàng</div>
          <div className="sidebar-footer">
            <div className="admin-menu-item" onClick={() => navigate('/')}>← Về trang chủ</div>
            <div className="admin-menu-item" onClick={handleLogout} style={{color: '#ef4444'}}><FaSignOutAlt /> Đăng xuất</div>
          </div>
        </nav>
      </aside>

      <main className="admin-main">
        {activeTab === 'orders' && (
          <>
            <header className="admin-header">
              <h1 className="admin-title">Quản lý Đơn Hàng</h1>
              <button className="btn-refresh" onClick={fetchOrders}><FaSyncAlt /> Làm mới</button>
            </header>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><FaDollarSign /></div>
                <div className="stat-info"><span className="stat-label">Doanh thu</span><span className="stat-value">{formatPrice(totalRevenue)}</span></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><FaShoppingBag /></div>
                <div className="stat-info"><span className="stat-label">Đơn hàng</span><span className="stat-value">{orders.length}</span></div>
              </div>
            </div>

            <div className="table-wrapper">
              {loading ? <p style={{padding: '20px'}}>Loading...</p> : (
                <table className="admin-table">
                  <thead>
                    <tr><th>ID</th><th>Ngày</th><th>Khách</th><th>Món</th><th>Tổng</th><th>TT</th></tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} className={o.status === 'pending' ? 'new-order-highlight' : ''}>
                        <td className="col-id">#{o.id}</td>
                        <td>{formatDate(o.created_at)}</td>
                        <td className="col-customer"><strong>{o.customer_name}</strong><br/><small>{o.phone}</small></td>
                        <td>
                          <div className="item-list-mini">
                            {o.items?.map((i, idx) => <div key={idx} className="mini-item"><span className="qty-badge">{i.quantity}</span> {i.product_name}</div>)}
                            {o.note && <span className="order-note">Note: {o.note}</span>}
                          </div>
                        </td>
                        <td className="col-total">{formatPrice(o.total_amount)}</td>
                        <td>
                          <select className={`status-select ${o.status}`} value={o.status} onChange={(e) => handleStatusChange(o.id, e.target.value)}>
                            <option value="pending">🟡 Chờ</option><option value="preparing">🔵 Pha chế</option>
                            <option value="shipping">🟢 Giao</option><option value="completed">✅ Xong</option><option value="cancelled">🔴 Hủy</option>
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
      </main>
    </div>
  );
};

export default AdminPage;