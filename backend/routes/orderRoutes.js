const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.post('/create', verifyToken, orderController.createOrder);
router.get('/my-orders', verifyToken, orderController.getMyOrders);
router.get('/admin/all', verifyToken, verifyAdmin, orderController.getAllOrders);
router.put('/admin/update-status/:orderId', verifyToken, verifyAdmin, orderController.updateOrderStatus);

module.exports = router;