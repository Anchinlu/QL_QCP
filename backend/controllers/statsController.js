const db = require('../config/db');

// 1. Thống kê tổng quan (Cards trên cùng)
exports.getDashboardStats = async (req, res) => {
    try {
        // Doanh thu hôm nay
        const [todayRev] = await db.execute(`
            SELECT SUM(total_amount) as total FROM orders 
            WHERE status = 'completed' AND DATE(created_at) = CURRENT_DATE()
        `);

        // Tổng doanh thu toàn thời gian
        const [totalRev] = await db.execute(`
            SELECT SUM(total_amount) as total FROM orders WHERE status = 'completed'
        `);

        // Đơn hàng hôm nay
        const [todayOrders] = await db.execute(`
            SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURRENT_DATE()
        `);

        // Đặt bàn sắp tới (từ giờ trở đi)
        const [upcomingBookings] = await db.execute(`
            SELECT COUNT(*) as count FROM bookings 
            WHERE booking_time >= NOW() AND status IN ('pending', 'confirmed')
        `);

        res.json({
            revenue_today: todayRev[0].total || 0,
            revenue_total: totalRev[0].total || 0,
            orders_today: todayOrders[0].count || 0,
            bookings_upcoming: upcomingBookings[0].count || 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Biểu đồ doanh thu (Theo khoảng ngày)
exports.getRevenueChart = async (req, res) => {
    try {
        const { type } = req.query; // 'day' (7 ngày qua) hoặc 'month' (12 tháng qua)
        
        let sql = "";
        
        if (type === 'month') {
            // Thống kê theo tháng trong năm nay
            sql = `
                SELECT DATE_FORMAT(created_at, '%m/%Y') as label, SUM(total_amount) as value 
                FROM orders 
                WHERE status = 'completed' AND YEAR(created_at) = YEAR(CURRENT_DATE())
                GROUP BY label
                ORDER BY created_at ASC
            `;
        } else {
            // Mặc định: 7 ngày gần nhất
            sql = `
                SELECT DATE_FORMAT(created_at, '%d/%m') as label, SUM(total_amount) as value 
                FROM orders 
                WHERE status = 'completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY label
                ORDER BY created_at ASC
            `;
        }

        const [rows] = await db.execute(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Thống kê theo Danh mục món ăn
exports.getCategoryStats = async (req, res) => {
    try {
        // Join Order Items -> Products -> Categories
        const sql = `
            SELECT c.name, SUM(oi.quantity) as value
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            WHERE o.status = 'completed'
            GROUP BY c.name
        `;
        const [rows] = await db.execute(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTopProducts = async (req, res) => {
    try {
        const sql = `
            SELECT p.name, SUM(oi.quantity) as count
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.status != 'cancelled'
            GROUP BY p.name
            ORDER BY count DESC
            LIMIT 5
        `;
        const [rows] = await db.execute(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};