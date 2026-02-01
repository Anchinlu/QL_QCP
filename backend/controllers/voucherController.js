const db = require('../config/db');

// Kiểm tra mã giảm giá
exports.checkVoucher = async (req, res) => {
    const { code, totalAmount } = req.body;

    try {
        const [rows] = await db.execute("SELECT * FROM vouchers WHERE code = ?", [code]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Mã giảm giá không tồn tại!" });
        }

        const voucher = rows[0];
        const now = new Date();

        // Kiểm tra hết hạn
        if (new Date(voucher.expiration_date) < now) {
            return res.status(400).json({ message: "Mã giảm giá đã hết hạn!" });
        }

        // Kiểm tra số lần dùng
        if (voucher.used_count >= voucher.usage_limit) {
            return res.status(400).json({ message: "Mã giảm giá đã hết lượt sử dụng!" });
        }

        // Kiểm tra giá trị đơn tối thiểu
        if (totalAmount < voucher.min_order_value) {
            return res.status(400).json({ message: `Đơn hàng phải từ ${voucher.min_order_value.toLocaleString()}đ mới được dùng mã này!` });
        }

        // Trả về số tiền được giảm
        res.status(200).json({
            success: true,
            discount: voucher.discount_amount,
            message: "Áp dụng mã thành công!"
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};