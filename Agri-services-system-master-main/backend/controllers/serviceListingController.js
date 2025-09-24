const ServiceListing = require('../models/ServiceListing');
const { validationResult } = require('express-validator');
const { deleteUploadedFiles, deleteFile } = require('../middleware/upload');
const path = require('path');

// Get all service listings (for service providers to view their own)
const getMyServiceListings = async (req, res) => {
  try {
    const providerId = req.user.userId;
    const { page = 1, limit = 10, status, search } = req.query;

    // Build query
    const query = { serviceProvider: providerId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    // Get total count for pagination
    const total = await ServiceListing.countDocuments(query);
    
    // Get listings with pagination
    const listings = await ServiceListing.find(query)
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

// Get single service listing
const getServiceListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const providerId = req.user.userId;

    const listing = await ServiceListing.findOne({
      _id: listingId,
      serviceProvider: providerId
    });

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

// Create new service listing
const createServiceListing = async (req, res) => {
  console.log('=== CREATE SERVICE LISTING REQUEST ===');
  console.log('User:', req.user);
  console.log('Headers:', req.headers);
  console.log('Body keys:', Object.keys(req.body));
  
  try {
    // Log request data for debugging
    console.log('Request body:', req.body);
    console.log('Request files:', req.files ? req.files.length : 'none');
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      // Delete uploaded files if validation fails
      if (req.files && req.files.length > 0) {
        deleteUploadedFiles(req.files);
      }
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const providerId = req.user.userId;
    
    // Prepare photos array from uploaded files
    const photos = req.files ? req.files.map(file => ({
      url: `/uploads/service-listings/${file.filename}`,
      filename: file.filename,
      uploadedAt: new Date()
    })) : [];

    // Prepare listing data
    const listingData = {
      ...req.body,
      serviceProvider: providerId,
      photos,
      status: 'draft' // Start as draft
    };

    // Parse JSON fields if they were sent as strings
    if (typeof listingData.pricing === 'string') {
      listingData.pricing = JSON.parse(listingData.pricing);
    }
    if (typeof listingData.contactInfo === 'string') {
      listingData.contactInfo = JSON.parse(listingData.contactInfo);
    }
    if (typeof listingData.availability === 'string') {
      listingData.availability = JSON.parse(listingData.availability);
    }
    if (typeof listingData.requirements === 'string') {
      listingData.requirements = JSON.parse(listingData.requirements);
    }
    if (typeof listingData.serviceArea === 'string') {
      listingData.serviceArea = JSON.parse(listingData.serviceArea);
    }
    if (typeof listingData.tags === 'string') {
      listingData.tags = JSON.parse(listingData.tags);
    }

    const listing = new ServiceListing(listingData);
    await listing.save();

    res.status(201).json({
      success: true,
      message: 'Service listing created successfully',
      data: listing
    });
  } catch (error) {
    // Delete uploaded files if creation fails
    if (req.files && req.files.length > 0) {
      deleteUploadedFiles(req.files);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create service listing',
      details: error.message
    });
  }
};

// Update service listing
const updateServiceListing = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Delete uploaded files if validation fails
      if (req.files && req.files.length > 0) {
        deleteUploadedFiles(req.files);
      }
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { listingId } = req.params;
    const providerId = req.user.userId;

    const listing = await ServiceListing.findOne({
      _id: listingId,
      serviceProvider: providerId
    });

    if (!listing) {
      // Delete uploaded files if listing not found
      if (req.files && req.files.length > 0) {
        deleteUploadedFiles(req.files);
      }
      return res.status(404).json({
        success: false,
        error: 'Service listing not found'
      });
    }

    // Prepare update data
    const updateData = { ...req.body };

    // Parse JSON fields if they were sent as strings
    if (typeof updateData.pricing === 'string') {
      updateData.pricing = JSON.parse(updateData.pricing);
    }
    if (typeof updateData.contactInfo === 'string') {
      updateData.contactInfo = JSON.parse(updateData.contactInfo);
    }
    if (typeof updateData.availability === 'string') {
      updateData.availability = JSON.parse(updateData.availability);
    }
    if (typeof updateData.requirements === 'string') {
      updateData.requirements = JSON.parse(updateData.requirements);
    }
    if (typeof updateData.serviceArea === 'string') {
      updateData.serviceArea = JSON.parse(updateData.serviceArea);
    }
    if (typeof updateData.tags === 'string') {
      updateData.tags = JSON.parse(updateData.tags);
    }

    // Handle new photos
    if (req.files && req.files.length > 0) {
      const newPhotos = req.files.map(file => ({
        url: `/uploads/service-listings/${file.filename}`,
        filename: file.filename,
        uploadedAt: new Date()
      }));
      
      // Add new photos to existing ones or replace based on request
      if (req.body.replacePhotos === 'true') {
        // Delete old photos and replace with new ones
        if (listing.photos && listing.photos.length > 0) {
          listing.photos.forEach(photo => {
            deleteFile(photo.filename);
          });
        }
        updateData.photos = newPhotos;
      } else {
        // Add new photos to existing ones
        updateData.photos = [...(listing.photos || []), ...newPhotos];
      }
    }

    // If listing was approved and major changes are made, reset to pending
    const majorFields = ['title', 'description', 'serviceType', 'pricing'];
    const hasMajorChanges = majorFields.some(field => updateData[field] !== undefined);
    
    if (listing.status === 'approved' && hasMajorChanges) {
      updateData.status = 'pending_approval';
      updateData.approvedBy = undefined;
      updateData.approvedAt = undefined;
    }

    // Update the listing
    Object.assign(listing, updateData);
    await listing.save();

    res.json({
      success: true,
      message: 'Service listing updated successfully',
      data: listing
    });
  } catch (error) {
    // Delete uploaded files if update fails
    if (req.files && req.files.length > 0) {
      deleteUploadedFiles(req.files);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update service listing',
      details: error.message
    });
  }
};

// Delete service listing
const deleteServiceListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const providerId = req.user.userId;

    const listing = await ServiceListing.findOne({
      _id: listingId,
      serviceProvider: providerId
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Service listing not found'
      });
    }

    // Delete associated photos
    if (listing.photos && listing.photos.length > 0) {
      listing.photos.forEach(photo => {
        deleteFile(photo.filename);
      });
    }

    await ServiceListing.findByIdAndDelete(listingId);

    res.json({
      success: true,
      message: 'Service listing deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete service listing',
      details: error.message
    });
  }
};

// Toggle listing active status
const toggleListingStatus = async (req, res) => {
  try {
    const { listingId } = req.params;
    const providerId = req.user.userId;
    const { isActive } = req.body;

    const listing = await ServiceListing.findOne({
      _id: listingId,
      serviceProvider: providerId
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Service listing not found'
      });
    }

    listing.isActive = isActive;
    await listing.save();

    res.json({
      success: true,
      message: `Service listing ${isActive ? 'activated' : 'deactivated'} successfully`,
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

// Submit listing for approval
const submitForApproval = async (req, res) => {
  try {
    const { listingId } = req.params;
    const providerId = req.user.userId;

    const listing = await ServiceListing.findOne({
      _id: listingId,
      serviceProvider: providerId
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Service listing not found'
      });
    }

    if (listing.status === 'pending_approval') {
      return res.status(400).json({
        success: false,
        error: 'Listing is already pending approval'
      });
    }

    if (listing.status === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Listing is already approved'
      });
    }

    // Validate that listing has required fields for approval
    if (!listing.photos || listing.photos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one photo is required before submitting for approval'
      });
    }

    listing.status = 'pending_approval';
    await listing.save();

    res.json({
      success: true,
      message: 'Service listing submitted for approval successfully',
      data: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to submit listing for approval',
      details: error.message
    });
  }
};

// Remove photo from listing
const removePhoto = async (req, res) => {
  try {
    const { listingId, photoId } = req.params;
    const providerId = req.user.userId;

    const listing = await ServiceListing.findOne({
      _id: listingId,
      serviceProvider: providerId
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Service listing not found'
      });
    }

    const photoIndex = listing.photos.findIndex(photo => photo._id.toString() === photoId);
    
    if (photoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found'
      });
    }

    // Delete the file
    const photo = listing.photos[photoIndex];
    deleteFile(photo.filename);

    // Remove photo from array
    listing.photos.splice(photoIndex, 1);
    await listing.save();

    res.json({
      success: true,
      message: 'Photo removed successfully',
      data: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to remove photo',
      details: error.message
    });
  }
};

// Get listing analytics
const getListingAnalytics = async (req, res) => {
  try {
    const providerId = req.user.userId;

    const analytics = await ServiceListing.aggregate([
      { $match: { serviceProvider: providerId } },
      {
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          activeListings: { $sum: { $cond: ['$isActive', 1, 0] } },
          approvedListings: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          pendingListings: { $sum: { $cond: [{ $eq: ['$status', 'pending_approval'] }, 1, 0] } },
          totalViews: { $sum: '$views' },
          totalBookings: { $sum: '$bookingsCount' },
          averageRating: { $avg: '$rating.average' }
        }
      }
    ]);

    const statusBreakdown = await ServiceListing.aggregate([
      { $match: { serviceProvider: providerId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const serviceTypeBreakdown = await ServiceListing.aggregate([
      { $match: { serviceProvider: providerId } },
      { $group: { _id: '$serviceType', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        overview: analytics[0] || {
          totalListings: 0,
          activeListings: 0,
          approvedListings: 0,
          pendingListings: 0,
          totalViews: 0,
          totalBookings: 0,
          averageRating: 0
        },
        statusBreakdown,
        serviceTypeBreakdown
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
  getMyServiceListings,
  getServiceListing,
  createServiceListing,
  updateServiceListing,
  deleteServiceListing,
  toggleListingStatus,
  submitForApproval,
  removePhoto,
  getListingAnalytics
};