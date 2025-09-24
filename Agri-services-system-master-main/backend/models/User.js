const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  phone: {
    type: String,
    required: false,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'customer_service_rep', 'service_provider', 'farmer'],
    default: 'farmer'
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'Sri Lanka'
    }
  },
  farmDetails: {
    farmName: String,
    farmSize: Number, // in acres
    farmType: {
      type: String,
      enum: ['organic', 'conventional', 'mixed']
    },
    crops: [String],
    location: {
      latitude: Number,
      longitude: Number
    }
  },
  serviceProviderDetails: {
    businessName: String,
    serviceType: {
      type: String,
      enum: ['equipment_rental', 'transportation', 'processing', 'consulting', 'other']
    },
    serviceArea: [String], // Districts or areas served
    location: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: {
        type: [Number] // [longitude, latitude]
      },
      address: String
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    isVerifiedProvider: {
      type: Boolean,
      default: false
    }
  },
  customerServiceDetails: {
    department: {
      type: String,
      enum: ['support', 'sales', 'technical', 'billing']
    },
    accessLevel: {
      type: String,
      enum: ['basic', 'advanced', 'supervisor'],
      default: 'basic'
    }
  },
  adminDetails: {
    permissions: [{
      type: String,
      enum: ['user_management', 'product_management', 'order_management', 'system_settings', 'reports']
    }],
    accessLevel: {
      type: String,
      enum: ['super_admin', 'admin', 'moderator'],
      default: 'admin'
    }
  },
  profileImage: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'farmDetails.location': '2dsphere' });
// Use a sparse 2dsphere index so documents without a location are ignored by the index
userSchema.index({ 'serviceProviderDetails.location': '2dsphere' }, { sparse: true });

// Helper: validate GeoJSON Point
function isValidGeoPoint(loc) {
  return (
    loc &&
    typeof loc === 'object' &&
    loc.type === 'Point' &&
    Array.isArray(loc.coordinates) &&
    loc.coordinates.length === 2 &&
    typeof loc.coordinates[0] === 'number' &&
    typeof loc.coordinates[1] === 'number'
  );
}

// Cleanup invalid provider location before save
userSchema.pre('save', async function(next) {
  try {
    // Hash password if modified
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    // Sanitize invalid GeoJSON location
    const loc = this?.serviceProviderDetails?.location;
    if (loc && !isValidGeoPoint(loc)) {
      // Remove invalid location to satisfy 2dsphere index
      try {
        if (this.serviceProviderDetails) {
          delete this.serviceProviderDetails.location;
          this.markModified('serviceProviderDetails');
        }
      } catch {}
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Cleanup invalid provider location before findOneAndUpdate
userSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() || {};
  const loc = update['serviceProviderDetails.location'] || (update.$set && update.$set['serviceProviderDetails.location']);
  if (loc && !isValidGeoPoint(loc)) {
    // Prefer unsetting the invalid location
    update.$unset = { ...(update.$unset || {}), 'serviceProviderDetails.location': '' };
    if (update.$set) delete update.$set['serviceProviderDetails.location'];
    else delete update['serviceProviderDetails.location'];
    this.setUpdate(update);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name virtual
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);