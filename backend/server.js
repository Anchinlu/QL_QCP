// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http'); // 1. Import http
const { Server } = require('socket.io'); // 2. Import Socket.io
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();

// --- CẤU HÌNH SOCKET.IO ---
const server = http.createServer(app); // Tạo server http từ express app
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Link Frontend (quan trọng phải đúng port)
    methods: ["GET", "POST"]
  }
});

// Lắng nghe kết nối (để debug xem có ai vào không)
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Lưu biến 'io' vào app để dùng được ở Controller
app.set('socketio', io); 

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);

const PORT = process.env.PORT || 5000;

// Đổi app.listen thành server.listen
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});