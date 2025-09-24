const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Buyer information is required']
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller information is required']
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    }
  }],
  // For backward compatibility, also keep products array
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'processing',
      'ready_for_pickup',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    ],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'bank_transfer', 'mobile_payment', 'credit_card'],
    default: 'cash_on_delivery'
  },
  shippingAddress: {
    name: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'Sri Lanka'
    }
  },
  deliveryMethod: {
    type: String,
    enum: ['pickup', 'local_delivery', 'shipping'],
    required: true
  },
  deliveryDate: {
    estimated: Date,
    actual: Date
  },
  notes: {
    buyer: String,
    seller: String,
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
  providerNotes: [{
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
  tracking: {
    trackingNumber: String,
    carrier: String,
    updates: [{
      status: String,
      message: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      location: String
    }]
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ buyer: 1 });
orderSchema.index({ seller: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ createdAt: -1 });

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `AGR${timestamp.slice(-6)}${random}`;
  }
  next();
});

// Virtual for formatted total
orderSchema.virtual('formattedTotal').get(function() {
  return `${this.currency} ${this.totalAmount.toFixed(2)}`;
});

// Ensure virtual fields are serialized
orderSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Order', orderSchema);