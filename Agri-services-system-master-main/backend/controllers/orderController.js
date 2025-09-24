const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// Create a new order
const createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { items, shippingAddress, deliveryMethod, paymentMethod, notes } = req.body;

    // Validate and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || product.status !== 'available') {
        return res.status(400).json({
          success: false,
          message: `Product ${product?.name || item.product} is not available`
        });
      }

      if (product.quantity.available < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity for ${product.name}. Available: ${product.quantity.available}`
        });
      }

      const itemTotal = product.price.amount * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price.amount,
        unit: product.price.unit
      });
    }

    // Get seller from first item (assuming all items from same seller for now)
    const firstProduct = await Product.findById(orderItems[0].product);
    const seller = firstProduct.seller;

    // Create order
    const order = new Order({
      buyer: req.user.userId,
      seller,
      items: orderItems,
      totalAmount,
      shippingAddress,
      deliveryMethod,
      paymentMethod,
      notes: {
        buyer: notes
      }
    });

    await order.save();

    // Update product quantities
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { 'quantity.available': -item.quantity } }
      );
    }

    // Populate order details
    await order.populate([
      { path: 'buyer', select: 'firstName lastName email phone' },
      { path: 'seller', select: 'firstName lastName email phone' },
      { path: 'items.product', select: 'name category images' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    const { type = 'all', page = 1, limit = 10, status } = req.query;
    
    // Build query based on user role
    let query = {};
    if (type === 'purchases' || req.user.role === 'buyer') {
      query.buyer = req.user.userId;
    } else if (type === 'sales' || req.user.role === 'farmer' || req.user.role === 'supplier') {
      query.seller = req.user.userId;
    } else {
      // Show both purchases and sales
      query.$or = [
        { buyer: req.user.userId },
        { seller: req.user.userId }
      ];
    }

    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('buyer', 'firstName lastName email phone')
        .populate('seller', 'firstName lastName email phone')
        .populate('items.product', 'name category images price')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalOrders: total,
          hasNextPage: skip + orders.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('buyer', 'firstName lastName email phone address')
      .populate('seller', 'firstName lastName email phone address')
      .populate('items.product', 'name category images price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user has permission to view this order
    if (
      order.buyer._id.toString() !== req.user.userId &&
      order.seller._id.toString() !== req.user.userId &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this order'
      });
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check permissions
    const isSeller = order.seller.toString() === req.user.userId;
    const isBuyer = order.buyer.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isSeller && !isBuyer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this order'
      });
    }

    // Validate status transitions
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['ready_for_pickup', 'shipped'],
      ready_for_pickup: ['delivered'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: ['refunded'],
      refunded: []
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.status} to ${status}`
      });
    }

    // Update order
    order.status = status;
    if (notes) {
      if (isSeller) order.notes.seller = notes;
      if (isBuyer) order.notes.buyer = notes;
      if (isAdmin) order.notes.admin = notes;
    }

    // Add tracking update
    order.tracking.updates.push({
      status,
      message: `Order ${status.replace('_', ' ')}`,
      timestamp: new Date()
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order }
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

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check permissions and cancellation eligibility
    const isBuyer = order.buyer.toString() === req.user.userId;
    const isSeller = order.seller.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to cancel this order'
      });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    // Update order status
    order.status = 'cancelled';
    if (reason) {
      if (isBuyer) order.notes.buyer = reason;
      if (isSeller) order.notes.seller = reason;
      if (isAdmin) order.notes.admin = reason;
    }

    // Restore product quantities
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { 'quantity.available': item.quantity } }
      );
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder
};