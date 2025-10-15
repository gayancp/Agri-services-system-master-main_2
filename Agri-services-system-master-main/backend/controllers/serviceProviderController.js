const User = require('../models/User');
const ServiceBooking = require('../models/ServiceBooking');
const ServiceListing = require('../models/ServiceListing');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');

let dashboardStats = {};
let bookingsMade = {};
let totalBookings = 0;

// Get service provider dashboard
const getServiceProviderDashboard = async (req, res) => {
  try {
    console.log('Dashboard API called for user:', req.user?.userId);
    const providerId = new mongoose.Types.ObjectId(req.user.userId);

    const [
      // Service booking statistics
      totalServiceBookings,
      pendingServiceBookings,
      confirmedServiceBookings,
      completedServiceBookings,
      serviceRevenue,
      recentServiceBookings,
      activeServiceListings,
      totalServiceListings
    ] = await Promise.all([
      // Service booking queries
      ServiceBooking.countDocuments({ serviceProvider: providerId }),
      ServiceBooking.countDocuments({ 
        serviceProvider: providerId, 
        status: 'pending_confirmation'
      }),
      ServiceBooking.countDocuments({ 
        serviceProvider: providerId, 
        status: { $in: ['confirmed', 'in_progress'] } 
      }),
      ServiceBooking.countDocuments({ 
        serviceProvider: providerId, 
        status: 'completed' 
      }),
      ServiceBooking.aggregate([
        { 
          $match: { 
            serviceProvider: providerId, 
            'payment.status': 'paid' 
          } 
        },
        { $group: { _id: null, total: { $sum: '$pricing.finalAmount' } } }
      ]),
      ServiceBooking.find({ serviceProvider: providerId })
        .populate('customer', 'firstName lastName email')
        .populate('serviceListing', 'title serviceType')
        .sort({ createdAt: -1 })
        .limit(5),
      ServiceListing.countDocuments({ serviceProvider: providerId, isActive: true }),
      ServiceListing.countDocuments({ serviceProvider: providerId })
    ]);

    dashboardStats = {
      // Service statistics only
      totalServiceBookings,
      pendingServiceBookings,
      confirmedServiceBookings,
      completedServiceBookings,
      serviceRevenue: serviceRevenue[0]?.total || 0,
      recentServiceBookings,
      activeServiceListings,
      totalServiceListings
    };

    res.json({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    console.error('Service provider dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get provider's service bookings
const getMyServiceBookings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    const providerId = new mongoose.Types.ObjectId(req.user.userId);

    // Build query
    const query = { serviceProvider: providerId };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query['booking.date'] = {};
      if (startDate) query['booking.date'].$gte = new Date(startDate);
      if (endDate) query['booking.date'].$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    let [bookings, total] = await Promise.all([
      ServiceBooking.find(query)
        .populate('customer', 'firstName lastName email phone')
        .populate('serviceListing', 'title serviceType pricing photos')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      ServiceBooking.countDocuments(query)
    ]);

    bookingsMade = bookings;
    totalBookings = total;

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
    console.error('Get provider service bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get service bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Update service booking status
const updateServiceBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, note } = req.body;
    const providerId = new mongoose.Types.ObjectId(req.user.userId);

    const booking = await ServiceBooking.findOne({
      _id: bookingId,
      serviceProvider: providerId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Service booking not found or not authorized'
      });
    }

    // Validate status transition
    const validStatuses = ['pending_confirmation', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Update booking
    booking.status = status;
    
    // Add timeline entry
    booking.timeline.push({
      status: status,
      message: note || `Status updated to ${status} by service provider`,
      timestamp: new Date(),
      updatedBy: providerId
    });

    // If marking as completed, update completion date
    if (status === 'completed') {
      booking.completedAt = new Date();
    }

    await booking.save();

    // Populate the updated booking for response
    await booking.populate([
      { path: 'customer', select: 'firstName lastName email phone' },
      { path: 'serviceListing', select: 'title serviceType pricing' }
    ]);

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Update service booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Update provider profile
const updateProviderProfile = async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'address',
      'serviceProviderDetails.businessName',
      'serviceProviderDetails.businessDescription',
      'serviceProviderDetails.businessType',
      'serviceProviderDetails.businessAddress',
      'serviceProviderDetails.businessPhone'
    ];

    // Filter updates to only allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update provider profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};
/*
const generateReport = async (req, res) => {

  try {

    const providerId = new mongoose.Types.ObjectId(req.user.userId);

    const bookings = await ServiceBooking.find({
      serviceProvider: providerId
    })
      .populate('customer', 'firstName')
      .populate('serviceListing', 'title');

    const doc = new PDFDocument();
    const buffers = [];

    const pdfBuffer = await new Promise((resolve, reject) => {
        // Set up event listeners
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', (error) => {
          reject(error);
        });

        // PDF Content
        doc.fontSize(20).text('Summary Report', { align: 'center' });
        doc.moveDown(1);

        doc.fontSize(15).text('Overview', { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(12)
          .text(`Total Service Bookings: ${dashboardStats.totalServiceBookings || 0}`);
        doc.moveDown(0.3);

        doc.fontSize(12)
          .text(`Pending Bookings: ${dashboardStats.pendingServiceBookings || 0}`);
        doc.moveDown(0.3);

        doc.fontSize(12)
          .text(`Confirmed Bookings: ${dashboardStats.confirmedServiceBookings || 0}`);
        doc.moveDown(0.3);

        doc.fontSize(12)
          .text(`Total Service Revenue: Rs${dashboardStats.serviceRevenue || 0}`);
        doc.moveDown(1);

        doc.fontSize(15).text('Service Listings', { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12)
          .text(`Total Service Listings: ${dashboardStats.totalServiceListings || 0}`);
        doc.moveDown(0.3);

        doc.fontSize(12)
          .text(`Active Service Listings: ${dashboardStats.activeServiceListings || 0}`);
        doc.moveDown(1);

        doc.fontSize(15).text('Recent Service Bookings', { underline: true });
        doc.moveDown(0.5);

        // Add actual booking data
        /*if (bookings.length > 0) {
          bookings.slice(0, 10).forEach((booking, index) => { // Show last 10 bookings
            doc.fontSize(10)
              .text(`${index + 1}. ${booking.serviceListing?.title || 'N/A'} - ${booking.customer?.firstName || 'Customer'} - Status: ${booking.status}`);
            doc.moveDown(0.2);
          });
        } else {
          doc.fontSize(10).text('No bookings found for the selected period.');
        }

        // Finalize PDF
        doc.end();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=service-report-${Date.now()}.pdf`);
        res.send(pdfBuffer);
      });

  } catch (error) {
      res.status(500).json({ error: 'Report generation failed' });
  }

}
*/

const generateReport = async (req, res) => {
  try {
    const providerId = new mongoose.Types.ObjectId(req.user.userId);

    // Fetch current data instead of relying on global variables
    const [
      bookings,
      totalServiceBookings,
      pendingServiceBookings,
      confirmedServiceBookings,
      serviceRevenue,
      totalServiceListings,
      activeServiceListings,
      serviceListings
    ] = await Promise.all([
      ServiceBooking.find({ serviceProvider: providerId })
        .populate('customer', 'firstName')
        .populate('serviceListing', 'title'),
      ServiceBooking.countDocuments({ serviceProvider: providerId }),
      ServiceBooking.countDocuments({ 
        serviceProvider: providerId, 
        status: 'pending_confirmation'
      }),
      ServiceBooking.countDocuments({ 
        serviceProvider: providerId, 
        status: { $in: ['confirmed', 'in_progress'] }
      }),
      ServiceBooking.aggregate([
        { 
          $match: { 
            serviceProvider: providerId, 
            'payment.status': 'paid' 
          } 
        },
        { $group: { _id: null, total: { $sum: '$pricing.finalAmount' } } }
      ]),
      ServiceListing.countDocuments({ serviceProvider: providerId }),
      ServiceListing.countDocuments({ serviceProvider: providerId, isActive: true }),
      ServiceListing.find({ serviceProvider: providerId })
    ]);

    const doc = new PDFDocument();
    const buffers = [];

    const pdfBuffer = await new Promise((resolve, reject) => {
      // Set up event listeners
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', (error) => {
        reject(error);
      });

      // PDF Content
      doc.fontSize(20).text('Summary Report', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(20).text('==============================', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(15).text('Overview', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(12)
        .text(`Total Service Bookings: ${totalServiceBookings || 0}`);
      doc.moveDown(0.3);

      doc.fontSize(12)
        .text(`Pending Bookings: ${pendingServiceBookings || 0}`);
      doc.moveDown(0.3);

      doc.fontSize(12)
        .text(`Confirmed Bookings: ${confirmedServiceBookings || 0}`);
      doc.moveDown(0.3);

      const revenue = serviceRevenue[0]?.total || 0;
      doc.fontSize(12)
        .text(`Total Service Revenue: Rs ${revenue.toLocaleString()}`);
      doc.moveDown(1);

      doc.fontSize(15).text('My Listing Statistics', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(12)
        .text(`Total Service Listings: ${totalServiceListings || 0}`);
      doc.moveDown(0.3);

      doc.fontSize(12)
        .text(`Active Service Listings: ${activeServiceListings || 0}`);
      doc.moveDown(1);

      doc.fontSize(15).text('Service Bookings', { underline: true });
      doc.moveDown(0.5);

      // Add actual booking data
      if (bookings.length > 0) {
        bookings.forEach((booking, index) => {
          doc.fontSize(12)
            .text(`${index + 1}. ${booking.serviceListing?.title || 'N/A'} - ${booking.customer?.firstName || 'Customer'} - Status: ${booking.status}`);
          doc.moveDown(0.2);
        });
      } else {
        doc.fontSize(12).text('No bookings found.');
      }
      doc.moveDown(1);

      doc.fontSize(15).text('My Service Listings', { underline: true });
      doc.moveDown(0.5);

      if (serviceListings.length > 0) {   
        serviceListings.forEach((listing, index) => {
          doc.fontSize(12)
            .text(`${index + 1}. ${listing.title || 'N/A'} - Title: ${listing.serviceType || 'N/A'} - Status: ${listing.status}`);
          doc.moveDown(0.2);
        }); 
      } else {
        doc.fontSize(12).text('No listings found.');
      }

      // Finalize PDF
      doc.end();
    });

    // Set response headers and send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=service-report-${Date.now()}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Report generation failed: ' + error.message 
    });
  }
};

module.exports = {
  getServiceProviderDashboard,
  getMyServiceBookings,
  updateServiceBookingStatus,
  updateProviderProfile,
  generateReport
};