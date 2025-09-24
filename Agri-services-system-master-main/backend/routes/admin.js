const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateServiceListingStatusUpdate, validateAdminUserUpdate } = require('../middleware/validation');
const {
  getAdminDashboard,
  getAllUsers,
  updateUserStatus,
  updateUser,
  deleteUser,
  getSystemReports,
  getAllServiceListings,
  getServiceListingForReview,
  updateServiceListingStatus,
  getServiceListingsAnalytics
} = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', getAdminDashboard);

// User Management
router.get('/users', getAllUsers);
router.patch('/users/:userId/status', updateUserStatus);
router.put('/users/:userId', validateAdminUserUpdate, updateUser);
router.delete('/users/:userId', deleteUser);

// Service Listing Management
router.get('/service-listings', getAllServiceListings);
router.get('/service-listings/analytics', getServiceListingsAnalytics);
router.get('/service-listings/:listingId', getServiceListingForReview);
router.patch('/service-listings/:listingId/status', 
  validateServiceListingStatusUpdate,
  updateServiceListingStatus
);

// System Reports
router.get('/reports', getSystemReports);

module.exports = router;