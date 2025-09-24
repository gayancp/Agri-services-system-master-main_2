const express = require('express');
const router = express.Router();
const ServiceListing = require('../models/ServiceListing');

// Get all approved service listings (public endpoint for farmers)
const getPublicServiceListings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      serviceType,
      minPrice,
      maxPrice,
      currency = 'LKR',
      location,
      minRating,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      lat,
      lng,
      radius = 50 // radius in kilometers
    } = req.query;

    // Build query for approved listings only
    const query = { 
      status: 'approved',
      'availability.status': { $ne: 'unavailable' }
    };

    // Text search across title, description, and tags
    if (search) {
      query.$text = { $search: search };
    }

    // Service type filter
    if (serviceType && serviceType !== 'all') {
      query.serviceType = serviceType;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query['pricing.currency'] = currency;
      query['pricing.type'] = { $ne: 'negotiable' };
      
      if (minPrice) {
        query['pricing.amount'] = { $gte: parseFloat(minPrice) };
      }
      if (maxPrice) {
        query['pricing.amount'] = { 
          ...query['pricing.amount'],
          $lte: parseFloat(maxPrice) 
        };
      }
    }

    // Location filter (service area contains the location)
    if (location) {
      query.serviceArea = { 
        $regex: new RegExp(location, 'i') 
      };
    }

    // Rating filter
    if (minRating) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    // Build aggregation pipeline for geospatial search
    const pipeline = [];
    
    // Match basic criteria
    pipeline.push({ $match: query });

    // Add geospatial search if coordinates provided
    if (lat && lng) {
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'serviceProvider',
          foreignField: '_id',
          as: 'providerDetails'
        }
      });
      
      pipeline.push({
        $addFields: {
          distance: {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$providerDetails.serviceProviderDetails.location.coordinates', null] },
                  { $gt: [{ $size: '$providerDetails.serviceProviderDetails.location.coordinates' }, 0] }
                ]
              },
              then: {
                $round: [
                  {
                    $multiply: [
                      {
                        $acos: {
                          $add: [
                            {
                              $multiply: [
                                { $sin: { $degreesToRadians: parseFloat(lat) } },
                                { $sin: { $degreesToRadians: { $arrayElemAt: ['$providerDetails.serviceProviderDetails.location.coordinates', 1] } } }
                              ]
                            },
                            {
                              $multiply: [
                                { $cos: { $degreesToRadians: parseFloat(lat) } },
                                { $cos: { $degreesToRadians: { $arrayElemAt: ['$providerDetails.serviceProviderDetails.location.coordinates', 1] } } },
                                { $cos: { $degreesToRadians: { $subtract: [parseFloat(lng), { $arrayElemAt: ['$providerDetails.serviceProviderDetails.location.coordinates', 0] }] } } }
                              ]
                            }
                          ]
                        }
                      },
                      6371 // Earth's radius in kilometers
                    ]
                  },
                  2
                ]
              },
              else: null
            }
          }
        }
      });

      // Filter by radius if specified
      if (radius) {
        pipeline.push({
          $match: {
            $or: [
              { distance: { $lte: parseFloat(radius) } },
              { distance: null }
            ]
          }
        });
      }
    }

    // Handle sorting
    const sortStage = {};
    if (search && sortBy === 'relevance') {
      sortStage.score = { $meta: 'textScore' };
    } else {
      switch (sortBy) {
        case 'price':
          sortStage['pricing.amount'] = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'rating':
          sortStage['rating.average'] = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'name':
          sortStage.title = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'views':
          sortStage.views = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'distance':
          if (lat && lng) {
            sortStage.distance = sortOrder === 'asc' ? 1 : -1;
          } else {
            sortStage.createdAt = -1;
          }
          break;
        default:
          sortStage.createdAt = sortOrder === 'asc' ? 1 : -1;
      }
    }
    
    pipeline.push({ $sort: sortStage });

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Populate service provider details
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'serviceProvider',
        foreignField: '_id',
        as: 'serviceProvider',
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1,
              email: 1,
              phone: 1,
              rating: 1,
              isVerifiedProvider: 1,
              profileImage: 1,
              'serviceProviderDetails.location': 1,
              'serviceProviderDetails.businessName': 1
            }
          }
        ]
      }
    });

    pipeline.push({
      $unwind: {
        path: '$serviceProvider',
        preserveNullAndEmptyArrays: true
      }
    });

    // Execute aggregation
    const listings = await ServiceListing.aggregate(pipeline);

    // Get total count for pagination (separate query for accuracy)
    const total = await ServiceListing.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      data: {
        listings,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalListings: total,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        },
        filters: {
          search,
          serviceType,
          minPrice,
          maxPrice,
          currency,
          location,
          minRating,
          sortBy,
          sortOrder,
          lat,
          lng,
          radius
        }
      }
    });

  } catch (error) {
    console.error('Get public service listings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service listings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get service types and their counts (for filter UI)
const getServiceTypesStats = async (req, res) => {
  try {
    const stats = await ServiceListing.aggregate([
      {
        $match: { 
          status: 'approved',
          'availability.status': { $ne: 'unavailable' }
        }
      },
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating.average' },
          avgPrice: { $avg: '$pricing.amount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get service types stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service types statistics'
    });
  }
};

// Get available locations (for location filter)
const getAvailableLocations = async (req, res) => {
  try {
    const locations = await ServiceListing.aggregate([
      {
        $match: { 
          status: 'approved',
          'availability.status': { $ne: 'unavailable' }
        }
      },
      {
        $unwind: '$serviceArea'
      },
      {
        $group: {
          _id: '$serviceArea',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 50 // Limit to top 50 locations
      }
    ]);

    res.json({
      success: true,
      data: locations.map(loc => ({
        location: loc._id,
        count: loc.count
      }))
    });

  } catch (error) {
    console.error('Get available locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available locations'
    });
  }
};

// Get single service listing details (public)
const getPublicServiceListing = async (req, res) => {
  try {
    const { listingId } = req.params;

    const listing = await ServiceListing.findOne({
      _id: listingId,
      status: 'approved'
    }).populate('serviceProvider', 'firstName lastName email phone rating isVerifiedProvider profileImage serviceProviderDetails');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Service listing not found or not available'
      });
    }

    // Increment view count
    await ServiceListing.findByIdAndUpdate(listingId, {
      $inc: { views: 1 }
    });

    res.json({
      success: true,
      data: listing
    });

  } catch (error) {
    console.error('Get public service listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service listing details'
    });
  }
};

// Get nearby service listings using geospatial query
const getNearbyServiceListings = async (req, res) => {
  try {
    const { lat, lng, radius = 50, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const pipeline = [
      // Match approved listings
      {
        $match: { 
          status: 'approved',
          'availability.status': { $ne: 'unavailable' }
        }
      },
      // Lookup service provider details
      {
        $lookup: {
          from: 'users',
          localField: 'serviceProvider',
          foreignField: '_id',
          as: 'providerDetails'
        }
      },
      // Filter providers with location data
      {
        $match: {
          'providerDetails.serviceProviderDetails.location.coordinates': { $exists: true, $ne: [] }
        }
      },
      // Add distance calculation
      {
        $addFields: {
          distance: {
            $round: [
              {
                $multiply: [
                  {
                    $acos: {
                      $add: [
                        {
                          $multiply: [
                            { $sin: { $degreesToRadians: parseFloat(lat) } },
                            { $sin: { $degreesToRadians: { $arrayElemAt: ['$providerDetails.serviceProviderDetails.location.coordinates', 1] } } }
                          ]
                        },
                        {
                          $multiply: [
                            { $cos: { $degreesToRadians: parseFloat(lat) } },
                            { $cos: { $degreesToRadians: { $arrayElemAt: ['$providerDetails.serviceProviderDetails.location.coordinates', 1] } } },
                            { $cos: { $degreesToRadians: { $subtract: [parseFloat(lng), { $arrayElemAt: ['$providerDetails.serviceProviderDetails.location.coordinates', 0] }] } } }
                          ]
                        }
                      ]
                    }
                  },
                  6371 // Earth's radius in kilometers
                ]
              },
              2
            ]
          }
        }
      },
      // Filter by radius
      {
        $match: {
          distance: { $lte: parseFloat(radius) }
        }
      },
      // Sort by distance
      {
        $sort: { distance: 1 }
      },
      // Limit results
      {
        $limit: parseInt(limit)
      },
      // Clean up provider details
      {
        $addFields: {
          serviceProvider: { $arrayElemAt: ['$providerDetails', 0] }
        }
      },
      {
        $project: {
          providerDetails: 0,
          'serviceProvider.password': 0,
          'serviceProvider.adminDetails': 0,
          'serviceProvider.customerServiceDetails': 0
        }
      }
    ];

    const nearbyListings = await ServiceListing.aggregate(pipeline);

    res.json({
      success: true,
      data: {
        listings: nearbyListings,
        searchCenter: { lat: parseFloat(lat), lng: parseFloat(lng) },
        radius: parseFloat(radius),
        found: nearbyListings.length
      }
    });

  } catch (error) {
    console.error('Get nearby service listings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby service listings'
    });
  }
};

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in kilometers
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Routes
router.get('/service-listings', getPublicServiceListings);
router.get('/service-listings/nearby', getNearbyServiceListings);
router.get('/service-listings/stats/types', getServiceTypesStats);
router.get('/service-listings/stats/locations', getAvailableLocations);
router.get('/service-listings/:listingId', getPublicServiceListing);

module.exports = router;