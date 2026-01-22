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
        const { name, price, description, category_id } = req.body;
        
        // Mặc định lấy link ảnh từ input text (nếu user paste link)
        let imageUrl = req.body.image || '';

        // Nếu có file upload lên Cloudinary (Ưu tiên lấy link từ Cloudinary)
        if (req.file) {
            imageUrl = req.file.path; // Cloudinary trả về link ảnh trực tiếp tại đây
        }

        await db.execute(
            'INSERT INTO products (name, price, image, description, category_id) VALUES (?, ?, ?, ?, ?)',
            [name, price, imageUrl, description, category_id]
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
        const { name, price, description, category_id } = req.body;

        // Giữ ảnh cũ
        let imageUrl = req.body.image;

        // Nếu có file mới upload lên Cloudinary
        if (req.file) {
            imageUrl = req.file.path; // Lấy link ảnh mới từ Cloudinary
        }

        await db.execute(
            'UPDATE products SET name = ?, price = ?, image = ?, description = ?, category_id = ? WHERE id = ?',
            [name, price, imageUrl, description, category_id, id]
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