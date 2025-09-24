const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ServiceListing = require('../models/ServiceListing');
const { validationResult } = require('express-validator');

// Get admin dashboard stats
const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      recentUsers,
      recentOrders,
      usersByRole
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5).select('firstName lastName email role createdAt'),
      Order.find().populate('buyer', 'firstName lastName email').sort({ createdAt: -1 }).limit(5),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ])
    ]);

    // Calculate revenue (mock calculation)
    const revenue = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const dashboardStats = {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: revenue[0]?.total || 0,
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentUsers,
      recentOrders
    };

    res.json({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get all users with advanced filtering
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      search,
      isActive,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const [users, total] = await Promise.all([
      User.find(query)
        .sort(sort)
        .limit(parseInt(limit))
        .skip(skip),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalUsers: total,
          hasNextPage: skip + users.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Update user status (activate/deactivate)
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, isVerified } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deactivating yourself
    if (userId === req.user.userId && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    const updates = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (isVerified !== undefined) updates.isVerified = isVerified;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true }
    );

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Update user details (admin only)
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, role, isActive, isVerified } = req.body;

    // Validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent changing your own role or deactivating yourself
    if (userId === req.user.userId) {
      if (role && role !== user.role) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change your own role'
        });
      }
      if (isActive === false) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account'
        });
      }
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
    }

    // Update user
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (isVerified !== undefined) updates.isVerified = isVerified;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email is already taken'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deleting yourself
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get system reports
const getSystemReports = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    let matchQuery = {};
    if (startDate && endDate) {
      matchQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let reportData = {};

    switch (type) {
      case 'users':
        reportData = await User.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                role: '$role'
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
        break;

      case 'orders':
        reportData = await Order.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                status: '$status'
              },
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
        break;

      case 'products':
        reportData = await Product.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                category: '$category'
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Get system reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get all service listings for admin review
const getAllServiceListings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, serviceType, search } = req.query;

    // Build query
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (serviceType && serviceType !== 'all') {
      query.serviceType = serviceType;
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    // Get total count for pagination
    const total = await ServiceListing.countDocuments(query);
    
    // Get listings with pagination
    const listings = await ServiceListing.find(query)
      .populate('serviceProvider', 'firstName lastName email phone serviceProviderDetails')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    res.json({
      success: true,
      data: {
        listings,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service listings',
      details: error.message
    });
  }
};

// Get single service listing for admin review
const getServiceListingForReview = async (req, res) => {
  try {
    const { listingId } = req.params;

    const listing = await ServiceListing.findById(listingId)
      .populate('serviceProvider', 'firstName lastName email phone serviceProviderDetails profileImage')
      .populate('approvedBy', 'firstName lastName email');

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Service listing not found'
      });
    }

    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service listing',
      details: error.message
    });
  }
};

// Approve or reject service listing
const updateServiceListingStatus = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { listingId } = req.params;
    const { status, adminNotes } = req.body;
    const adminId = req.user.userId;

    const listing = await ServiceListing.findById(listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Service listing not found'
      });
    }

    // Update listing status
    listing.status = status;
    listing.adminNotes = adminNotes || '';

    if (status === 'approved') {
      listing.approvedBy = adminId;
      listing.approvedAt = new Date();
      listing.rejectedAt = undefined;
    } else if (status === 'rejected') {
      listing.rejectedAt = new Date();
      listing.approvedBy = undefined;
      listing.approvedAt = undefined;
    }

    await listing.save();

    // Populate for response
    await listing.populate('serviceProvider', 'firstName lastName email');
    await listing.populate('approvedBy', 'firstName lastName');

    res.json({
      success: true,
      message: `Service listing ${status} successfully`,
      data: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update listing status',
      details: error.message
    });
  }
};

// Get service listings analytics for admin
const getServiceListingsAnalytics = async (req, res) => {
  try {
    const analytics = await ServiceListing.aggregate([
      {
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          pendingListings: { $sum: { $cond: [{ $eq: ['$status', 'pending_approval'] }, 1, 0] } },
          approvedListings: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejectedListings: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          draftListings: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          suspendedListings: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
          activeListings: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalViews: { $sum: '$views' },
          totalBookings: { $sum: '$bookingsCount' }
        }
      }
    ]);

    const statusBreakdown = await ServiceListing.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const serviceTypeBreakdown = await ServiceListing.aggregate([
      { $group: { _id: '$serviceType', count: { $sum: 1 } } }
    ]);

    const monthlyListings = await ServiceListing.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: {
        overview: analytics[0] || {
          totalListings: 0,
          pendingListings: 0,
          approvedListings: 0,
          rejectedListings: 0,
          draftListings: 0,
          suspendedListings: 0,
          activeListings: 0,
          totalViews: 0,
          totalBookings: 0
        },
        statusBreakdown,
        serviceTypeBreakdown,
        monthlyListings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      details: error.message
    });
  }
};

module.exports = {
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
};