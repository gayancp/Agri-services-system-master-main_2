const express = require('express');
const router = express.Router();
const { requireAuth, requireCustomerService } = require('../middleware/auth');
const {
  getCSRDashboard,
  getCustomerQueries,
  updateOrderStatus,
  getCustomerDetails,
  createSupportNote,
  getSupportStats
} = require('../controllers/csrController');

// All CSR routes require authentication and customer service role
router.use(requireAuth);
router.use(requireCustomerService);

// Dashboard
router.get('/dashboard', getCSRDashboard);

// Customer Queries/Orders Management
router.get('/queries', getCustomerQueries);
router.patch('/orders/:orderId/status', updateOrderStatus);

// Customer Management
router.get('/customers/:customerId', getCustomerDetails);
router.post('/customers/:customerId/notes', createSupportNote);

// Support Statistics
router.get('/stats', getSupportStats);

module.exports = router;