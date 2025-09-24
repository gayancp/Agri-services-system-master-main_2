const express = require('express');
const router = express.Router();
const { requireAuth, requireServiceProvider } = require('../middleware/auth');
const { uploadServiceListingImages } = require('../middleware/upload');
const {
  validateServiceListingCreation,
  validateServiceListingUpdate
} = require('../middleware/validation');
const {
  getMyServiceListings,
  getServiceListing,
  createServiceListing,
  updateServiceListing,
  deleteServiceListing,
  toggleListingStatus,
  submitForApproval,
  removePhoto,
  getListingAnalytics
} = require('../controllers/serviceListingController');

// All service listing routes require authentication and service provider role
router.use(requireAuth);
router.use(requireServiceProvider);

// Get analytics
router.get('/analytics', getListingAnalytics);

// Get all my listings
router.get('/', getMyServiceListings);

// Get single listing
router.get('/:listingId', getServiceListing);

// Create new listing
router.post('/', 
  uploadServiceListingImages,
  validateServiceListingCreation,
  createServiceListing
);

// Update listing
router.put('/:listingId',
  uploadServiceListingImages,
  validateServiceListingUpdate,
  updateServiceListing
);

// Delete listing
router.delete('/:listingId', deleteServiceListing);

// Toggle listing active status
router.patch('/:listingId/toggle-status', toggleListingStatus);

// Submit listing for approval
router.patch('/:listingId/submit-for-approval', submitForApproval);

// Remove photo from listing
router.delete('/:listingId/photos/:photoId', removePhoto);

module.exports = router;