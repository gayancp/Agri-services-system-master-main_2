const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    // Add user info to request (store string form of ObjectId for consistent comparisons)
    const userIdStr = user._id.toString();
    req.user = {
      userId: userIdStr,
      id: userIdStr, // legacy alias used by some older controllers
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Check user roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Check if user is customer service rep or admin
const requireCustomerService = (req, res, next) => {
  if (!['admin', 'customer_service_rep'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Customer service access required'
    });
  }
  next();
};

// Check if user is service provider or admin
const requireServiceProvider = (req, res, next) => {
  if (!['admin', 'service_provider'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Service provider access required'
    });
  }
  next();
};


const requireFarmer = (req, res, next) => {
  if (!['admin', 'farmer'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Farmer access required'
    });
  }
  next();
};


const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = {
          userId: user._id,
          email: user.email,
          role: user.role
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateToken,
  requireAuth: authenticateToken, 
  authorizeRoles,
  optionalAuth,
  requireAdmin,
  requireCustomerService,
  requireServiceProvider,
  requireFarmer
};