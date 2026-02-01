const db = require('../config/db');

// RESERVE BÀN TẠM THỜI (5 phút)
const reserveTable = async (req, res) => {
    console.log('Reserve table request:', req.body);
    console.log('User:', req.user);
    
    const connection = await db.getConnection();
    try {
        const userId = req.user.id;
        const { branchId, bookingTime, tableNumber } = req.body;

        console.log('Parsed data:', { userId, branchId, bookingTime, tableNumber });

        if (!branchId || !bookingTime || !tableNumber) {
            console.log('Missing required fields');
            return res.status(400).json({ message: 'Thiếu thông tin!' });
        }

        await connection.beginTransaction();

        // Tính thời gian hết hạn (5 phút)
        const reservedUntil = new Date(Date.now() + 5 * 60 * 1000);

        // Kiểm tra bàn đã được đặt hoặc reserve chưa
        const bookingDateTime = new Date(bookingTime);
        const hourStart = new Date(bookingDateTime);
        hourStart.setMinutes(0, 0, 0);

        const hourEnd = new Date(bookingDateTime);
        hourEnd.setHours(hourEnd.getHours() + 1, 0, 0, 0);

        const checkSql = `
            SELECT id FROM bookings
            WHERE table_number = ?
            AND branch_id = ?
            AND booking_time >= ?
            AND booking_time < ?
            AND (status IN ('pending', 'confirmed') OR (status = 'reserved' AND reserved_until > NOW()))
        `;

        const [existingBookings] = await connection.execute(checkSql, [
            tableNumber, branchId, hourStart, hourEnd
        ]);

        if (existingBookings.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'Bàn đã được đặt hoặc đang được chọn!' });
        }

        // Tạo reservation
        const sql = `INSERT INTO bookings (user_id, branch_id, booking_time, table_number, status, reserved_until)
                     VALUES (?, ?, ?, ?, 'reserved', ?)`;
        const [result] = await connection.execute(sql, [userId, branchId, bookingTime, tableNumber, reservedUntil]);

        await connection.commit();

        // Emit real-time update
        const io = req.app.get('socketio');
        console.log('Emitting tableReserved event for all clients');
        io.emit('tableReserved', {
            branchId,
            tableNumber,
            bookingTime: hourStart.toISOString(),
            reservedUntil: reservedUntil.toISOString()
        });

        res.json({
            message: 'Đã khóa bàn tạm thời',
            reservationId: result.insertId,
            expiresAt: reservedUntil
        });

    } catch (error) {
        await connection.rollback();
        console.error("Reserve Error:", error);
        res.status(500).json({ message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};

// HỦY RESERVATION
const cancelReservation = async (req, res) => {
    try {
        const { reservationId } = req.params;
        const userId = req.user.id;

        // Lấy thông tin reservation trước khi xóa
        const [reservations] = await db.execute(
            'SELECT branch_id, table_number, booking_time FROM bookings WHERE id = ? AND user_id = ? AND status = ?',
            [reservationId, userId, 'reserved']
        );

        if (reservations.length === 0) {
            return res.status(404).json({ message: 'Reservation không tìm thấy' });
        }

        const { branch_id, table_number, booking_time } = reservations[0];

        // Xóa reservation
        await db.execute(
            'DELETE FROM bookings WHERE id = ? AND user_id = ? AND status = ?',
            [reservationId, userId, 'reserved']
        );

        // Emit real-time update
        const io = req.app.get('socketio');
        io.emit('tableReservationCancelled', {
            branchId: branch_id,
            tableNumber: table_number,
            bookingTime: booking_time.toISOString()
        });

        res.json({ message: 'Đã hủy đặt trước' });
    } catch (error) {
        console.error("Cancel Reservation Error:", error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// LẤY TÌNH TRẠNG BÀN
const getTableAvailability = async (req, res) => {
    try {
        const { branchId, bookingTime } = req.query;
        console.log('getTableAvailability called:', { branchId, bookingTime });

        if (!branchId || !bookingTime) {
            return res.status(400).json({ message: 'Thiếu thông tin branchId hoặc bookingTime' });
        }

        const bookingDateTime = new Date(bookingTime);
        const hourStart = new Date(bookingDateTime);
        hourStart.setMinutes(0, 0, 0);

        const hourEnd = new Date(bookingDateTime);
        hourEnd.setHours(hourEnd.getHours() + 1, 0, 0, 0);

        console.log('Query time range:', hourStart.toISOString(), 'to', hourEnd.toISOString());

        // Clean up expired reservations first
        await db.execute(`
            DELETE FROM bookings 
            WHERE status = 'reserved' 
            AND reserved_until < NOW()
        `);

        // Lấy tất cả bookings trong khung giờ đó
        const [bookings] = await db.execute(`
            SELECT table_number, status, reserved_until
            FROM bookings
            WHERE branch_id = ?
            AND booking_time >= ?
            AND booking_time < ?
            AND status IN ('pending', 'confirmed', 'reserved')
        `, [branchId, hourStart, hourEnd]);

        console.log('Found bookings:', bookings);

        // Tạo map tình trạng bàn
        const availability = {};
        const now = new Date();
        console.log('Current time:', now.toISOString());
        
        bookings.forEach(booking => {
            console.log('Processing booking:', booking);
            if (booking.status === 'reserved') {
                // Kiểm tra reservation còn hạn không
                const reservedUntil = new Date(booking.reserved_until);
                console.log('Reserved until:', reservedUntil.toISOString(), 'Is valid:', reservedUntil > now);
                if (reservedUntil > now) {
                    availability[booking.table_number] = 'reserved';
                } else {
                    console.log('Reservation expired, ignoring');
                }
            } else {
                availability[booking.table_number] = 'booked';
            }
        });

        console.log('Returning availability:', availability);
        res.json(availability);
    } catch (error) {
        console.error("Get Table Availability Error:", error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const createBooking = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const userId = req.user.id;
        const { branchId, bookingTime, guestCount, tableNumber, note, items, reservationId } = req.body;

        if (!branchId || !bookingTime || !guestCount) {
            return res.status(400).json({ message: 'Thiếu thông tin đặt bàn!' });
        }

        await connection.beginTransaction();

        // Nếu có reservationId, kiểm tra và confirm reservation
        if (reservationId) {
            const [reservations] = await connection.execute(
                'SELECT id FROM bookings WHERE id = ? AND user_id = ? AND status = ? AND reserved_until > NOW()',
                [reservationId, userId, 'reserved']
            );

            if (reservations.length === 0) {
                await connection.rollback();
                return res.status(400).json({ message: 'Reservation không hợp lệ hoặc đã hết hạn!' });
            }

            // Update reservation thành booking thực sự
            await connection.execute(
                'UPDATE bookings SET guest_count = ?, note = ?, status = ? WHERE id = ?',
                [guestCount, note || '', 'pending', reservationId]
            );

            const bookingId = reservationId;

            // Thêm items nếu có
            if (items && items.length > 0) {
                const itemValues = items.map(item => [bookingId, item.id, item.quantity, item.price]);
                await connection.query(`INSERT INTO booking_items (booking_id, product_id, quantity, price) VALUES ?`, [itemValues]);
            }

            await connection.commit();
            return res.status(201).json({ message: 'Đặt bàn thành công!', bookingId });

        } else {
            // Logic tạo booking mới (như cũ nhưng với transaction)
            // ... (code cũ)
        }

        // Bắt đầu transaction
        await connection.beginTransaction();

        // 1. KIỂM TRA BÀN TRỐNG (Trong cùng khung giờ)
        const bookingDateTime = new Date(bookingTime);
        const hourStart = new Date(bookingDateTime);
        hourStart.setMinutes(0, 0, 0);

        const hourEnd = new Date(bookingDateTime);
        hourEnd.setHours(hourEnd.getHours() + 1, 0, 0, 0);

        const checkSql = `
            SELECT id FROM bookings
            WHERE table_number = ?
            AND branch_id = ?
            AND booking_time >= ?
            AND booking_time < ?
            AND (status IN ('pending', 'confirmed') OR (status = 'reserved' AND reserved_until > NOW()))
        `;

        const [existingBookings] = await connection.execute(checkSql, [
            tableNumber, branchId, hourStart, hourEnd
        ]);

        if (existingBookings.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                message: `Xin lỗi, bàn ${tableNumber} đã được đặt trong khung giờ này!`
            });
        }

        // 2. TẠO BOOKING
        const sqlBooking = `INSERT INTO bookings (user_id, branch_id, booking_time, guest_count, table_number, note) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await connection.execute(sqlBooking, [userId, branchId, bookingTime, guestCount, tableNumber, note]);

        // 3. THÊM ITEMS
        if (items && items.length > 0) {
            const bookingId = result.insertId;
            const itemValues = items.map(item => [bookingId, item.id, item.quantity, item.price]);
            await connection.query(`INSERT INTO booking_items (booking_id, product_id, quantity, price) VALUES ?`, [itemValues]);
        }

        await connection.commit();

        res.status(201).json({ message: 'Đặt bàn thành công!', bookingId: result.insertId });

    } catch (error) {
        await connection.rollback();
        console.error("Booking Error:", error);
        res.status(500).json({ message: 'Lỗi server khi đặt bàn' });
    } finally {
        connection.release();
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
    reserveTable,
    cancelReservation,
    getTableAvailability,
    getMyBookings,
    getAllBookings,
    updateBookingStatus
};