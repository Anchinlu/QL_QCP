const db = require('../config/db');

// --- CẤU HÌNH ---
const SLOT_DURATION_HOURS = 2; // Mỗi lượt ăn mặc định 2 tiếng
const CLEANUP_BUFFER_MINUTES = 15; // Thời gian dọn dẹp giữa 2 ca

// Hàm tính thời gian kết thúc (Start + Duration)
const getEndTime = (startTime) => {
    const end = new Date(startTime);
    end.setHours(end.getHours() + SLOT_DURATION_HOURS);
    return end;
};

// 1. GIỮ BÀN TẠM THỜI (RESERVE)
const reserveTable = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const userId = req.user.id;
        const { branchId, bookingTime, tableId } = req.body;

        if (!branchId || !bookingTime || !tableId) {
            return res.status(400).json({ message: 'Thiếu thông tin giữ bàn!' });
        }

        await connection.beginTransaction();

        // A. Kiểm tra bàn tồn tại
        const [tables] = await connection.execute(
            'SELECT * FROM tables WHERE id = ? AND branch_id = ? AND is_active = TRUE',
            [tableId, branchId]
        );
        if (tables.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Bàn không tồn tại!' });
        }
        const currentTable = tables[0];

        // B. TÍNH KHUNG GIỜ
        const reqStart = new Date(bookingTime);
        const reqEnd = getEndTime(reqStart);

        // C. KIỂM TRA TRÙNG LỊCH (Logic Giao Thoa + Buffer)
        const checkSql = `
            SELECT id FROM bookings
            WHERE table_id = ? 
            AND status != 'cancelled'
            AND (
                -- 1. Check trùng với các đơn đã chốt
                (status IN ('pending', 'confirmed') 
                 AND DATE_SUB(booking_time, INTERVAL ? MINUTE) < ?  
                 AND DATE_ADD(DATE_ADD(booking_time, INTERVAL ? HOUR), INTERVAL ? MINUTE) > ? 
                )
                OR 
                -- 2. Check trùng với các đơn ĐANG GIỮ CHỖ
                (status = 'reserved' 
                 AND reserved_until > NOW()
                 AND DATE_SUB(booking_time, INTERVAL ? MINUTE) < ?
                 AND DATE_ADD(DATE_ADD(booking_time, INTERVAL ? HOUR), INTERVAL ? MINUTE) > ?
                )
            )
            FOR UPDATE`; 

        const params = [
            tableId,
            CLEANUP_BUFFER_MINUTES, reqEnd, SLOT_DURATION_HOURS, CLEANUP_BUFFER_MINUTES, reqStart,
            CLEANUP_BUFFER_MINUTES, reqEnd, SLOT_DURATION_HOURS, CLEANUP_BUFFER_MINUTES, reqStart
        ];

        const [existing] = await connection.execute(checkSql, params);

        if (existing.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'Bàn này bị vướng lịch với khách khác!' });
        }

        // D. TẠO RESERVATION
        const reservedUntil = new Date(Date.now() + 5 * 60 * 1000); 
        const insertSql = `
            INSERT INTO bookings (user_id, branch_id, booking_time, table_id, table_number, status, reserved_until) 
            VALUES (?, ?, ?, ?, ?, 'reserved', ?)`;

        const [result] = await connection.execute(insertSql, [
            userId, branchId, bookingTime, tableId, currentTable.table_number, reservedUntil
        ]);

        await connection.commit();

        // E. Bắn Socket
        const io = req.app.get('socketio');
        if (io) {
            io.emit('tableReserved', {
                tableId: tableId,
                bookingTime: reqStart.toISOString()
            });
        }

        res.status(201).json({ 
            message: 'Đã giữ bàn thành công!', 
            reservationId: result.insertId,
            expiresAt: reservedUntil
        });

    } catch (error) {
        await connection.rollback();
        console.error("Lỗi Reserve:", error);
        res.status(500).json({ message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};

// 2. CONFIRM BOOKING
const createBooking = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const userId = req.user.id;
        const { reservationId, guestCount, note, items } = req.body;

        if (!reservationId) return res.status(400).json({ message: 'Vui lòng giữ bàn trước!' });

        await connection.beginTransaction();

        // Check Reservation
        const [rows] = await connection.execute(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ? AND status = ? AND reserved_until > NOW() FOR UPDATE',
            [reservationId, userId, 'reserved']
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Hết thời gian giữ bàn hoặc bàn không hợp lệ!' });
        }

        // Update Status
        await connection.execute(
            'UPDATE bookings SET guest_count = ?, note = ?, status = ?, reserved_until = NULL WHERE id = ?',
            [guestCount, note || '', 'pending', reservationId]
        );

        // Insert Items
        if (items && items.length > 0) {
            const itemValues = items.map(item => [reservationId, item.id, item.quantity, item.price]);
            await connection.query(`INSERT INTO booking_items (booking_id, product_id, quantity, price) VALUES ?`, [itemValues]);
        }

        await connection.commit();
        res.status(201).json({ message: 'Đặt bàn thành công!', bookingId: reservationId });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};

// 3. GET AVAILABILITY
const getTableAvailability = async (req, res) => {
    try {
        const { branchId, bookingTime } = req.query;
        if (!branchId) return res.status(400).json({ message: "Thiếu chi nhánh" });

        const checkTime = bookingTime ? new Date(bookingTime) : new Date();
        const reqStart = checkTime;
        const reqEnd = getEndTime(checkTime);

        // Dọn dẹp đơn hết hạn
        await db.execute("DELETE FROM bookings WHERE status = 'reserved' AND reserved_until < NOW()");

        const sql = `
            SELECT table_id, status FROM bookings 
            WHERE branch_id = ? 
            AND status IN ('pending', 'confirmed', 'reserved')
            AND DATE_SUB(booking_time, INTERVAL ? MINUTE) < ?
            AND DATE_ADD(DATE_ADD(booking_time, INTERVAL ? HOUR), INTERVAL ? MINUTE) > ?
        `;

        const [bookings] = await db.execute(sql, [
            branchId, 
            CLEANUP_BUFFER_MINUTES, reqEnd,
            SLOT_DURATION_HOURS, CLEANUP_BUFFER_MINUTES, reqStart
        ]);

        const availability = {};
        bookings.forEach(b => {
            availability[b.table_id] = b.status === 'confirmed' || b.status === 'pending' ? 'booked' : 'reserved';
        });

        res.json(availability);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. HỦY GIỮ BÀN (CANCEL RESERVATION) - QUAN TRỌNG: Cần thêm hàm này để không lỗi Route
const cancelReservation = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { reservationId } = req.params;
        const userId = req.user.id;

        await connection.beginTransaction();

        // Lấy thông tin bàn trước khi xóa để bắn Socket
        const [rows] = await connection.execute(
            "SELECT table_id FROM bookings WHERE id = ? AND user_id = ? AND status = 'reserved'",
            [reservationId, userId]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Không tìm thấy phiên giữ bàn!" });
        }

        const tableId = rows[0].table_id;

        // Xóa đơn giữ chỗ
        await connection.execute("DELETE FROM bookings WHERE id = ?", [reservationId]);

        await connection.commit();

        const io = req.app.get('socketio');
        if (io) {
            io.emit('tableReleased', { tableId });
        }

        res.json({ message: "Đã hủy giữ bàn thành công!" });

    } catch (error) {
        await connection.rollback();
        console.error("Cancel Error:", error);
        res.status(500).json({ message: "Lỗi server" });
    } finally {
        connection.release();
    }
};

// 5. CÁC HÀM PHỤ TRỢ KHÁC
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
        const sql = `SELECT b.*, u.full_name, u.phone FROM bookings b LEFT JOIN users u ON b.user_id = u.id ORDER BY b.booking_time DESC`; 
        const [bookings] = await db.execute(sql); 
        for (let booking of bookings) { 
            const [items] = await db.execute(`SELECT bi.quantity, p.name as product_name, bi.price FROM booking_items bi JOIN products p ON bi.product_id = p.id WHERE bi.booking_id = ?`, [booking.id]); 
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
const getMyCurrentReservation = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Tìm đơn reserved còn hạn của user này
        const [rows] = await db.execute(
            `SELECT * FROM bookings 
             WHERE user_id = ? 
             AND status = 'reserved' 
             AND reserved_until > NOW()`,
            [userId]
        );

        if (rows.length > 0) {
            // Trả về thông tin để Frontend khôi phục
            const booking = rows[0];
            return res.json({
                exists: true,
                reservationId: booking.id,
                tableId: booking.table_id,
                branchId: booking.branch_id,
                bookingTime: booking.booking_time,
                tableNumber: booking.table_number // Cần cái này để hiện tên bàn
            });
        } else {
            return res.json({ exists: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi kiểm tra bàn giữ' });
    }
};
// XUẤT MODULE (Đảm bảo đủ 7 hàm)
module.exports = {
    createBooking,
    reserveTable,
    getTableAvailability,
    getMyBookings,
    getAllBookings,
    updateBookingStatus,
    getMyCurrentReservation,
    cancelReservation
};