// src/data/products.js
export const categories = [
  { id: 'all', name: 'Tất cả' },
  { id: 'tra-sua', name: 'Trà Sữa' },
  { id: 'ca-phe', name: 'Cà Phê' },
  { id: 'tra-trai-cay', name: 'Trà Trái Cây' },
  { id: 'da-xay', name: 'Đá Xay' },
];

export const products = [
  {
    id: 1,
    category: 'ca-phe',
    name: 'càn phê đen',
    price: 35000,
    image: 'https://res.cloudinary.com/dmaeuom2i/image/upload/v1766404134/a11.png_n6nnox.webp',
    desc: 'hạt cà phê đậm đà thơm lừng.'
  },
  {
    id: 2,
    category: 'ca-phe',
    name: 'Cà phê sữa',
    price: 38000,
    image: 'https://res.cloudinary.com/dmaeuom2i/image/upload/v1766404135/a15.png_zbzw67.webp',
    desc: 'Cà phê hòa quyện cùng sữa đặc ngọt ngào.'
  },
  {
    id: 3,
    category: 'ca-phe',
    name: 'Cà Phê Muối',
    price: 29000,
    image: 'https://res.cloudinary.com/dmaeuom2i/image/upload/v1766400465/salt.png_huplzm.webp',
    desc: 'Vị mặn béo của kem muối hòa quyện cà phê đậm đà.'
  },
  {
    id: 4,
    category: 'ca-phe',
    name: 'Bạc Xỉu',
    price: 25000,
    image: 'https://res.cloudinary.com/dmaeuom2i/image/upload/v1766404649/3-01_kcx4li.png',
    desc: 'Nhiều sữa ít cafe, ngọt ngào khó cưỡng.'
  },
  {
    id: 5,
    category: 'tra-trai-cay',
    name: 'Trà Đào Cam Sả',
    price: 45000,
    image: 'https://res.cloudinary.com/dmaeuom2i/image/upload/v1766404704/pea-1.png_vxtkke.webp',
    desc: 'Thanh mát, giải nhiệt cực đã.'
  },
  {
    id: 6,
    category: 'tra-trai-cay',
    name: 'Nước dưa hấu',
    price: 42000,
    image: 'https://res.cloudinary.com/dmaeuom2i/image/upload/v1766398780/le.png_bouef8.webp',
    desc: ' Ngọt ngào tự nhiên từ dưa hấu tươi.'
  },
  {
    id: 7,
    category: 'tra-trai-cay',
    name: 'Nước chanh dây',
    price: 49000,
    image: 'https://res.cloudinary.com/dmaeuom2i/image/upload/v1766398059/pass.png_udu5np.webp',
    desc: ' Vị chua tự nhiên của chanh dây'
  }
];