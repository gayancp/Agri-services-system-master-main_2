const express = require('express');
const router = express.Router();
const { requireAuth, requireServiceProvider } = require('../middleware/auth');
const {
  getServiceProviderDashboard,
  getMyServiceBookings,
  updateServiceBookingStatus,
  updateProviderProfile,
  generateReport
} = require('../controllers/serviceProviderController');

// All service provider routes require authentication and service provider role
router.use(requireAuth);
router.use(requireServiceProvider);

// Dashboard
router.get('/dashboard', getServiceProviderDashboard);

// Service Booking Management
router.get('/service-bookings', getMyServiceBookings);
router.patch('/service-bookings/:bookingId/status', updateServiceBookingStatus);

// Profile Management
router.patch('/profile', updateProviderProfile);

//get report generation data
router.get('/generate-report', generateReport);

module.exports = router;