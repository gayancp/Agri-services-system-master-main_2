const ServiceBooking = require('../models/ServiceBooking');
const ServiceListing = require('../models/ServiceListing');
const User = require('../models/User');

// Demo payment processing for service bookings
const processServicePayment = async (req, res) => {
  try {
    const {
      serviceId,
      serviceName,
      providerId,
      buyerId,
      bookingDate,
      bookingTime,
      fieldSize,
      amount,
      currency = 'LKR',
      paymentMethod = 'demo_card',
      cardLast4,
      notes,
      billingAddress
    } = req.body;

    // Validate required fields
    if (!serviceId || !providerId || !buyerId || !bookingDate || !bookingTime || !fieldSize || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate field size
    if (fieldSize <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Field size must be greater than 0'
      });
    }

    // Verify service listing exists
    const serviceListing = await ServiceListing.findById(serviceId);
    if (!serviceListing) {
      return res.status(404).json({
        success: false,
        message: 'Service listing not found'
      });
    }

    // Verify service provider exists
    const serviceProvider = await User.findById(providerId);
    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }

    // Verify customer exists
    const customer = await User.findById(buyerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if the booking time is available (basic check)
    const bookingDateTime = new Date(bookingDate);
    const [hours, minutes] = bookingTime.split(':');
    bookingDateTime.setHours(parseInt(hours), parseInt(minutes));

    if (bookingDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book for past dates/times'
      });
    }

    // Check for conflicting bookings
    const existingBooking = await ServiceBooking.findOne({
      serviceListing: serviceId,
      'booking.date': {
        $gte: new Date(bookingDate).setHours(0, 0, 0, 0),
        $lt: new Date(bookingDate).setHours(23, 59, 59, 999)
      },
      'booking.time': bookingTime,
      status: { $in: ['pending_confirmation', 'confirmed', 'in_progress'] }
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }

    // Simulate payment processing delay (for demo)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Demo payment validation - simulate success/failure
    const paymentSuccess = Math.random() > 0.05; // 95% success rate

    if (!paymentSuccess) {
      return res.status(400).json({
        success: false,
        message: 'Payment failed. Please try again with different card details.'
      });
    }

    // Generate unique booking number and transaction ID
    const bookingNumber = `BK${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // Create service booking
    const serviceBooking = new ServiceBooking({
      bookingNumber: bookingNumber,
      customer: buyerId,
      serviceProvider: providerId,
      serviceListing: serviceId,
      serviceDetails: {
        title: serviceListing.title,
        serviceType: serviceListing.serviceType,
        description: serviceListing.description
      },
      booking: {
        date: new Date(bookingDate),
        time: bookingTime,
        fieldSize: parseFloat(fieldSize)
      },
      pricing: {
        amount: serviceListing.pricing.amount,
        currency: currency,
        type: serviceListing.pricing.type,
        finalAmount: amount
      },
      payment: {
        status: 'paid',
        method: paymentMethod,
        transactionId: transactionId,
        paidAt: new Date(),
        cardLast4: cardLast4,
        billingAddress: billingAddress
      },
      notes: {
        customer: notes
      },
      timeline: [{
        status: 'pending_confirmation',
        message: 'Booking created and payment processed',
        timestamp: new Date(),
        updatedBy: buyerId
      }]
    });

    await serviceBooking.save();

    // Populate the booking data for response
    await serviceBooking.populate([
      {
        path: 'customer',
        select: 'firstName lastName email phone'
      },
      {
        path: 'serviceProvider',
        select: 'firstName lastName email phone isVerifiedProvider'
      },
      {
        path: 'serviceListing',
        select: 'title serviceType pricing photos'
      }
    ]);

    // Create response data
    const responseData = {
      booking: serviceBooking,
      receipt: {
        transactionId: serviceBooking.payment.transactionId,
        bookingNumber: serviceBooking.bookingNumber,
        amount: serviceBooking.pricing.finalAmount,
        currency: serviceBooking.pricing.currency,
        paymentMethod: serviceBooking.payment.method,
        paidAt: serviceBooking.payment.paidAt,
        service: {
          name: serviceBooking.serviceDetails.title,
          type: serviceBooking.serviceDetails.serviceType,
          date: serviceBooking.booking.date,
          time: serviceBooking.booking.time
        },
        customer: {
          name: `${serviceBooking.customer.firstName} ${serviceBooking.customer.lastName}`,
          email: serviceBooking.customer.email
        },
        provider: {
          name: `${serviceBooking.serviceProvider.firstName} ${serviceBooking.serviceProvider.lastName}`,
          email: serviceBooking.serviceProvider.email
        }
      }
    };

    res.status(201).json({
      success: true,
      message: 'Service booking created successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Service payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get service bookings for a user
const getUserServiceBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    // Build query
    const query = {
      $or: [
        { customer: userId },
        { serviceProvider: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      ServiceBooking.find(query)
        .populate('customer', 'firstName lastName email phone')
        .populate('serviceProvider', 'firstName lastName email phone isVerifiedProvider')
        .populate('serviceListing', 'title serviceType pricing photos')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ServiceBooking.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalBookings: total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user service bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get a specific service booking
const getServiceBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await ServiceBooking.findById(bookingId)
      .populate('customer', 'firstName lastName email phone')
      .populate('serviceProvider', 'firstName lastName email phone isVerifiedProvider')
      .populate('serviceListing', 'title serviceType pricing photos serviceArea contactInfo');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Service booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Get service booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update service booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, note } = req.body;
    const userId = req.user.userId;

    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Service booking not found'
      });
    }

    // Check if user has permission to update this booking
    const isCustomer = booking.customer.toString() === userId;
    const isProvider = booking.serviceProvider.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Update status
    booking.status = status;

    // Add timeline entry
    booking.timeline.push({
      status: status,
      message: note || `Status updated to ${status}`,
      timestamp: new Date(),
      updatedBy: userId
    });

    await booking.save();

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Cancel service booking
const cancelServiceBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Service booking not found'
      });
    }

    // Check if user has permission to cancel this booking
    const isCustomer = booking.customer.toString() === userId;
    const isProvider = booking.serviceProvider.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    // Check if booking can be cancelled
    if (['completed', 'cancelled', 'refunded'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel this booking in its current status'
      });
    }

    // Check cancellation timing (24 hours before booking)
    const bookingDateTime = new Date(booking.booking.date);
    const [hours, minutes] = booking.booking.time.split(':');
    bookingDateTime.setHours(parseInt(hours), parseInt(minutes));
    
    const hoursUntilBooking = (bookingDateTime - new Date()) / (1000 * 60 * 60);
    
    if (hoursUntilBooking < 24) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking less than 24 hours before scheduled time'
      });
    }

    // Update booking
    booking.status = 'cancelled';
    booking.cancellation = {
      reason: reason,
      cancelledBy: userId,
      cancelledAt: new Date(),
      refundAmount: booking.pricing.finalAmount,
      refundStatus: 'pending'
    };

    booking.timeline.push({
      status: 'cancelled',
      message: `Booking cancelled${reason ? ': ' + reason : ''}`,
      timestamp: new Date(),
      updatedBy: userId
    });

    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully. Refund will be processed within 5-7 business days.',
      data: booking
    });

  } catch (error) {
    console.error('Cancel service booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update service booking details
const updateServiceBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { bookingDate, bookingTime, notes } = req.body;
    const userId = req.user.userId;

    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Service booking not found'
      });
    }

    // Permission logic: customer can modify date/time & notes; provider/admin can adjust notes only
    const isCustomer = booking.customer.toString() === userId;
    const isProvider = booking.serviceProvider.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Check if booking can be updated
    if (['completed', 'cancelled', 'refunded', 'in_progress'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update booking in its current status'
      });
    }

    // Check update timing (at least 24 hours before booking) for date/time changes only
    const currentBookingDateTime = new Date(booking.booking.date);
    const [currentHours, currentMinutes] = booking.booking.time.split(':');
    currentBookingDateTime.setHours(parseInt(currentHours), parseInt(currentMinutes));
    const hoursUntilCurrentBooking = (currentBookingDateTime - new Date()) / (1000 * 60 * 60);
    const wantsToChangeDateOrTime = Boolean(bookingDate || bookingTime);
    if (wantsToChangeDateOrTime && hoursUntilCurrentBooking < 24) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change date/time less than 24 hours before scheduled time'
      });
    }

    // If new date/time provided, validate it
    if (wantsToChangeDateOrTime) {
      // Only customers (or admin) may change date/time
      if (!isCustomer && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only the customer or an admin can modify date/time'
        });
      }
      const newDate = bookingDate || booking.booking.date;
      const newTime = bookingTime || booking.booking.time;
      
      const newBookingDateTime = new Date(newDate);
      const [newHours, newMinutes] = newTime.split(':');
      newBookingDateTime.setHours(parseInt(newHours), parseInt(newMinutes));

      if (newBookingDateTime <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot schedule for past dates/times'
        });
      }

      // Check for conflicting bookings (excluding current booking)
      const existingBooking = await ServiceBooking.findOne({
        _id: { $ne: bookingId },
        serviceListing: booking.serviceListing,
        'booking.date': {
          $gte: new Date(newDate).setHours(0, 0, 0, 0),
          $lt: new Date(newDate).setHours(23, 59, 59, 999)
        },
        'booking.time': newTime,
        status: { $in: ['pending_confirmation', 'confirmed', 'in_progress'] }
      });

      if (existingBooking) {
        return res.status(409).json({
          success: false,
          message: 'This time slot is already booked'
        });
      }

      // Update booking date/time
      booking.booking.date = new Date(newDate);
      booking.booking.time = newTime;
    }

    // Update notes if provided
    if (notes !== undefined) {
      if (isCustomer) booking.notes.customer = notes;
      if (isProvider) booking.notes.provider = notes;
      if (isAdmin) booking.notes.admin = notes;
    }

    // Add timeline entry
    booking.timeline.push({
      status: booking.status,
  message: 'Booking details/notes updated',
      timestamp: new Date(),
      updatedBy: userId
    });

    await booking.save();

    // Populate the booking data for response
    await booking.populate([
      {
        path: 'customer',
        select: 'firstName lastName email phone'
      },
      {
        path: 'serviceProvider',
        select: 'firstName lastName email phone isVerifiedProvider'
      },
      {
        path: 'serviceListing',
        select: 'title serviceType pricing photos'
      }
    ]);

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    });

  } catch (error) {
    console.error('Update service booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete service booking (permanent deletion)
const deleteServiceBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;

    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Service booking not found'
      });
    }

    // Check if user has permission to delete this booking
    const isCustomer = booking.customer.toString() === userId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isCustomer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this booking'
      });
    }

    // Check if booking can be deleted (only cancelled or completed bookings can be deleted)
    if (!['cancelled', 'completed', 'refunded'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Can only delete cancelled, completed, or refunded bookings'
      });
    }

    // Delete the booking
    await ServiceBooking.findByIdAndDelete(bookingId);

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });

  } catch (error) {
    console.error('Delete service booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  processServicePayment,
  getUserServiceBookings,
  getServiceBooking,
  updateBookingStatus,
  cancelServiceBooking,
  updateServiceBooking,
  deleteServiceBooking
};