const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyAdmin } = require('../middleware/authMiddleware');
const upload = require('../config/cloudinary'); 

router.get('/categories', productController.getCategories);
router.get('/', productController.getProducts);

router.post('/create', verifyAdmin, upload.single('image'), productController.createProduct);
router.put('/update/:id', verifyAdmin, upload.single('image'), productController.updateProduct);
router.delete('/delete/:id', verifyAdmin, productController.deleteProduct);

module.exports = router;