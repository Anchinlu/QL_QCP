// backend/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyAdmin } = require('../middleware/authMiddleware');

// Import bộ upload Cloudinary vừa cấu hình ở trên
const upload = require('../config/cloudinary'); 

// --- ROUTES ---

// Public (Ai cũng xem được)
router.get('/categories', productController.getCategories);
router.get('/', productController.getProducts);

// Admin Routes (Cần quyền Admin & Upload ảnh)
// upload.single('image') nghĩa là lấy file từ form có tên field là 'image'
router.post('/create', verifyAdmin, upload.single('image'), productController.createProduct);

router.put('/update/:id', verifyAdmin, upload.single('image'), productController.updateProduct);

router.delete('/delete/:id', verifyAdmin, productController.deleteProduct);

module.exports = router;