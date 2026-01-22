// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// 1. Import Middleware xác thực (Quan trọng!)
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// --- ROUTES ---

// Tạo đơn hàng (BẮT BUỘC PHẢI CÓ verifyToken ĐỂ LẤY user_id)
// Nếu bạn muốn cho khách vãng lai mua, middleware này phải xử lý khéo léo hơn, 
// nhưng hiện tại hệ thống yêu cầu user_id nên bắt buộc phải đăng nhập.
router.post('/create', verifyToken, orderController.createOrder);

// Lấy lịch sử đơn hàng của tôi
router.get('/my-orders', verifyToken, orderController.getMyOrders);

// ADMIN: Lấy tất cả đơn
router.get('/admin/all', verifyToken, verifyAdmin, orderController.getAllOrders);

// ADMIN: Cập nhật trạng thái
router.put('/admin/update-status/:orderId', verifyToken, verifyAdmin, orderController.updateOrderStatus);

module.exports = router;