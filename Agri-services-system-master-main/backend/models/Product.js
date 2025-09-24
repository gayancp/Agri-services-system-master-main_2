const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: [
      'fruits',
      'vegetables',
      'grains',
      'dairy',
      'meat',
      'herbs',
      'spices',
      'seeds',
      'fertilizers',
      'tools',
      'equipment',
      'other'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  price: {
    amount: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'LKR'
    },
    unit: {
      type: String,
      required: [true, 'Price unit is required'],
      enum: ['per_kg', 'per_lb', 'per_piece', 'per_dozen', 'per_liter', 'per_meter', 'per_acre', 'per_hour']
    }
  },
  quantity: {
    available: {
      type: Number,
      required: [true, 'Available quantity is required'],
      min: [0, 'Quantity cannot be negative']
    },
    unit: {
      type: String,
      required: [true, 'Quantity unit is required'],
      enum: ['kg', 'lb', 'pieces', 'dozen', 'liters', 'meters', 'acres']
    },
    minOrder: {
      type: Number,
      default: 1
    }
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller information is required']
  },
  location: {
    address: String,
    city: String,
    state: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  harvestDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  isOrganic: {
    type: Boolean,
    default: false
  },
  certifications: [{
    name: String,
    issuedBy: String,
    validUntil: Date,
    certificateUrl: String
  }],
  status: {
    type: String,
    enum: ['available', 'sold_out', 'reserved', 'discontinued'],
    default: 'available'
  },
  quality: {
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'Premium'],
      default: 'A'
    },
    freshness: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  shippingInfo: {
    weight: Number, // in kg
    dimensions: {
      length: Number, // in cm
      width: Number,
      height: Number
    },
    shippingMethods: [{
      type: String,
      enum: ['pickup', 'local_delivery', 'shipping']
    }],
    deliveryTime: String // e.g., "2-3 days"
  },
  tags: [String],
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ status: 1 });
productSchema.index({ 'location.coordinates': '2dsphere' });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ createdAt: -1 });

// Update average rating when reviews are added
productSchema.methods.updateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.averageRating = 0;
    this.totalReviews = 0;
  } else {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.averageRating = Math.round((totalRating / this.reviews.length) * 10) / 10;
    this.totalReviews = this.reviews.length;
  }
};

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
  return `${this.price.currency} ${this.price.amount}/${this.price.unit}`;
});

// Ensure virtual fields are serialized
productSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Product', productSchema);