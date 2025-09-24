const { body } = require('express-validator');

// User registration validation
const validateUserRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[0-9+()\-\s]{7,20}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('role')
    .optional()
    .isIn(['admin', 'customer_service_rep', 'service_provider', 'farmer'])
    .withMessage('Invalid role specified')
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Profile update validation
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[0-9+()\-\s]{7,20}$/)
    .withMessage('Please provide a valid phone number')
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Product creation validation
const validateProductCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('category')
    .isIn(['fruits', 'vegetables', 'grains', 'dairy', 'meat', 'herbs', 'spices', 'seeds', 'fertilizers', 'tools', 'equipment', 'other'])
    .withMessage('Invalid category'),
  
  body('price.amount')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('price.unit')
    .isIn(['per_kg', 'per_lb', 'per_piece', 'per_dozen', 'per_liter', 'per_meter', 'per_acre', 'per_hour'])
    .withMessage('Invalid price unit'),
  
  body('quantity.available')
    .isFloat({ min: 0 })
    .withMessage('Available quantity must be a positive number'),
  
  body('quantity.unit')
    .isIn(['kg', 'lb', 'pieces', 'dozen', 'liters', 'meters', 'acres'])
    .withMessage('Invalid quantity unit')
];

// Product update validation
const validateProductUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('category')
    .optional()
    .isIn(['fruits', 'vegetables', 'grains', 'dairy', 'meat', 'herbs', 'spices', 'seeds', 'fertilizers', 'tools', 'equipment', 'other'])
    .withMessage('Invalid category'),
  
  body('price.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('quantity.available')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Available quantity must be a positive number')
];

// Product review validation
const validateProductReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters')
];

// Service listing validation
const validateServiceListingCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  
  body('serviceType')
    .isIn(['equipment_rental', 'transportation', 'processing', 'consulting', 'harvesting', 'planting', 'pest_control', 'irrigation', 'soil_testing', 'other'])
    .withMessage('Invalid service type'),
  
  body('pricing')
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const pricing = JSON.parse(value);
          if (!pricing.type || !['fixed', 'hourly', 'daily', 'per_acre', 'per_unit', 'negotiable'].includes(pricing.type)) {
            throw new Error('Invalid pricing type');
          }
          // Handle pricing amount validation - allow empty string or valid number
          if (pricing.amount !== undefined && pricing.amount !== '' && (isNaN(pricing.amount) || pricing.amount < 0)) {
            throw new Error('Price must be a positive number');
          }
          return true;
        } catch (e) {
          throw new Error('Invalid pricing data');
        }
      }
      return true;
    }),
  
  body('serviceArea')
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const areas = JSON.parse(value);
          if (!Array.isArray(areas) || areas.length === 0) {
            throw new Error('At least one service area is required');
          }
          // Check for empty or invalid area values
          const validAreas = areas.filter(area => area && area.trim().length > 0);
          if (validAreas.length === 0) {
            throw new Error('At least one valid service area is required');
          }
          return true;
        } catch (e) {
          throw new Error('Invalid service area data');
        }
      }
      return true;
    }),
  
  body('contactInfo')
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const contact = JSON.parse(value);
          if (!contact.phone || !/^[0-9+()\-\s]{7,20}$/.test(contact.phone)) {
            throw new Error('Please provide a valid phone number');
          }
          if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
            throw new Error('Please provide a valid email address');
          }
          return true;
        } catch (e) {
          throw new Error('Invalid contact info data');
        }
      }
      return true;
    })
];

// Service listing update validation (similar to creation but all fields optional)
const validateServiceListingUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  
  body('serviceType')
    .optional()
    .isIn(['equipment_rental', 'transportation', 'processing', 'consulting', 'harvesting', 'planting', 'pest_control', 'irrigation', 'soil_testing', 'other'])
    .withMessage('Invalid service type'),
  
  body('pricing')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const pricing = JSON.parse(value);
          if (pricing.type && !['fixed', 'hourly', 'daily', 'per_acre', 'per_unit', 'negotiable'].includes(pricing.type)) {
            throw new Error('Invalid pricing type');
          }
          if (pricing.amount !== undefined && (isNaN(pricing.amount) || pricing.amount < 0)) {
            throw new Error('Price must be a positive number');
          }
          return true;
        } catch (e) {
          throw new Error('Invalid pricing data');
        }
      }
      return true;
    }),
  
  body('serviceArea')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const areas = JSON.parse(value);
          if (!Array.isArray(areas) || areas.length === 0) {
            throw new Error('At least one service area is required');
          }
          // Check for empty or invalid area values
          const validAreas = areas.filter(area => area && area.trim().length > 0);
          if (validAreas.length === 0) {
            throw new Error('At least one valid service area is required');
          }
          return true;
        } catch (e) {
          throw new Error('Invalid service area data');
        }
      }
      return true;
    }),
  
  body('contactInfo')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const contact = JSON.parse(value);
          if (contact.phone && !/^[0-9+()\-\s]{7,20}$/.test(contact.phone)) {
            throw new Error('Please provide a valid phone number');
          }
          if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
            throw new Error('Please provide a valid email address');
          }
          return true;
        } catch (e) {
          throw new Error('Invalid contact info data');
        }
      }
      return true;
    }),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Service listing status update validation
const validateServiceListingStatusUpdate = [
  body('status')
    .isIn(['approved', 'rejected', 'suspended'])
    .withMessage('Invalid status. Must be approved, rejected, or suspended'),
  
  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Admin notes cannot exceed 500 characters')
];

// Forum post validation
const validateForumPost = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('content')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Content must be between 10 and 5000 characters'),
  
  body('category')
    .isIn([
      'general',
      'crop_management',
      'livestock',
      'equipment',
      'weather',
      'market_prices',
      'pest_control',
      'soil_health',
      'organic_farming',
      'technology',
      'government_schemes',
      'success_stories'
    ])
    .withMessage('Invalid category selected'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters')
];

// Forum post update validation
const validateForumPostUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('content')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Content must be between 10 and 5000 characters'),
  
  body('category')
    .optional()
    .isIn([
      'general',
      'crop_management',
      'livestock',
      'equipment',
      'weather',
      'market_prices',
      'pest_control',
      'soil_health',
      'organic_farming',
      'technology',
      'government_schemes',
      'success_stories'
    ])
    .withMessage('Invalid category selected'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters')
];

// Comment validation
const validateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be between 1 and 2000 characters'),
  
  body('parentCommentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent comment ID')
];

// Comment update validation
const validateCommentUpdate = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be between 1 and 2000 characters')
];

// Admin user update validation
const validateAdminUserUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('role')
    .optional()
    .isIn(['admin', 'customer_service_rep', 'service_provider', 'farmer'])
    .withMessage('Invalid role specified'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  
  body('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean value')
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateProductCreation,
  validateProductUpdate,
  validateProductReview,
  validateServiceListingCreation,
  validateServiceListingUpdate,
  validateServiceListingStatusUpdate,
  validateForumPost,
  validateForumPostUpdate,
  validateComment,
  validateCommentUpdate,
  validateAdminUserUpdate
};