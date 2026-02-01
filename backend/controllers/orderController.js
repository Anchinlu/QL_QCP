const db = require('../config/db');

exports.createOrder = async (req, res) => {
    const { items, totalAmount, customerName, phone, address, note, paymentMethod, branchId } = req.body;
    const userId = req.user ? req.user.id : null;
    
    // Đảm bảo các giá trị không bị undefined
    const safeCustomerName = customerName || null;
    const safePhone = phone || null;
    const safeAddress = address || null;
    const safeNote = note || null;
    const safeTotalAmount = totalAmount || 0;
    const safePaymentMethod = paymentMethod || 'COD';
    const safeBranchId = branchId || null;
    
    // --- THÊM ĐOẠN NÀY ĐỂ DEBUG ---
    console.log("-------------------------------------------------");
    console.log("🔍 ĐANG KIỂM TRA DỮ LIỆU ĐẦU VÀO:");
    console.log("User ID:", userId);
    console.log("Customer Name:", safeCustomerName); // Kiểm tra xem có undefined không
    console.log("Phone:", safePhone);
    console.log("Address:", safeAddress);
    console.log("Note:", safeNote);
    console.log("Total Amount:", safeTotalAmount);
    console.log("Payment Method:", safePaymentMethod);
    console.log("Items:", JSON.stringify(items, null, 2)); // In chi tiết mảng items
    console.log("-------------------------------------------------");
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        if (!safeCustomerName || !items || items.length === 0) {
            throw new Error('Thiếu thông tin khách hàng hoặc món ăn!');
        }

        // 1. KIỂM TRA TỒN KHO
        for (const item of items) {
            const [rows] = await connection.execute("SELECT stock_quantity, name FROM products WHERE id = ?", [item.id]);
            if (rows.length === 0) throw new Error(`Sản phẩm ID ${item.id} không tồn tại`);
            
            const product = rows[0];
            if (product.stock_quantity < item.quantity) {
                throw new Error(`Món '${product.name}' chỉ còn ${product.stock_quantity} phần, bạn đặt ${item.quantity} là quá lố rồi!`);
            }
        }

        // 2. TRỪ KHO (Nếu đủ hàng)
        for (const item of items) {
            await connection.execute(
                "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
                [item.quantity, item.id]
            );
        }

        // 3. TẠO ĐƠN HÀNG
        const [orderResult] = await connection.execute(
            'INSERT INTO orders (user_id, customer_name, phone, address, note, total_amount, payment_method, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, safeCustomerName, safePhone, safeAddress, safeNote, safeTotalAmount, safePaymentMethod, safeBranchId]
        );
        const orderId = orderResult.insertId;

        // 4. THÊM CHI TIẾT ĐƠN HÀNG
        for (const item of items) {
            await connection.execute(
                'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.id, item.name, item.quantity, item.price]
            );
        }

        await connection.commit();

        // Gửi Socket IO thông báo
        try {
            const io = req.app.get('socketio');
            if (io) {
                const newOrderPayload = {
                    id: orderId,
                    customer_name: safeCustomerName,
                    phone: safePhone,
                    total_amount: safeTotalAmount,
                    status: 'pending',
                    created_at: new Date(),
                    items: items.map(i => ({ product_name: i.name, quantity: i.quantity })),
                    note: safeNote
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
        await connection.rollback();
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.getMyOrders = async (req, res) => { try { const userId = req.user.id; const [orders] = await db.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]); for (let order of orders) { const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]); order.items = items; } res.json(orders); } catch (error) { console.error(error); res.status(500).json({ message: 'Lỗi khi lấy danh sách đơn hàng' }); } };
exports.getAllOrders = async (req, res) => { try { const [orders] = await db.execute('SELECT * FROM orders ORDER BY created_at DESC'); for (let order of orders) { const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]); order.items = items; } res.json(orders); } catch (error) { console.error(error); res.status(500).json({ message: 'Lỗi lấy danh sách toàn bộ đơn hàng' }); } };
exports.updateOrderStatus = async (req, res) => { try { const { orderId } = req.params; const { status } = req.body; await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]); res.json({ message: `Đã cập nhật đơn hàng #${orderId} sang trạng thái: ${status}` }); } catch (error) { console.error(error); res.status(500).json({ message: 'Lỗi cập nhật trạng thái đơn hàng' }); } };