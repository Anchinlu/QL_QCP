const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { fullName, email, password, phone, address, branchId } = req.body;

        const [existingUser] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email này đã được sử dụng!' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await db.execute(
            'INSERT INTO users (full_name, email, password, phone, address, branch_id, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [fullName, email, hashedPassword, phone, address, branchId, 'customer']
        );

        res.status(201).json({ message: 'Đăng ký thành công! Hãy đăng nhập.' });

    } catch (error) {
        console.error("Lỗi đăng ký:", error);
        res.status(500).json({ message: 'Lỗi server khi đăng ký' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Email không tồn tại!' });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Sai mật khẩu!' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user.id,
                name: user.full_name,
                email: user.email,
                role: user.role,
                branch_id: user.branch_id,
                phone: user.phone,   
                address: user.address 
            }
        });

    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
    }
};