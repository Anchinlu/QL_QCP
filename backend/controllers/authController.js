const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 1. Đăng ký tài khoản
exports.register = async (req, res) => {
    try {
        const { fullName, email, password, phone, address, branchId } = req.body;

        // Kiểm tra xem email đã tồn tại chưa
        const [existingUser] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email này đã được sử dụng!' });
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Lưu vào database
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password, phone, address, branch_id, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [fullName, email, hashedPassword, phone, address, branchId, 'customer']
        );

        res.status(201).json({ message: 'Đăng ký thành công! Hãy đăng nhập.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi đăng ký' });
    }
};

// 2. Đăng nhập
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Tìm user theo email
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Email không tồn tại!' });
        }

        const user = users[0];

        // So sánh mật khẩu (nhập vào vs mã hóa trong db)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Sai mật khẩu!' });
        }

        // Tạo Token JWT
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' } // Token hết hạn sau 1 ngày
        );

        // Trả về thông tin user kèm Token
        res.json({
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user.id,
                name: user.username,
                email: user.email,
                role: user.role,
                branch_id: user.branch_id,
                // --- ĐÃ BỔ SUNG THÊM 2 TRƯỜNG NÀY ---
                phone: user.phone,   
                address: user.address 
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
    }
};