const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Get CSR dashboard stats
const getCSRDashboard = async (req, res) => {
  try {
    const [
      totalTickets,
      pendingTickets,
      resolvedTickets,
      recentOrders,
      pendingOrders,
      customerQueries
    ] = await Promise.all([
      // For now, we'll use orders as tickets until we create a separate ticket model
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.find()
        .populate('buyer', 'firstName lastName email')
        .populate('products.product', 'name price')
        .sort({ createdAt: -1 })
        .limit(10),
      Order.find({ status: { $in: ['pending', 'processing'] } })
        .populate('buyer', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(5),
      User.find({ role: 'farmer' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName email phone createdAt')
    ]);

    const dashboardStats = {
      totalTickets,
      pendingTickets,
      resolvedTickets,
      activeCustomers: await User.countDocuments({ role: 'farmer', isActive: true }),
      recentOrders,
      pendingOrders,
      customerQueries
    };

    res.json({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    console.error('CSR dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get all customer queries/orders
const getCustomerQueries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query for orders (acting as tickets for now)
    const query = {};
    if (status) query.status = status;
    if (search) {
      // Search in buyer details
      const users = await User.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      query.buyer = { $in: users.map(u => u._id) };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const [queries, total] = await Promise.all([
      Order.find(query)
        .populate('buyer', 'firstName lastName email phone')
        .populate('products.product', 'name price')
        .sort(sort)
        .limit(parseInt(limit))
        .skip(skip),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        queries,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalQueries: total,
          hasNextPage: skip + queries.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get customer queries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer queries',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order
    order.status = status;
    if (notes) {
      if (!order.customerServiceNotes) {
        order.customerServiceNotes = [];
      }
      order.customerServiceNotes.push({
        note: notes,
        addedBy: req.user.userId,
        addedAt: new Date()
      });
    }

    await order.save();

    const updatedOrder = await Order.findById(orderId)
      .populate('buyer', 'firstName lastName email')
      .populate('products.product', 'name price');

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order: updatedOrder }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get customer details
const getCustomerDetails = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await User.findById(customerId).select('-password');
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get customer's order history
    const orders = await Order.find({ buyer: customerId })
      .populate('products.product', 'name price')
      .sort({ createdAt: -1 });

    // Calculate customer stats
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    res.json({
      success: true,
      data: {
        customer,
        orderHistory: orders,
        stats: {
          totalOrders,
          totalSpent,
          avgOrderValue,
          joinDate: customer.createdAt,
          lastOrderDate: orders[0]?.createdAt || null
        }
      }
    });
  } catch (error) {
    console.error('Get customer details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer details',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Create customer support note
const createSupportNote = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { note, priority = 'medium' } = req.body;

    if (!note) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Add note to customer's support notes
    if (!customer.customerServiceDetails) {
      customer.customerServiceDetails = { supportNotes: [] };
    }
    if (!customer.customerServiceDetails.supportNotes) {
      customer.customerServiceDetails.supportNotes = [];
    }

    customer.customerServiceDetails.supportNotes.push({
      note,
      priority,
      createdBy: req.user.userId,
      createdAt: new Date()
    });

    await customer.save();

    res.json({
      success: true,
      message: 'Support note created successfully',
      data: { customer }
    });
  } catch (error) {
    console.error('Create support note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support note',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get support statistics
const getSupportStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const [
      orderStats,
      customerStats,
      dailyStats
    ] = await Promise.all([
      Order.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgAmount: { $avg: '$totalAmount' }
          }
        }
      ]),
      User.aggregate([
        { $match: { role: 'farmer', ...dateQuery } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            newCustomers: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Order.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        orderStats,
        customerStats,
        dailyStats
      }
    });
  } catch (error) {
    console.error('Get support stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get support statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getCSRDashboard,
  getCustomerQueries,
  updateOrderStatus,
  getCustomerDetails,
  createSupportNote,
  getSupportStats
};