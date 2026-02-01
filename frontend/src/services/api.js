import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5001/api',
});

// Tự động gắn Token vào mỗi request nếu đã đăng nhập
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    console.log('API Request:', config.url, 'Token exists:', !!token);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Added Authorization header');
    } else {
        console.log('No token found in localStorage');
    }
    return config;
});

export default api;