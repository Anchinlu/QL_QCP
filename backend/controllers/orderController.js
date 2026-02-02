const db = require('../config/db');

// 1. TẠO ĐƠN HÀNG MỚI (Transaction + Check Tồn kho + Socket)
exports.createOrder = async (req, res) => {
    const { items, totalAmount, customerName, phone, address, note, paymentMethod, branchId } = req.body;
    const userId = req.user ? req.user.id : null;
    
    // Validate dữ liệu đầu vào
    const safeCustomerName = customerName || null;
    const safePhone = phone || null;
    const safeAddress = address || null;
    const safeNote = note || null;
    const safeTotalAmount = totalAmount || 0;
    const safePaymentMethod = paymentMethod || 'COD';
    const safeBranchId = branchId || null;
    
    // Log debug (Tùy chọn, có thể bỏ khi production)
    console.log("--- NEW ORDER REQUEST ---");
    console.log("User:", userId, "| Customer:", safeCustomerName);
    console.log("Items:", items.length, "món | Total:", safeTotalAmount);

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        if (!safeCustomerName || !items || items.length === 0) {
            throw new Error('Thiếu thông tin khách hàng hoặc món ăn!');
        }

        // A. KIỂM TRA TỒN KHO
        for (const item of items) {
            const [rows] = await connection.execute("SELECT stock_quantity, name FROM products WHERE id = ?", [item.id]);
            if (rows.length === 0) throw new Error(`Sản phẩm ID ${item.id} không tồn tại`);
            
            const product = rows[0];
            if (product.stock_quantity < item.quantity) {
                throw new Error(`Món '${product.name}' chỉ còn ${product.stock_quantity} phần, bạn đặt ${item.quantity} là quá lố rồi!`);
            }
        }

        // B. TRỪ KHO
        for (const item of items) {
            await connection.execute(
                "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
                [item.quantity, item.id]
            );
        }

        // C. TẠO ORDER
        const [orderResult] = await connection.execute(
            'INSERT INTO orders (user_id, customer_name, phone, address, note, total_amount, payment_method, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, safeCustomerName, safePhone, safeAddress, safeNote, safeTotalAmount, safePaymentMethod, safeBranchId]
        );
        const orderId = orderResult.insertId;

        // D. TẠO ORDER ITEMS
        for (const item of items) {
            await connection.execute(
                'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.id, item.name, item.quantity, item.price]
            );
        }

        await connection.commit();

        // E. GỬI SOCKET THÔNG BÁO CHO ADMIN
        try {
            const io = req.app.get('socketio');
            if (io) {
                const newOrderPayload = {
                    id: orderId,
                    customer_name: safeCustomerName,
                    phone: safePhone,
                    address: safeAddress,
                    total_amount: safeTotalAmount,
                    status: 'pending',
                    created_at: new Date(),
                    items: items.map(i => ({ product_name: i.name, quantity: i.quantity })),
                    note: safeNote
                };
                io.emit('new_order', newOrderPayload);
                console.log("--> Socket 'new_order' sent!");
            }
        } catch (socketError) {
            console.error("--> Socket Error:", socketError.message);
        }

        res.status(201).json({ message: 'Đặt hàng thành công!', orderId });

    } catch (error) {
        await connection.rollback();
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// 2. LẤY ĐƠN HÀNG CỦA TÔI
exports.getMyOrders = async (req, res) => { 
    try { 
        const userId = req.user.id; 
        const [orders] = await db.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]); 
        
        for (let order of orders) { 
            const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]); 
            order.items = items; 
        } 
        res.json(orders); 
    } catch (error) { 
        console.error(error); 
        res.status(500).json({ message: 'Lỗi khi lấy danh sách đơn hàng' }); 
    } 
};

// 3. LẤY TẤT CẢ ĐƠN HÀNG (ADMIN) - CÓ BỘ LỌC
exports.getAllOrders = async (req, res) => { 
    try { 
        // Nhận tham số lọc từ Query String (URL)
        const { date, status } = req.query; 
        
        let sql = `SELECT * FROM orders WHERE 1=1`;
        const params = [];

        // Lọc theo ngày (Nếu có)
        if (date) {
            sql += ` AND DATE(created_at) = ?`;
            params.push(date);
        }

        // Lọc theo trạng thái (Nếu có)
        if (status && status !== 'all') {
            sql += ` AND status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY created_at DESC`;

        const [orders] = await db.execute(sql, params); 
        
        // Lấy chi tiết món ăn cho từng đơn
        for (let order of orders) { 
            const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]); 
            order.items = items; 
        } 
        
        res.json(orders); 
    } catch (error) { 
        console.error(error); 
        res.status(500).json({ message: 'Lỗi lấy danh sách toàn bộ đơn hàng' }); 
    } 
};

// 4. CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG (ADMIN)
exports.updateOrderStatus = async (req, res) => { 
    try { 
        const { orderId } = req.params; 
        const { status } = req.body; 
        
        await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]); 
        
        res.json({ message: `Đã cập nhật đơn hàng #${orderId} sang trạng thái: ${status}` }); 
    } catch (error) { 
        console.error(error); 
        res.status(500).json({ message: 'Lỗi cập nhật trạng thái đơn hàng' }); 
    } 
};