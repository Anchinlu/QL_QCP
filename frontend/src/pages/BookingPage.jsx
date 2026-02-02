import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { 
  FaLeaf, FaLemon, FaStore, FaCalendarAlt, FaClock, 
  FaUserFriends, FaChair, FaCommentDots, FaUtensils, FaCheckCircle, FaInfoCircle
} from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { branches } from '../data/branches';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../Booking.css';

const BookingPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // State quản lý Form
  const [formData, setFormData] = useState({
    branchId: '',
    bookingDate: '',
    bookingTime: '',
    guestCount: 2,
    tableId: '', 
    note: ''
  });

  // --- QUAN TRỌNG: Dùng Ref để Socket luôn đọc được State mới nhất ---
  const formDataRef = useRef(formData);
  useEffect(() => {
      formDataRef.current = formData;
  }, [formData]);

  // State dữ liệu
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]); 
  const [selectedItems, setSelectedItems] = useState({});
  const [tableAvailability, setTableAvailability] = useState({});
  const [currentReservation, setCurrentReservation] = useState(null);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  
  const socketRef = useRef(null);

  // --- HÀM KIỂM TRA TRÙNG KHUNG GIỜ (LOGIC MỚI) ---
  const isTimeOverlapping = (eventBookingTime) => {
      const current = formDataRef.current;
      // Nếu người dùng chưa chọn ngày giờ thì không cần check (hoặc mặc định update)
      if (!current.bookingDate || !current.bookingTime || !eventBookingTime) return false;

      // 1. Xác định khung giờ người dùng đang xem (Start -> End + 2h)
      const viewStart = new Date(`${current.bookingDate}T${current.bookingTime}`);
      const viewEnd = new Date(viewStart.getTime() + 2 * 60 * 60 * 1000); // Giả sử ăn 2 tiếng

      // 2. Xác định khung giờ sự kiện từ Socket (Start -> End + 2h)
      const eventStart = new Date(eventBookingTime);
      const eventEnd = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);

      // 3. Logic giao thoa (Overlap) + Buffer 15 phút dọn dẹp
      // Công thức: (StartA < EndB) && (EndA > StartB)
      const buffer = 15 * 60 * 1000;
      const viewStartWithBuffer = new Date(viewStart.getTime() - buffer);
      const viewEndWithBuffer = new Date(viewEnd.getTime() + buffer);

      const isOverlap = (viewStartWithBuffer < eventEnd) && (viewEndWithBuffer > eventStart);
      
      return isOverlap;
  };

  // 1. KẾT NỐI SOCKET & LẤY MENU
  useEffect(() => {
    if (!loading && !user) {
      toast.warning("Vui lòng đăng nhập để đặt bàn!");
      navigate('/login');
      return;
    }

    if (!loading && user) {
      // Lấy danh sách món ăn
      api.get('/products')
        .then(res => setProducts(res.data))
        .catch(err => console.error("Lỗi lấy menu:", err));

      // KẾT NỐI SOCKET
      if (!socketRef.current) {
        const newSocket = io('http://localhost:5001', {
          transports: ['websocket'],
          reconnection: true,
        });
        socketRef.current = newSocket;

        newSocket.on('connect', () => {
          console.log('✅ Đã kết nối Socket:', newSocket.id);
        });

        // --- SỰ KIỆN: BÀN ĐƯỢC GIỮ ---
        newSocket.on('tableReserved', (data) => {
          // CHỈ UPDATE NẾU TRÙNG KHUNG GIỜ
          if (isTimeOverlapping(data.bookingTime)) {
              console.log(`📡 Bàn ${data.tableId} vừa được giữ vào giờ trùng khớp`);
              setTableAvailability(prev => ({
                ...prev,
                [data.tableId]: 'reserved'
              }));

              // Nếu mình đang chọn bàn đó mà bị người khác cướp
              setFormData(curr => {
                if (curr.tableId === data.tableId && !currentReservation) { 
                   toast.warning("Bàn này vừa được khách khác chọn!");
                   return { ...curr, tableId: '' }; // Bỏ chọn
                }
                return curr;
              });
          }
        });

        // --- SỰ KIỆN: BÀN ĐƯỢC NHẢ ---
        newSocket.on('tableReleased', (data) => {
          // CHỈ UPDATE NẾU TRÙNG KHUNG GIỜ
          if (isTimeOverlapping(data.bookingTime)) {
              console.log(`📡 Bàn ${data.tableId} vừa được nhả`);
              setTableAvailability(prev => {
                const newAvail = { ...prev };
                delete newAvail[data.tableId];
                return newAvail;
              });
          }
        });
      }
    }

    return () => {
      // Cleanup nếu cần (thường socket.io client tự handle tốt)
    };
  }, [user, loading, navigate, currentReservation]);

  // 2. KHÔI PHỤC TRẠNG THÁI NẾU F5 (RE-HYDRATE)
  useEffect(() => {
    const restoreSession = async () => {
        if (!user) return;
        try {
            const res = await api.get('/bookings/current-hold');
            if (res.data.exists) {
                const d = res.data;
                console.log("♻️ Khôi phục phiên giữ bàn:", d);
                
                setCurrentReservation(d.reservationId);
                
                const dateObj = new Date(d.bookingTime);
                // Xử lý múi giờ cục bộ để hiển thị đúng trên input date/time
                // Lưu ý: toISOString() trả về UTC, cần convert sang Local time string phù hợp input
                const dateStr = dateObj.toLocaleDateString('en-CA'); // Định dạng YYYY-MM-DD
                const timeStr = dateObj.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'});

                setFormData(prev => ({
                    ...prev,
                    branchId: d.branchId,
                    tableId: d.tableId,
                    bookingDate: dateStr,
                    bookingTime: timeStr,
                    guestCount: prev.guestCount 
                }));
                
                setTableAvailability(prev => ({ ...prev, [d.tableId]: 'reserved' }));
                toast.info(`Chào mừng trở lại! Bạn đang giữ bàn ${d.tableNumber}.`);
            }
        } catch (error) {
            console.error("Lỗi khôi phục session:", error);
        }
    };
    restoreSession();
  }, [user]);

  // 3. LẤY DANH SÁCH BÀN KHI CHỌN CHI NHÁNH
  useEffect(() => {
    if (formData.branchId) {
      setIsLoadingTables(true);
      api.get(`/tables/branch/${formData.branchId}`)
         .then(res => {
            setTables(res.data);
            setIsLoadingTables(false);
         })
         .catch(err => {
            console.error(err);
            toast.error("Không thể tải sơ đồ bàn!");
            setIsLoadingTables(false);
         });
    } else {
      setTables([]);
    }
  }, [formData.branchId]);

  // 4. LẤY TÌNH TRẠNG BÀN (Polling mỗi khi đổi ngày giờ)
  const fetchTableAvailability = useCallback(async () => {
    // Chỉ fetch khi đủ thông tin
    if (!formData.branchId || !formData.bookingDate || !formData.bookingTime) return;

    try {
      const bookingDateTime = `${formData.bookingDate}T${formData.bookingTime}`;
      const res = await api.get('/bookings/availability', {
        params: {
          branchId: formData.branchId,
          bookingTime: bookingDateTime
        }
      });
      setTableAvailability(res.data);
    } catch (error) {
      console.error("Lỗi check bàn:", error);
    }
  }, [formData.branchId, formData.bookingDate, formData.bookingTime]);

  useEffect(() => {
    fetchTableAvailability();
  }, [fetchTableAvailability]);

  // 5. XỬ LÝ CHỌN BÀN (GIỮ/HỦY)
  const handleTableSelect = async (table) => {
    // A. Validation
    if (!formData.branchId || !formData.bookingDate || !formData.bookingTime) {
      toast.info("Vui lòng chọn ngày và giờ trước khi chọn bàn!");
      return;
    }

    const isMyTable = formData.tableId === table.id;

    // Nếu bàn đang bận (và không phải của mình)
    if (tableAvailability[table.id] && !isMyTable) {
      toast.error(tableAvailability[table.id] === 'booked' ? "Bàn này đã có người đặt!" : "Bàn đang được khách khác giữ!");
      return;
    }

    // --- TRƯỜNG HỢP 1: ĐANG CHỌN CHÍNH BÀN NÀY -> HỦY ---
    if (isMyTable) {
        setFormData({ ...formData, tableId: '' });
        
        if (currentReservation) {
            try {
                await api.delete(`/bookings/reservation/${currentReservation}`);
                setCurrentReservation(null);
                
                setTableAvailability(prev => {
                    const newAvail = { ...prev };
                    delete newAvail[table.id];
                    return newAvail;
                });
                toast.info("Đã hủy giữ bàn.");
            } catch (error) {
                console.error("Lỗi hủy bàn:", error);
                toast.error("Lỗi kết nối khi hủy bàn.");
            }
        }
        return;
    }

    // --- TRƯỜNG HỢP 2: ĐỔI SANG BÀN KHÁC ---
    if (currentReservation) {
        try {
            await api.delete(`/bookings/reservation/${currentReservation}`);
            setTableAvailability(prev => {
                const newAvail = { ...prev };
                delete newAvail[formData.tableId];
                return newAvail;
            });
        } catch (error) {
            console.error("Lỗi hủy bàn cũ:", error);
        }
    }

    // --- TRƯỜNG HỢP 3: GIỮ BÀN MỚI ---
    try {
      const bookingDateTime = `${formData.bookingDate}T${formData.bookingTime}`;
      
      const res = await api.post('/bookings/reserve', {
        branchId: formData.branchId,
        bookingTime: bookingDateTime,
        tableId: table.id
      });

      setCurrentReservation(res.data.reservationId);
      
      // Auto-fill số người
      setFormData({ 
        ...formData, 
        tableId: table.id,
        guestCount: table.capacity 
      });
      
      setTableAvailability(prev => ({ ...prev, [table.id]: 'reserved' }));
      toast.success(`Đã giữ bàn ${table.table_number}. Tối đa ${table.capacity} khách.`);

    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể giữ bàn này!");
      // Refresh lại nếu lỗi đồng bộ
      fetchTableAvailability(); 
    }
  };

  // Xử lý Input Form
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuantityChange = (productId, change) => {
    setSelectedItems(prev => {
      const newQty = (prev[productId] || 0) + change;
      if (newQty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  // 6. GỬI ĐƠN ĐẶT BÀN (CONFIRM)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentReservation) {
      toast.error("Vui lòng chọn một bàn trên sơ đồ!");
      return;
    }

    try {
      const itemsPayload = Object.keys(selectedItems).map(pId => {
        const product = products.find(p => p.id === parseInt(pId));
        return {
          id: product.id,
          price: product.price,
          quantity: selectedItems[pId]
        };
      });

      const res = await api.post('/bookings', {
        reservationId: currentReservation,
        guestCount: formData.guestCount,
        note: formData.note,
        items: itemsPayload
      });

      if (res.status === 201) {
        toast.success("🎉 Đặt bàn thành công!");
        setFormData({ ...formData, tableId: '', note: '' });
        setCurrentReservation(null);
        setSelectedItems({});
        navigate('/'); 
      }

    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xác nhận đặt bàn");
    }
  };

  if (loading) return <div className="text-center p-5">Đang tải...</div>;

  const selectedTable = tables.find(t => t.id === formData.tableId);
  const maxGuests = selectedTable ? selectedTable.capacity : 20;

  return (
    <div className="booking-page">
      <Navbar />
      
      <div className="booking-decor-wrapper">
         <div className="floating-icon leaf-1"><FaLeaf /></div>
         <div className="floating-icon leaf-2"><FaLemon /></div>
         <div className="floating-icon leaf-3"><FaLeaf /></div>
      </div>

      <div className="booking-container">
        <div className="booking-header">
           <h1 className="page-title">📅 Đặt Bàn Giữ Chỗ</h1>
           <p className="page-subtitle">Chọn vị trí yêu thích - Giữ chỗ ngay lập tức</p>
        </div>
        
        <form onSubmit={handleSubmit} className="booking-layout">
          
          {/* CỘT TRÁI */}
          <div className="booking-info-card">
            <h3 className="card-title"><FaCheckCircle className="icon-title"/> 1. Thông tin đặt chỗ</h3>
            
            <div className="form-group">
              <label><FaStore className="input-icon"/> Chọn Quán</label>
              <select name="branchId" className="form-control" onChange={handleChange} value={formData.branchId} required>
                <option value="">-- Chọn chi nhánh --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><FaCalendarAlt className="input-icon"/> Ngày</label>
                <input type="date" name="bookingDate" className="form-control" onChange={handleChange} value={formData.bookingDate} required/>
              </div>
              <div className="form-group">
                <label><FaClock className="input-icon"/> Giờ</label>
                <input type="time" name="bookingTime" className="form-control" onChange={handleChange} value={formData.bookingTime} required/>
              </div>
            </div>

            <div className="form-group">
              <label><FaUserFriends className="input-icon"/> Số người</label>
              <input 
                type="number" 
                name="guestCount" 
                className="form-control" 
                min="1" 
                max={maxGuests} 
                value={formData.guestCount} 
                onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (selectedTable && val > selectedTable.capacity) {
                        toast.warning(`Bàn này chỉ ngồi được tối đa ${selectedTable.capacity} người thôi!`);
                        return;
                    }
                    setFormData({ ...formData, guestCount: e.target.value });
                }} 
              />
              {selectedTable && (
                  <small className="text-muted" style={{fontSize: '0.8rem', display: 'block', marginTop: '5px'}}>
                      * Tối đa {selectedTable.capacity} người cho bàn {selectedTable.table_number}
                  </small>
              )}
            </div>

            {/* SƠ ĐỒ BÀN */}
            <div className="form-group">
              <label><FaChair className="input-icon"/> Chọn vị trí ({tables.length} bàn)</label>
              
              {!formData.branchId ? (
                <div className="alert alert-info"><FaInfoCircle/> Vui lòng chọn chi nhánh để xem sơ đồ</div>
              ) : isLoadingTables ? (
                <div className="text-center">Đang tải sơ đồ...</div>
              ) : (
                <div className="table-map-section">
                  <div className="map-legend">
                    <div className="legend-item"><span className="box available"></span> Trống</div>
                    <div className="legend-item"><span className="box selected"></span> Của bạn</div>
                    <div className="legend-item"><span className="box reserved"></span> Đang giữ</div>
                    <div className="legend-item"><span className="box booked"></span> Đã đặt</div>
                  </div>
                  
                  <div className="table-grid">
                    {tables.map((table) => {
                      const status = tableAvailability[table.id];
                      const isMyTable = formData.tableId === table.id;
                      
                      let className = 'table-seat';
                      if (status === 'booked') className += ' booked';
                      else if (status === 'reserved' && !isMyTable) className += ' reserved';
                      else if (isMyTable) className += ' active';
                      
                      return (
                        <div 
                          key={table.id}
                          className={className}
                          onClick={() => handleTableSelect(table)}
                          title={`Bàn ${table.table_number}`}
                        >
                          <span>🍽️</span>
                          <span className="table-name">{table.table_number}</span>
                          <span className="table-cap">({table.capacity} người)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label><FaCommentDots className="input-icon"/> Ghi chú</label>
              <textarea name="note" className="form-control" rows="2" placeholder="Yêu cầu đặc biệt..." onChange={handleChange} value={formData.note}></textarea>
            </div>
          </div>

          {/* CỘT PHẢI */}
          <div className="booking-menu-card">
            <h3 className="card-title"><FaUtensils className="icon-title"/> 2. Gọi món trước</h3>
            <div className="mini-menu-list">
              {products.map(product => (
                <div key={product.id} className="mini-product-item">
                  <img src={product.image} alt={product.name} />
                  <div className="mini-info">
                    <span className="name">{product.name}</span>
                    <span className="price">{parseInt(product.price).toLocaleString()}đ</span>
                  </div>
                  <div className="qty-control">
                    <button type="button" onClick={() => handleQuantityChange(product.id, -1)}>-</button>
                    <span>{selectedItems[product.id] || 0}</span>
                    <button type="button" onClick={() => handleQuantityChange(product.id, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <button type="submit" className="btn-confirm-booking" disabled={!currentReservation}>
              {currentReservation ? "Xác Nhận Đặt Bàn" : "Vui Lòng Chọn Bàn"}
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default BookingPage;