import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { 
  FaLeaf, FaLemon, FaStore, FaCalendarAlt, FaClock, 
  FaUserFriends, FaChair, FaCommentDots, FaUtensils, FaCheckCircle 
} from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { branches } from '../data/branches';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../Booking.css';

const MOCK_TABLES = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  label: `Bàn ${i + 1}`
}));

const BookingPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    branchId: '',
    bookingDate: '',
    bookingTime: '',
    guestCount: 2,
    tableNumber: '',
    note: ''
  });

  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [tableAvailability, setTableAvailability] = useState({}); // {tableId: 'available' | 'booked' | 'reserved'}
  const [currentReservation, setCurrentReservation] = useState(null); // Track current user's reservation
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) {
      toast.warning("Vui lòng đăng nhập để đặt bàn!");
      navigate('/login');
      return;
    }

    if (!loading && user) {
      api.get('/products')
        .then(res => setProducts(res.data))
        .catch(err => console.error("Lỗi lấy menu:", err));

      // Connect to Socket.IO only once
      if (!socketRef.current) {
        const token = localStorage.getItem('token');
        const newSocket = io('/', {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling']
        });
        socketRef.current = newSocket;

        newSocket.on('connect', () => {
          console.log('Socket.IO connected:', newSocket.id);
        });

        newSocket.on('connect_error', (error) => {
          console.log('Socket.IO connection error:', error);
        });

        newSocket.on('tableReserved', (data) => {
          console.log('Table reserved event received:', data);
          
          setTableAvailability(prev => {
            console.log('Updating table availability for table:', data.tableNumber);
            return {
              ...prev,
              [data.tableNumber]: 'reserved'
            };
          });
          
          // Also update formData if this was the user's current selection
          setFormData(currentFormData => {
            if (currentFormData.tableNumber == data.tableNumber) {
              console.log('Clearing user selection for reserved table');
              return { ...currentFormData, tableNumber: '' };
            }
            return currentFormData;
          });
        });

        newSocket.on('tableReservationCancelled', (data) => {
          console.log('Table reservation cancelled:', data);
          setTableAvailability(prev => {
            const newAvailability = { ...prev };
            delete newAvailability[data.tableNumber]; // Remove reservation
            return newAvailability;
          });
          
          // Also clear selection if this was the user's selected table
          setFormData(currentFormData => {
            if (currentFormData.tableNumber == data.tableNumber) {
              console.log('Clearing user selection for cancelled table');
              return { ...currentFormData, tableNumber: '' };
            }
            return currentFormData;
          });
        });
      }

      return () => {
        // Don't disconnect here, keep socket alive
      };
    }
  }, [user, loading, navigate]);

  // Listen for sessionStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'bookingFormData') {
        try {
          const parsed = JSON.parse(e.newValue);
          console.log('Updating form data from storage event:', parsed);
          setFormData(parsed);
        } catch (error) {
          console.error('Error parsing updated form data:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const reserveTable = useCallback(async (tableId) => {
    console.log('Reserving table:', tableId);
    console.log('Form data:', formData);
    
    if (!formData.branchId || !formData.bookingDate || !formData.bookingTime) {
      console.log('Missing form data');
      toast.error("Vui lòng chọn chi nhánh và thời gian trước!");
      return;
    }
    
    const bookingDateTime = `${formData.bookingDate}T${formData.bookingTime}`;
    console.log('Booking date time:', bookingDateTime);
    
    const requestBody = {
      branchId: parseInt(formData.branchId),
      bookingTime: bookingDateTime,
      tableNumber: parseInt(tableId)
    };
    console.log('Request body:', requestBody);
    
    try {
      const response = await api.post('/bookings/reserve', requestBody);

      setCurrentReservation(response.data.reservationId);
      toast.success("Đã khóa bàn tạm thời!");
      
      // Update local state
      setTableAvailability(prev => ({
        ...prev,
        [tableId]: 'reserved'
      }));
      
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể khóa bàn");
    }
  }, [formData]);

  const cancelReservation = useCallback(async (reservationId) => {
    try {
      await api.delete(`/bookings/reservation/${reservationId}`);
      setCurrentReservation(null);
    } catch (error) {
      console.error("Lỗi hủy reservation:", error);
    }
  }, []);

  const fetchTableAvailability = useCallback(async () => {
    if (!formData.branchId) return;
    
    // If no date/time, don't fetch yet
    if (!formData.bookingDate || !formData.bookingTime) {
      setTableAvailability({});
      return;
    }

    setIsLoadingTables(true);
    try {
      const bookingDateTime = `${formData.bookingDate}T${formData.bookingTime}`;
      
      const response = await api.get('/bookings/availability', {
        params: {
          branchId: formData.branchId,
          bookingTime: bookingDateTime
        }
      });

      setTableAvailability(response.data);
      
      // If user has locally selected a table, check if it's still available and auto-reserve
      if (formData.tableNumber && !currentReservation) {
        const tableStatus = response.data[formData.tableNumber];
        if (!tableStatus || tableStatus !== 'booked' && tableStatus !== 'reserved') {
          console.log('Auto-reserving user selected table:', formData.tableNumber);
          reserveTable(formData.tableNumber);
        } else {
          // Table not available, clear selection
          console.log('Table not available, clearing selection');
          setFormData(prev => ({ ...prev, tableNumber: '' }));
          toast.error("Bàn đã được đặt bởi khách khác!");
        }
      }
    } catch (error) {
      console.error("Lỗi lấy tình trạng bàn:", error);
      toast.error("Không thể tải tình trạng bàn");
    } finally {
      setIsLoadingTables(false);
    }
  }, [formData, currentReservation, reserveTable]);

  // Fetch table availability when branch changes (don't wait for date/time)
  useEffect(() => {
    if (formData.branchId) {
      fetchTableAvailability();
    }
  }, [formData.branchId, formData.bookingDate, formData.bookingTime, fetchTableAvailability]);

  // Load saved form data on mount
  useEffect(() => {
    const savedFormData = sessionStorage.getItem('bookingFormData');
    if (savedFormData) {
      try {
        const parsed = JSON.parse(savedFormData);
        console.log('Restoring form data:', parsed);
        setFormData(parsed);
      } catch (error) {
        console.error('Error parsing saved form data:', error);
      }
    }
  }, []);

  // Fetch table availability when formData changes
  useEffect(() => {
    fetchTableAvailability();
  }, [fetchTableAvailability]);

  // Cleanup reservation when component unmounts
  useEffect(() => {
    return () => {
      if (currentReservation) {
        cancelReservation(currentReservation);
      }
    };
  }, [currentReservation, cancelReservation]);

  const handleTableSelect = async (tableId) => {
    console.log('handleTableSelect called for table:', tableId);
    console.log('Current formData:', formData);
    console.log('Current tableAvailability:', tableAvailability);
    
    // Nếu đang chọn bàn này rồi, bỏ chọn
    if (formData.tableNumber === tableId) {
      console.log('Deselecting current table');
      setFormData({ ...formData, tableNumber: '' });
      if (currentReservation) {
        await cancelReservation(currentReservation);
        setCurrentReservation(null);
      }
      return;
    }

    // Nếu chưa chọn đầy đủ thông tin, chỉ set local selection mà không reserve
    if (!formData.branchId || !formData.bookingDate || !formData.bookingTime) {
      console.log('Setting local selection only');
      setFormData({ ...formData, tableNumber: tableId });
      toast.info("Vui lòng chọn chi nhánh và thời gian để khóa bàn!");
      return;
    }

    // Kiểm tra bàn có available không
    if (tableAvailability[tableId] === 'booked') {
      console.log('Table is booked');
      toast.error("Bàn này đã được đặt!");
      return;
    }

    if (tableAvailability[tableId] === 'reserved') {
      console.log('Table is reserved by someone else');
      toast.error("Bàn này đang được chọn bởi khách khác!");
      return;
    }

    console.log('Reserving table...');
    // Hủy reservation cũ nếu có
    if (currentReservation) {
      await cancelReservation(currentReservation);
    }

    // Reserve bàn mới
    await reserveTable(tableId);
    setFormData({ ...formData, tableNumber: tableId });
  };

  // Handle Chọn Món (+/-)
  const handleQuantityChange = (productId, change) => {
    setSelectedItems(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = currentQty + change;
      if (newQty <= 0) {
        const { [productId]: deleted, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit Đặt Bàn
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.branchId) return toast.error("Vui lòng chọn chi nhánh!");
    if (!formData.tableNumber) return toast.error("Vui lòng chọn bàn trên sơ đồ!");

    try {
      const fullDateTime = `${formData.bookingDate} ${formData.bookingTime}:00`;
      
      const itemsPayload = Object.keys(selectedItems).map(pId => {
        const product = products.find(p => p.id === parseInt(pId));
        return {
          id: product.id,
          price: product.price,
          quantity: selectedItems[pId]
        };
      });

      const payload = {
        branchId: formData.branchId,
        bookingTime: fullDateTime,
        guestCount: formData.guestCount,
        tableNumber: formData.tableNumber,
        note: formData.note,
        items: itemsPayload,
        reservationId: currentReservation // Thêm reservationId nếu có
      };

      const res = await api.post('/bookings', payload);

      if(res.status === 201) {
        toast.success("🎉 Đặt bàn thành công! Mã đơn: #" + res.data.bookingId);
        setCurrentReservation(null); // Clear reservation
        sessionStorage.removeItem('bookingFormData'); // Clear saved form data
        navigate('/');
      }

    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Lỗi đặt bàn");
    }
  };

  if (loading) {
    return (
      <div className="booking-page">
        <Navbar />
        <div className="booking-container" style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Đang tải...</h2>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="booking-page">
      <Navbar />
      
      {/* --- PHẦN TRANG TRÍ (DECORATION ICONS) --- */}
      {/* Thêm nhiều icon bay lượn để trang web sinh động */}
      <div className="booking-decor-wrapper">
         <div className="floating-icon leaf-1"><FaLeaf /></div>
         <div className="floating-icon leaf-2"><FaLemon /></div>
         <div className="floating-icon leaf-3"><FaLeaf /></div>
         <div className="floating-icon leaf-4"><FaLeaf /></div>
         <div className="floating-icon leaf-5"><FaLemon /></div>
         <div className="floating-icon leaf-6"><FaLeaf /></div>
      </div>

      <div className="booking-container">
        {/* HEADER ĐƯỢC TRAU CHUỐT HƠN */}
        <div className="booking-header">
           <h1 className="page-title">📅 Đặt Bàn Trực Tuyến</h1>
           <p className="page-subtitle">Giữ chỗ ngay để thưởng thức trọn vẹn không gian & hương vị Chinlu</p>
        </div>
        
        <form onSubmit={handleSubmit} className="booking-layout">
          
          {/* === CỘT TRÁI: THÔNG TIN & SƠ ĐỒ === */}
          <div className="booking-info-card">
            <h3 className="card-title"><FaCheckCircle className="icon-title"/> 1. Thông tin đặt chỗ</h3>
            
            <div className="form-group">
              <label><FaStore className="input-icon"/> Chọn Quán</label>
              <select name="branchId" className="form-control" onChange={handleChange} required>
                <option value="">-- Chọn chi nhánh gần bạn --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} - {b.address}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><FaCalendarAlt className="input-icon"/> Ngày đến</label>
                <input type="date" name="bookingDate" className="form-control" onChange={handleChange} required/>
              </div>
              <div className="form-group">
                <label><FaClock className="input-icon"/> Giờ đến</label>
                <input type="time" name="bookingTime" className="form-control" onChange={handleChange} required/>
              </div>
            </div>

            <div className="form-group">
              <label><FaUserFriends className="input-icon"/> Số người</label>
              <input type="number" name="guestCount" className="form-control" min="1" max="20" value={formData.guestCount} onChange={handleChange} />
            </div>

            {/* SƠ ĐỒ BÀN */}
            <div className="form-group">
              <label><FaChair className="input-icon"/> Chọn vị trí ngồi ({formData.tableNumber ? `Đang chọn Bàn ${formData.tableNumber}` : 'Vui lòng chọn bàn'})</label>
              <div className="table-map-section">
                <div className="map-legend">
                  <div className="legend-item"><span className="box available"></span> Trống</div>
                  <div className="legend-item"><span className="box selected"></span> Đang chọn</div>
                  <div className="legend-item"><span className="box reserved"></span> Đang được chọn</div>
                  <div className="legend-item"><span className="box booked"></span> Đã đặt</div>
                </div>
                <div className="table-grid">
                  {MOCK_TABLES.map((table) => {
                    const status = tableAvailability[table.id];
                    const isSelected = formData.tableNumber == table.id;
                    
                    let className = 'table-seat';
                    if (isSelected) className += ' active';
                    if (status === 'booked') className += ' booked';
                    if (status === 'reserved') className += ' reserved';
                    
                    return (
                      <div 
                        key={table.id}
                        className={className}
                        onClick={() => handleTableSelect(table.id)}
                        title={
                          status === 'booked' ? 'Đã đặt' :
                          status === 'reserved' ? 'Đang được chọn' :
                          isSelected ? 'Đang chọn' : 'Có sẵn'
                        }
                      >
                        <span>🍽️</span>
                        <span>{table.id}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label><FaCommentDots className="input-icon"/> Ghi chú thêm</label>
              <textarea name="note" className="form-control" rows="2" placeholder="VD: Trang trí sinh nhật, cần ghế trẻ em..." onChange={handleChange}></textarea>
            </div>
          </div>

          {/* === CỘT PHẢI: CHỌN MÓN === */}
          <div className="booking-menu-card">
            <h3 className="card-title"><FaUtensils className="icon-title"/> 2. Gọi món trước (Tùy chọn)</h3>
            <p className="hint-text">Món sẽ được chuẩn bị sẵn khi bạn đến để tiết kiệm thời gian chờ đợi.</p>
            
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

            <button type="submit" className="btn-confirm-booking">
              Xác Nhận Đặt Bàn
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default BookingPage;