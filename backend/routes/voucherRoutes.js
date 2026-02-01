const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');

router.post('/check', voucherController.checkVoucher);

module.exports = router;