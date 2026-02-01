const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Chỉ Admin mới xem được danh sách
router.get('/', verifyToken, verifyAdmin, userController.getAllUsers);

module.exports = router;