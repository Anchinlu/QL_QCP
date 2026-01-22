const mysql = require('mysql2');
require('dotenv').config();

// Tạo kết nối (Connection Pool)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Chuyển sang dạng Promise để dùng async/await cho tiện
const db = pool.promise();

// Kiểm tra kết nối thử xem có lỗi không
pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Kết nối Database THẤT BẠI: ", err.code);
        if (err.code === 'ER_BAD_DB_ERROR') {
            console.error("--> Gợi ý: Kiểm tra lại tên Database trong HeidiSQL xem đã tạo 'QL_QCP' chưa?");
        }
    } else {
        console.log("✅ Kết nối Database 'QL_QCP' THÀNH CÔNG!");
        connection.release();
    }
});

module.exports = db;