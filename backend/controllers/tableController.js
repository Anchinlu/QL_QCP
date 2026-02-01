const db = require('../config/db');

// Lấy danh sách bàn theo Branch ID
exports.getTablesByBranch = async (req, res) => {
    try {
        const { branchId } = req.params;
        // Lấy tất cả bàn đang hoạt động (is_active = 1) của chi nhánh đó
        const [tables] = await db.execute(
            'SELECT * FROM tables WHERE branch_id = ? AND is_active = TRUE ORDER BY table_number ASC',
            [branchId]
        );
        res.json(tables);
    } catch (error) {
        console.error("Lỗi lấy danh sách bàn:", error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách bàn' });
    }
};