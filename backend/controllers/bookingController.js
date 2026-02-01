const db = require('../config/db');

const createBooking = async (req, res) => {
    try {
        const userId = req.user.id; 
        const { branchId, bookingTime, guestCount, tableNumber, note, items } = req.body;

        if (!branchId || !bookingTime || !guestCount) {
            return res.status(400).json({ message: 'Thiếu thông tin đặt bàn!' });
        }

        const sqlBooking = `INSERT INTO bookings (user_id, branch_id, booking_time, guest_count, table_number, note) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.execute(sqlBooking, [userId, branchId, bookingTime, guestCount, tableNumber, note]);
        
        if (items && items.length > 0) {
            const bookingId = result.insertId;
            const itemValues = items.map(item => [bookingId, item.id, item.quantity, item.price]);
            await db.query(`INSERT INTO booking_items (booking_id, product_id, quantity, price) VALUES ?`, [itemValues]);
        }

        res.status(201).json({ message: 'Đặt bàn thành công!', bookingId: result.insertId });
    } catch (error) {
        console.error("Booking Error:", error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const getMyBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const [bookings] = await db.execute('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const getAllBookings = async (req, res) => {
    try {
        const sql = `
            SELECT b.*, u.full_name, u.phone 
            FROM bookings b 
            LEFT JOIN users u ON b.user_id = u.id 
            ORDER BY b.booking_time DESC
        `;
        const [bookings] = await db.execute(sql);

        for (let booking of bookings) {
            const [items] = await db.execute(
                `SELECT bi.quantity, p.name as product_name, bi.price 
                 FROM booking_items bi 
                 JOIN products p ON bi.product_id = p.id 
                 WHERE bi.booking_id = ?`, 
                [booking.id]
            );
            booking.items = items;
        }

        res.json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi lấy danh sách đặt bàn' });
    }
};

const updateBookingStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        await db.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Cập nhật trạng thái thành công!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi cập nhật' });
    }
};

// --- QUAN TRỌNG NHẤT: XUẤT ĐỦ 4 HÀM ---
module.exports = {
    createBooking,
    getMyBookings,
    getAllBookings,
    updateBookingStatus 
};