import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      
      const { user, token } = res.data;
      
      setUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('token', token);
      
      alert('Đăng nhập thành công!');
      return true;

    } catch (error) {
      alert(error.response?.data?.message || 'Đăng nhập thất bại');
      return false;
    }
  };

  const register = async (userData) => {
    try {
      await api.post('/auth/register', userData);
      alert('Đăng ký thành công! Vui lòng đăng nhập.');
      return true; // Báo OK để chuyển sang tab đăng nhập
    } catch (error) {
      alert(error.response?.data?.message || 'Đăng ký thất bại');
      return false;
    }
  };

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