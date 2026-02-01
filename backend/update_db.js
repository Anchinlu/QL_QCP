const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const db = pool.promise();

async function updateDatabase() {
    try {
        console.log('Đang cập nhật database schema...');

        // Thêm cột reserved_until
        await db.execute(`
            ALTER TABLE bookings
            ADD COLUMN reserved_until DATETIME NULL
        `);
        console.log('✅ Đã thêm cột reserved_until');

        // Cập nhật enum status
        await db.execute(`
            ALTER TABLE bookings
            MODIFY COLUMN status ENUM('pending','confirmed','cancelled','completed','reserved') DEFAULT 'pending'
        `);
        console.log('✅ Đã cập nhật enum status');

        console.log('🎉 Cập nhật database thành công!');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️  Cột reserved_until đã tồn tại, bỏ qua...');
        } else {
            console.error('❌ Lỗi cập nhật database:', error);
            process.exit(1);
        }

        // Thử cập nhật enum status
        try {
            await db.execute(`
                ALTER TABLE bookings
                MODIFY COLUMN status ENUM('pending','confirmed','cancelled','completed','reserved') DEFAULT 'pending'
            `);
            console.log('✅ Đã cập nhật enum status');
            console.log('🎉 Cập nhật database thành công!');
        } catch (enumError) {
            console.error('❌ Lỗi cập nhật enum:', enumError);
        }
        process.exit(0);
    }
}

updateDatabase();