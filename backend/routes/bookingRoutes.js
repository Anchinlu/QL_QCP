const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.post('/', verifyToken, bookingController.createBooking);
router.get('/my-bookings', verifyToken, bookingController.getMyBookings);
router.get('/admin/all', verifyToken, verifyAdmin, bookingController.getAllBookings);

router.put('/:id', verifyToken, verifyAdmin, bookingController.updateBookingStatus);

module.exports = router;