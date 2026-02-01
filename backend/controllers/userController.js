const db = require('../config/db');

// Lấy danh sách toàn bộ người dùng (Chỉ Admin mới được gọi)
exports.getAllUsers = async (req, res) => {
    try {
        // Lấy hết trừ password để bảo mật
        const sql = `SELECT id, full_name, email, phone, address, role, created_at FROM users ORDER BY created_at DESC`;
        const [users] = await db.execute(sql);
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi lấy danh sách khách hàng' });
    }
};