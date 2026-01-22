// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// 1. Middleware kiểm tra đăng nhập (Dành cho User & Admin)
exports.verifyToken = (req, res, next) => {
    // Lấy token từ header Authorization (Dạng: "Bearer <token>")
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }

    try {
        // Giải mã token bằng mã bí mật
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // Lưu thông tin user vào biến req để dùng ở bước sau
        next(); // Cho phép đi tiếp
    } catch (err) {
        res.status(400).json({ message: 'Token không hợp lệ' });
    }
};

// 2. Middleware kiểm tra quyền Admin (Chỉ Admin mới qua được)
exports.verifyAdmin = (req, res, next) => {
    // Gọi hàm verifyToken trước để lấy thông tin user
    exports.verifyToken(req, res, () => {
        // Kiểm tra role trong token
        if (req.user.role === 'admin') {
            next(); // Là Admin -> Cho qua
        } else {
            res.status(403).json({ message: 'Bạn không có quyền truy cập Admin!' });
        }
    });
};