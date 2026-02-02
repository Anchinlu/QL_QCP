const db = require('../config/db');

// --- CẤU HÌNH ---
const SLOT_DURATION_HOURS = 1;
const CLEANUP_BUFFER_MINUTES = 15; 
const MAX_HOLD_LIMIT = 3; 

// Hàm tính thời gian kết thúc 
const getEndTime = (startTime) => {
    const end = new Date(startTime);
    end.setHours(end.getHours() + SLOT_DURATION_HOURS);
    return end;
};

// 1. GIỮ BÀN TẠM THỜI (RESERVE) - CÓ CHECK SPAM
const reserveTable = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const userId = req.user.id;
        const { branchId, bookingTime, tableId } = req.body;

        if (!branchId || !bookingTime || !tableId) {
            return res.status(400).json({ message: 'Thiếu thông tin giữ bàn!' });
        }

        await connection.beginTransaction();

        const [spamCheck] = await connection.execute(
            `SELECT COUNT(*) as count FROM bookings 
             WHERE user_id = ? 
             AND status = 'reserved' 
             AND reserved_until > NOW()`,
            [userId]
        );

        if (spamCheck[0].count >= MAX_HOLD_LIMIT) {
            await connection.rollback();
            return res.status(429).json({ // 429: Too Many Requests
                message: `Bạn đang giữ quá nhiều bàn (${spamCheck[0].count} bàn). Vui lòng hoàn tất hoặc hủy bớt trước khi chọn thêm!` 
            });
        }

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

        // C. KIỂM TRA TRÙNG LỊCH 
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

// 4. HỦY GIỮ BÀN (CANCEL RESERVATION) - [UPDATED] Gửi kèm bookingTime
const cancelReservation = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { reservationId } = req.params;
        const userId = req.user.id;

        await connection.beginTransaction();

        // [UPDATE] Lấy thêm booking_time
        const [rows] = await connection.execute(
            "SELECT table_id, booking_time FROM bookings WHERE id = ? AND user_id = ? AND status = 'reserved'",
            [reservationId, userId]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Không tìm thấy phiên giữ bàn!" });
        }

        const { table_id, booking_time } = rows[0];

        // Xóa đơn giữ chỗ
        await connection.execute("DELETE FROM bookings WHERE id = ?", [reservationId]);

        await connection.commit();

        const io = req.app.get('socketio');
        if (io) {
            // [UPDATE] Gửi kèm bookingTime để Frontend check trùng lịch
            io.emit('tableReleased', { 
                tableId: table_id, 
                bookingTime: booking_time 
            });
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

// 5. LẤY LỊCH SỬ ĐẶT (User)
const getMyBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Lấy thông tin đặt bàn + Tên chi nhánh
        const sql = `
            SELECT b.*, br.name as branch_name, br.address as branch_address 
            FROM bookings b
            JOIN branches br ON b.branch_id = br.id
            WHERE b.user_id = ? 
            ORDER BY b.booking_time DESC
        `;
        const [bookings] = await db.execute(sql, [userId]);

        // Lấy món ăn kèm cho từng đơn
        for (let booking of bookings) {
            const [items] = await db.execute(`
                SELECT bi.quantity, bi.price, p.name, p.image 
                FROM booking_items bi 
                JOIN products p ON bi.product_id = p.id 
                WHERE bi.booking_id = ?
            `, [booking.id]);
            booking.items = items;
        }

        res.json(bookings);
    } catch (error) {
        console.error("Lỗi lấy lịch sử:", error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// 6. LẤY TẤT CẢ ĐƠN (ADMIN) - CÓ BỘ LỌC
const getAllBookings = async (req, res) => { 
    try { 
        const { date, filterType } = req.query;

        let sql = `
            SELECT b.*, u.full_name, u.phone, br.name as branch_name 
            FROM bookings b 
            LEFT JOIN users u ON b.user_id = u.id 
            LEFT JOIN branches br ON b.branch_id = br.id
            WHERE 1=1
        `; 
        const params = [];

        // Lọc theo loại (Sắp tới vs Theo ngày)
        if (filterType === 'upcoming') {
            // Lấy các đơn sắp tới (từ giờ trở đi) và chưa hoàn thành/hủy
            sql += ` AND b.booking_time >= NOW() AND b.status IN ('pending', 'confirmed')`;
        } else if (date) {
            // Lấy theo ngày cụ thể
            sql += ` AND DATE(b.booking_time) = ?`;
            params.push(date);
        }

        // Sắp xếp thời gian tăng dần để Admin dễ theo dõi lịch trình
        sql += ` ORDER BY b.booking_time ASC`;

        const [bookings] = await db.execute(sql, params); 
        
        // Lấy items kèm theo
        for (let booking of bookings) { 
            const [items] = await db.execute(`
                SELECT bi.quantity, p.name as product_name, bi.price 
                FROM booking_items bi 
                JOIN products p ON bi.product_id = p.id 
                WHERE bi.booking_id = ?
            `, [booking.id]); 
            booking.items = items; 
        } 
        res.json(bookings); 
    } catch (error) { 
        console.error(error); 
        res.status(500).json({ message: 'Lỗi lấy danh sách đặt bàn' }); 
    } 
};

// 7. CẬP NHẬT TRẠNG THÁI (ADMIN)
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

// 8. LẤY BÀN ĐANG GIỮ (RE-HYDRATE F5)
const getMyCurrentReservation = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.execute(
            `SELECT * FROM bookings WHERE user_id = ? AND status = 'reserved' AND reserved_until > NOW()`,
            [userId]
        );

        if (rows.length > 0) {
            const booking = rows[0];
            return res.json({
                exists: true,
                reservationId: booking.id,
                tableId: booking.table_id,
                branchId: booking.branch_id,
                bookingTime: booking.booking_time,
                tableNumber: booking.table_number
            });
        } else {
            return res.json({ exists: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi kiểm tra bàn giữ' });
    }
};

// XUẤT MODULE (Đảm bảo đủ 8 hàm)
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