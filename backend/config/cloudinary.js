// backend/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: 'dmaeuom2i', // Thay bằng Cloud Name của bạn
  api_key: '836927744485971',       // Thay bằng API Key
  api_secret: 'ThqGra97zeK8EdjWYouPLdst3SM'  // Thay bằng API Secret
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'NuocUong', // Tên thư mục sẽ tạo trên Cloudinary
    allowedFormats: ['jpeg', 'png', 'jpg', 'webp']
  }
});

const upload = multer({ storage });

module.exports = upload;