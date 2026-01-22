import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api'; // Import axios instance

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Khi F5 trang, kiểm tra localStorage xem còn lưu user không
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // 1. Hàm Đăng Nhập (Gọi API thật)
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      
      // Nếu thành công:
      const { user, token } = res.data;
      
      setUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('token', token); // Lưu token quan trọng này
      
      alert('Đăng nhập thành công!');
      return true; // Báo cho trang Login biết là OK

    } catch (error) {
      alert(error.response?.data?.message || 'Đăng nhập thất bại');
      return false;
    }
  };

  // 2. Hàm Đăng Ký (Gọi API thật)
  const register = async (userData) => {
    try {
      // userData gồm: fullName, email, password, phone, address, branchId...
      await api.post('/auth/register', userData);
      alert('Đăng ký thành công! Vui lòng đăng nhập.');
      return true; // Báo OK để chuyển sang tab đăng nhập
    } catch (error) {
      alert(error.response?.data?.message || 'Đăng ký thất bại');
      return false;
    }
  };

  // 3. Hàm Đăng Xuất
  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};