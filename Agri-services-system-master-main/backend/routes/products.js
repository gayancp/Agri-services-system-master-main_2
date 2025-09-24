const express = require('express');
const router = express.Router();

// Import controllers
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
  addProductReview,
  getProductCategories
} = require('../controllers/productController');

// Import middleware
const { authenticateToken, authorizeRoles, optionalAuth } = require('../middleware/auth');
const {
  validateProductCreation,
  validateProductUpdate,
  validateProductReview
} = require('../middleware/validation');

// Public routes
router.get('/', optionalAuth, getAllProducts);
router.get('/categories', getProductCategories);
router.get('/:id', getProductById);
router.get('/seller/:sellerId', getProductsBySeller);

// Protected routes (require authentication)
router.post('/', authenticateToken, authorizeRoles('farmer', 'supplier', 'admin'), validateProductCreation, createProduct);
router.put('/:id', authenticateToken, validateProductUpdate, updateProduct);
router.delete('/:id', authenticateToken, deleteProduct);

// Review routes
router.post('/:id/reviews', authenticateToken, validateProductReview, addProductReview);

module.exports = router;