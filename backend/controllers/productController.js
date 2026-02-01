// backend/controllers/productController.js
const db = require('../config/db');

// 1. Lấy danh sách danh mục
exports.getCategories = async (req, res) => {
    try {
        const [categories] = await db.execute('SELECT * FROM categories');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh mục' });
    }
};

// 2. Lấy danh sách sản phẩm
exports.getProducts = async (req, res) => {
    try {
        const sql = `
            SELECT p.*, c.slug as category_slug, c.name as category_name 
            FROM products p 
            JOIN categories c ON p.category_id = c.id
            ORDER BY p.id DESC
        `;
        const [products] = await db.execute(sql);

        const formattedProducts = products.map(product => ({
            ...product,
            category: product.category_slug,
            desc: product.description 
        }));

        res.json(formattedProducts);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy sản phẩm' });
    }
};

// 3. [ADMIN] Thêm sản phẩm (Upload Cloudinary)
exports.createProduct = async (req, res) => {
    try {
        const { name, price, description, category_id, stock_quantity } = req.body;
        
        let imageUrl = req.body.image || '';

        if (req.file) {
            imageUrl = req.file.path;
        }

        const stock = stock_quantity || 100;

        await db.execute(
            'INSERT INTO products (name, price, image, description, category_id, stock_quantity) VALUES (?, ?, ?, ?, ?, ?)',
            [name, price, imageUrl, description, category_id, stock]
        );

        res.status(201).json({ message: 'Thêm món thành công!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi thêm món' });
    }
};

// 4. [ADMIN] Cập nhật sản phẩm (Upload Cloudinary)
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, description, category_id, stock_quantity } = req.body;

        let imageUrl = req.body.image;

        if (req.file) {
            imageUrl = req.file.path;
        }

        await db.execute(
            'UPDATE products SET name = ?, price = ?, image = ?, description = ?, category_id = ?, stock_quantity = ? WHERE id = ?',
            [name, price, imageUrl, description, category_id, stock_quantity, id]
        );

        res.json({ message: 'Cập nhật món thành công!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi cập nhật món' });
    }
};

// 5. [ADMIN] Xóa sản phẩm
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'Đã xóa món ăn!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xóa món' });
    }
};