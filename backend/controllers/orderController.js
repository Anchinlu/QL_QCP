// backend/controllers/orderController.js
const db = require('../config/db');

exports.createOrder = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;

        // Lấy dữ liệu linh hoạt (Snake_case hoặc CamelCase đều nhận)
        const body = req.body;
        const customerName = body.customerName || body.customer_name;
        const totalAmount = body.totalAmount || body.total_amount;
        const paymentMethod = body.paymentMethod || body.payment_method;
        const branchId = body.branchId || body.branch_id || null; // Nếu null thì thôi
        
        // Kiểm tra dữ liệu đầu vào
        if (!customerName || !body.items || body.items.length === 0) {
            return res.status(400).json({ message: 'Thiếu thông tin khách hàng hoặc món ăn!' });
        }

        // 1. Insert Order
        const [orderResult] = await db.execute(
            'INSERT INTO orders (user_id, customer_name, phone, address, note, total_amount, payment_method, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, customerName, body.phone, body.address, body.note, totalAmount, paymentMethod, branchId]
        );
        const orderId = orderResult.insertId;

        // 2. Insert Items
        for (const item of body.items) {
            await db.execute(
                'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.id, item.name, item.quantity, item.price]
            );
        }

        // 3. Socket.io (Bọc trong try-catch riêng để không làm sập API nếu Socket lỗi)
        try {
            const io = req.app.get('socketio');
            if (io) {
                const newOrderPayload = {
                    id: orderId,
                    customer_name: customerName,
                    phone: body.phone,
                    total_amount: totalAmount,
                    status: 'pending',
                    created_at: new Date(),
                    items: body.items.map(i => ({ product_name: i.name, quantity: i.quantity })),
                    note: body.note
                };
                io.emit('new_order', newOrderPayload);
                console.log("--> Đã gửi thông báo Socket cho Admin");
            } else {
                console.log("--> Socket.io chưa được khởi tạo (Server chưa set)");
            }
        } catch (socketError) {
            console.error("--> Lỗi gửi Socket (nhưng đơn đã lưu thành công):", socketError.message);
        }

        res.status(201).json({ message: 'Đặt hàng thành công!', orderId });

    } catch (error) {
        console.error("❌ LỖI NGHIÊM TRỌNG Ở BACKEND:", error); // Nhìn vào đây trong Terminal để biết lỗi gì
        res.status(500).json({ message: 'Lỗi server: ' + error.message });
    }
};

// ... GIỮ NGUYÊN CÁC HÀM KHÁC (getMyOrders, getAllOrders...) ...
exports.getMyOrders = async (req, res) => { try { const userId = req.user.id; const [orders] = await db.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]); for (let order of orders) { const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]); order.items = items; } res.json(orders); } catch (error) { console.error(error); res.status(500).json({ message: 'Lỗi khi lấy danh sách đơn hàng' }); } };
exports.getAllOrders = async (req, res) => { try { const [orders] = await db.execute('SELECT * FROM orders ORDER BY created_at DESC'); for (let order of orders) { const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]); order.items = items; } res.json(orders); } catch (error) { console.error(error); res.status(500).json({ message: 'Lỗi lấy danh sách toàn bộ đơn hàng' }); } };
exports.updateOrderStatus = async (req, res) => { try { const { orderId } = req.params; const { status } = req.body; await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]); res.json({ message: `Đã cập nhật đơn hàng #${orderId} sang trạng thái: ${status}` }); } catch (error) { console.error(error); res.status(500).json({ message: 'Lỗi cập nhật trạng thái đơn hàng' }); } };