const mongoose = require('mongoose');

const serviceListingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
    minlength: [5, 'Title must be at least 5 characters long']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    minlength: [20, 'Description must be at least 20 characters long']
  },
  serviceType: {
    type: String,
    required: [true, 'Service type is required'],
    enum: ['equipment_rental', 'transportation', 'processing', 'consulting', 'harvesting', 'planting', 'pest_control', 'irrigation', 'soil_testing', 'other']
  },
  pricing: {
    type: {
      type: String,
      enum: ['fixed', 'hourly', 'daily', 'per_acre', 'per_unit', 'negotiable'],
      required: [true, 'Pricing type is required']
    },
    amount: {
      type: Number,
      required: function() {
        return this.pricing.type !== 'negotiable';
      },
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'LKR'
    },
    description: {
      type: String,
      maxlength: [200, 'Pricing description cannot exceed 200 characters']
    }
  },
  photos: [{
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  serviceProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Service provider is required']
  },
  serviceArea: [{
    type: String,
    required: [true, 'Service area is required']
  }],
  availability: {
    status: {
      type: String,
      enum: ['available', 'busy', 'unavailable'],
      default: 'available'
    },
    schedule: {
      monday: { available: { type: Boolean, default: true }, hours: String },
      tuesday: { available: { type: Boolean, default: true }, hours: String },
      wednesday: { available: { type: Boolean, default: true }, hours: String },
      thursday: { available: { type: Boolean, default: true }, hours: String },
      friday: { available: { type: Boolean, default: true }, hours: String },
      saturday: { available: { type: Boolean, default: true }, hours: String },
      sunday: { available: { type: Boolean, default: false }, hours: String }
    }
  },
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Contact phone is required']
    },
    email: String,
    whatsapp: String,
    preferredContactMethod: {
      type: String,
      enum: ['phone', 'email', 'whatsapp'],
      default: 'phone'
    }
  },
  requirements: {
    minimumBookingDuration: {
      value: Number,
      unit: {
        type: String,
        enum: ['hours', 'days', 'weeks']
      }
    },
    advanceBookingRequired: {
      value: Number,
      unit: {
        type: String,
        enum: ['hours', 'days', 'weeks']
      }
    },
    specialRequirements: [String]
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'suspended'],
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  adminNotes: {
    type: String,
    maxlength: [500, 'Admin notes cannot exceed 500 characters']
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  views: {
    type: Number,
    default: 0
  },
  bookingsCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
serviceListingSchema.index({ serviceProvider: 1 });
serviceListingSchema.index({ serviceType: 1 });
serviceListingSchema.index({ status: 1 });
serviceListingSchema.index({ isActive: 1 });
serviceListingSchema.index({ 'rating.average': -1 });
serviceListingSchema.index({ createdAt: -1 });
serviceListingSchema.index({ serviceArea: 1 });
serviceListingSchema.index({ tags: 1 });

// Text search index
serviceListingSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
});

// Virtual for formatted pricing
serviceListingSchema.virtual('formattedPrice').get(function() {
  if (this.pricing?.type === 'negotiable') {
    return 'Negotiable';
  }
  if (this.pricing?.type && this.pricing?.amount) {
    return `${this.pricing.currency || 'LKR'} ${this.pricing.amount}/${this.pricing.type.replace('_', ' ')}`;
  }
  return 'Price not set';
});

// Virtual for primary photo
serviceListingSchema.virtual('primaryPhoto').get(function() {
  return this.photos && this.photos.length > 0 ? this.photos[0] : null;
});

// Populate service provider details
serviceListingSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'serviceProvider',
    select: 'firstName lastName email phone serviceProviderDetails profileImage rating isVerifiedProvider'
  });
  next();
});

// Ensure virtual fields are serialized
serviceListingSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('ServiceListing', serviceListingSchema);