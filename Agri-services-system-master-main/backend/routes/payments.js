const express = require('express');
const router = express.Router();
const {
  processServicePayment,
  getUserServiceBookings,
  getServiceBooking,
  updateBookingStatus,
  cancelServiceBooking,
  updateServiceBooking,
  deleteServiceBooking
} = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');

// @route   POST /api/payments/service-booking
// @desc    Process payment for service booking
// @access  Private
router.post('/service-booking', requireAuth, processServicePayment);

// @route   GET /api/payments/bookings/:userId
// @desc    Get user's service bookings
// @access  Private
router.get('/bookings/:userId', requireAuth, getUserServiceBookings);

// @route   GET /api/payments/booking/:bookingId
// @desc    Get specific service booking
// @access  Private
router.get('/booking/:bookingId', requireAuth, getServiceBooking);

// @route   PUT /api/payments/booking/:bookingId/status
// @desc    Update service booking status
// @access  Private
router.put('/booking/:bookingId/status', requireAuth, updateBookingStatus);

// @route   PUT /api/payments/booking/:bookingId/cancel
// @desc    Cancel service booking
// @access  Private
router.put('/booking/:bookingId/cancel', requireAuth, cancelServiceBooking);

// @route   PUT /api/payments/booking/:bookingId
// @desc    Update service booking details
// @access  Private
router.put('/booking/:bookingId', requireAuth, updateServiceBooking);

// @route   DELETE /api/payments/booking/:bookingId
// @desc    Delete service booking
// @access  Private
router.delete('/booking/:bookingId', requireAuth, deleteServiceBooking);

module.exports = router;