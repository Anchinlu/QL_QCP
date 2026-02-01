import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { branches } from '../data/branches';
import '../Auth.css'; 
import { toast } from 'react-toastify';

const AuthPage = () => {
  const [isLoginMode, setIsLoginMode] = useState(true); 
  const { login, register } = useAuth(); 
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    address: '',
    branchId: '' 
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (isLoginMode) {
        await login(formData.email, formData.password);
        toast.success("Chào mừng bạn quay lại! ☕");
        navigate('/menu'); 

      } else {
        const newUser = {
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          address: formData.address,
          branchId: formData.branchId 
        };
        
        await register(newUser);
        
        toast.success("Đăng ký thành công! Hãy đăng nhập ngay. ✨");
        setIsLoginMode(true);
        setFormData(prev => ({ ...prev, password: '' }));
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="auth-page">
      <Navbar />
      
      <div className="auth-container">
        <div className="auth-card">
          {/* Header chuyển đổi */}
          <div className="auth-toggle">
            <button 
              className={isLoginMode ? 'active' : ''} 
              onClick={() => setIsLoginMode(true)}
            >
              Đăng Nhập
            </button>
            <button 
              className={!isLoginMode ? 'active' : ''} 
              onClick={() => setIsLoginMode(false)}
            >
              Đăng Ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <h2 className="form-title">
              {isLoginMode ? 'Chào mừng trở lại!' : 'Tham gia Chinlu Quán'}
            </h2>

            {/* --- CÁC TRƯỜNG CỦA ĐĂNG KÝ --- */}
            {!isLoginMode && (
              <>
                <div className="form-group">
                  <label>Họ và Tên</label>
                  <input type="text" name="fullName" placeholder="Nguyễn Văn A" required onChange={handleChange} />
                </div>
                
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input type="tel" name="phone" placeholder="0909xxxxxx" required onChange={handleChange} />
                </div>

                {/* --- CHỌN KHU VỰC CHI NHÁNH --- */}
                <div className="form-group">
                  <label>Khu vực giao hàng (Trà Vinh)</label>
                  <select name="branchId" required onChange={handleChange} defaultValue="">
                    <option value="" disabled>-- Chọn khu vực của bạn --</option>
                    {branches.map((b) => (
                      <optgroup key={b.id} label={b.name}>
                          {b.areas.map(area => (
                            <option key={area} value={b.id}>{area} (Thuộc {b.name})</option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Địa chỉ cụ thể</label>
                  <input type="text" name="address" placeholder="Số nhà, tên đường..." required onChange={handleChange} />
                </div>
              </>
            )}

            {/* --- CÁC TRƯỜNG CHUNG --- */}
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" placeholder="example@gmail.com" required onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Mật khẩu</label>
              <input type="password" name="password" placeholder="******" required onChange={handleChange} value={formData.password} />
            </div>

            <button type="submit" className="btn-submit">
              {isLoginMode ? 'Đăng Nhập Ngay' : 'Đăng Ký Tài Khoản'}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AuthPage;