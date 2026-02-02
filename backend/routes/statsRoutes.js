const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Tất cả route này đều cần quyền Admin
router.get('/dashboard', verifyToken, verifyAdmin, statsController.getDashboardStats);
router.get('/revenue-chart', verifyToken, verifyAdmin, statsController.getRevenueChart);
router.get('/category-pie', verifyToken, verifyAdmin, statsController.getCategoryStats);
router.get('/top-products', verifyToken, verifyAdmin, statsController.getTopProducts);

module.exports = router;