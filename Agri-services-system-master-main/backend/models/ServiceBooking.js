const mongoose = require('mongoose');

const serviceBookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer information is required']
  },
  serviceProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Service provider information is required']
  },
  serviceListing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceListing',
    required: [true, 'Service listing is required']
  },
  serviceDetails: {
    title: {
      type: String,
      required: true
    },
    serviceType: {
      type: String,
      required: true
    },
    description: String
  },
  booking: {
    date: {
      type: Date,
      required: [true, 'Booking date is required']
    },
    time: {
      type: String,
      required: [true, 'Booking time is required']
    },
    fieldSize: {
      type: Number,
      required: [true, 'Field size is required'],
      min: [0.1, 'Field size must be at least 0.1']
    },
    duration: {
      value: Number,
      unit: String // 'hours', 'days'
    },
    location: {
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  },
  pricing: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'LKR'
    },
    type: {
      type: String,
      enum: ['fixed', 'hourly', 'daily', 'per_acre', 'per_unit'],
      required: true
    },
    finalAmount: {
      type: Number,
      required: true
    }
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'refunded', 'failed'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'mobile_payment', 'credit_card', 'demo_card'],
      required: true
    },
    transactionId: {
      type: String,
      required: true,
      unique: true
    },
    paidAt: Date,
    cardLast4: String, // For card payments
    billingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  status: {
    type: String,
    enum: [
      'pending_confirmation',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'refunded'
    ],
    default: 'pending_confirmation'
  },
  notes: {
    customer: String,
    provider: String,
    admin: String
  },
  customerServiceNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  timeline: [{
    status: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  rating: {
    customerRating: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String,
      ratedAt: Date
    },
    providerRating: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String,
      ratedAt: Date
    }
  },
  cancellation: {
    reason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'processed', 'failed']
    }
  }
}, {
  timestamps: true
});

// Indexes
serviceBookingSchema.index({ customer: 1 });
serviceBookingSchema.index({ serviceProvider: 1 });
serviceBookingSchema.index({ serviceListing: 1 });
serviceBookingSchema.index({ status: 1 });
serviceBookingSchema.index({ 'booking.date': 1 });
serviceBookingSchema.index({ bookingNumber: 1 });
serviceBookingSchema.index({ 'payment.transactionId': 1 });
serviceBookingSchema.index({ createdAt: -1 });

// Generate booking number before saving
serviceBookingSchema.pre('save', async function(next) {
  if (!this.bookingNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.bookingNumber = `SRV${timestamp.slice(-6)}${random}`;
  }

  // Generate transaction ID if not present
  if (!this.payment.transactionId) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.payment.transactionId = `TXN${timestamp}${random}`;
  }

  next();
});

// Virtual for formatted total
serviceBookingSchema.virtual('formattedTotal').get(function() {
  return `${this.pricing.currency} ${this.pricing.finalAmount.toFixed(2)}`;
});

// Virtual for booking datetime
serviceBookingSchema.virtual('bookingDateTime').get(function() {
  const date = new Date(this.booking.date);
  const [hours, minutes] = this.booking.time.split(':');
  date.setHours(parseInt(hours), parseInt(minutes));
  return date;
});

// Virtual for status display
serviceBookingSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'pending_confirmation': 'Pending Confirmation',
    'confirmed': 'Confirmed',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'refunded': 'Refunded'
  };
  return statusMap[this.status] || this.status;
});

// Ensure virtual fields are serialized
serviceBookingSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('ServiceBooking', serviceBookingSchema);