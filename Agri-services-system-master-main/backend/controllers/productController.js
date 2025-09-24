const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const User = require('../models/User');

// Create a new product
const createProduct = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const productData = {
      ...req.body,
      seller: req.user.userId
    };

    const product = new Product(productData);
    await product.save();

    // Populate seller information
    await product.populate('seller', 'firstName lastName email phone');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get all products with filtering and pagination
const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      subcategory,
      search,
      minPrice,
      maxPrice,
      isOrganic,
      status = 'available',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      location,
      radius = 50 // in kilometers
    } = req.query;

    // Build query
    const query = { isActive: true };
    
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (status) query.status = status;
    if (isOrganic !== undefined) query.isOrganic = isOrganic === 'true';
    
    // Price range filter
    if (minPrice || maxPrice) {
      query['price.amount'] = {};
      if (minPrice) query['price.amount'].$gte = parseFloat(minPrice);
      if (maxPrice) query['price.amount'].$lte = parseFloat(maxPrice);
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Location-based search
    if (location) {
      const [lat, lng] = location.split(',').map(parseFloat);
      if (lat && lng) {
        query['location.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: radius * 1000 // Convert km to meters
          }
        };
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    if (search && !sortBy) {
      sort.score = { $meta: 'textScore' };
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('seller', 'firstName lastName email phone')
        .sort(sort)
        .limit(parseInt(limit))
        .skip(skip),
      Product.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProducts: total,
          hasNextPage: skip + products.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get products',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('seller', 'firstName lastName email phone address farmDetails')
      .populate('reviews.user', 'firstName lastName');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment view count
    product.views += 1;
    await product.save();

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    // Find product and check ownership
    const product = await Product.findOne({ _id: id, seller: req.user.userId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission to update it'
      });
    }

    // Update product
    Object.assign(product, req.body);
    await product.save();

    await product.populate('seller', 'firstName lastName email phone');

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Find product and check ownership
    const product = await Product.findOne({ _id: id, seller: req.user.userId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission to delete it'
      });
    }

    // Soft delete by setting isActive to false
    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get products by seller
const getProductsBySeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const {
      page = 1,
      limit = 12,
      status,
      category,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { seller: sellerId, isActive: true };
    if (status) query.status = status;
    if (category) query.category = category;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('seller', 'firstName lastName email phone')
        .sort(sort)
        .limit(parseInt(limit))
        .skip(skip),
      Product.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProducts: total,
          hasNextPage: skip + products.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get products by seller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get seller products',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Add product review
const addProductReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already reviewed this product
    const existingReview = product.reviews.find(
      review => review.user.toString() === req.user.userId
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Add review
    product.reviews.push({
      user: req.user.userId,
      rating,
      comment
    });

    // Update average rating
    product.updateAverageRating();
    await product.save();

    await product.populate('reviews.user', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add review',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get product categories
const getProductCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    const subcategories = await Product.aggregate([
      { $group: { _id: '$category', subcategories: { $addToSet: '$subcategory' } } }
    ]);

    res.json({
      success: true,
      data: {
        categories,
        subcategories: subcategories.reduce((acc, item) => {
          acc[item._id] = item.subcategories.filter(sub => sub);
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
  addProductReview,
  getProductCategories
};