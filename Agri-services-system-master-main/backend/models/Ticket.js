const mongoose = require('mongoose');

const ticketHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['created', 'updated', 'assigned', 'status_changed', 'comment_added', 'resolved', 'closed']
  },
  description: {
    type: String,
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  previousValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ticketCommentSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isInternal: {
    type: Boolean,
    default: false // Internal comments only visible to staff
  }
});

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true
    // Required removed since it will be auto-generated
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  issueType: {
    type: String,
    required: true,
    enum: [
      'technical_issue',
      'payment_problem',
      'order_inquiry', 
      'service_complaint',
      'account_issue',
      'product_question',
      'billing_inquiry',
      'feature_request',
      'other'
    ]
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'assigned', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
    default: 'open'
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  relatedService: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceListing',
    default: null
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [ticketCommentSchema],
  history: [ticketHistorySchema],
  tags: [String],
  resolution: {
    type: String,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  customerSatisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    submittedAt: Date
  },
  escalated: {
    type: Boolean,
    default: false
  },
  escalationReason: String,
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate ticket number before save
ticketSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketNumber = `TKT-${Date.now().toString().slice(-6)}-${(count + 1).toString().padStart(4, '0')}`;
  }
  
  // Update last activity
  this.lastActivity = new Date();
  next();
});

// Add history entry for status changes
ticketSchema.pre('save', function(next) {
  if (!this.isNew && this.isModified('status')) {
    const previousStatus = this._original ? this._original.status : 'open';
    this.history.push({
      action: 'status_changed',
      description: `Status changed from ${previousStatus} to ${this.status}`,
      performedBy: this._modifier || this.submittedBy,
      previousValue: previousStatus,
      newValue: this.status
    });
    
    if (this.status === 'resolved') {
      this.resolvedAt = new Date();
    } else if (this.status === 'closed') {
      this.closedAt = new Date();
    }
  }
  
  if (!this.isNew && this.isModified('assignedTo')) {
    const previousAssignee = this._original ? this._original.assignedTo : null;
    this.history.push({
      action: 'assigned',
      description: previousAssignee ? 'Ticket reassigned' : 'Ticket assigned to staff member',
      performedBy: this._modifier || this.submittedBy,
      previousValue: previousAssignee,
      newValue: this.assignedTo
    });
  }
  
  next();
});

// Pre-save hooks
ticketSchema.pre('save', async function(next) {
  // Generate ticket number for new tickets
  if (this.isNew && !this.ticketNumber) {
    try {
      // Get the count of existing tickets
      const ticketCount = await this.constructor.countDocuments();
      // Generate ticket number with prefix TK and padded number
      this.ticketNumber = `TK${String(ticketCount + 1).padStart(6, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  
  // Update lastActivity timestamp
  this.lastActivity = new Date();
  next();
});

// Initialize history on create
ticketSchema.pre('save', function(next) {
  if (this.isNew) {
    this.history.push({
      action: 'created',
      description: 'Ticket created',
      performedBy: this.submittedBy
    });
  }
  next();
});
ticketSchema.pre('save', function(next) {
  if (this.isNew) {
    this.history.push({
      action: 'created',
      description: 'Ticket created',
      performedBy: this.submittedBy
    });
  }
  next();
});

// Indexing for performance (ticketNumber already has unique index)
ticketSchema.index({ submittedBy: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ issueType: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ lastActivity: -1 });

// Static methods
ticketSchema.statics.getTicketStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    total: 0,
    open: 0,
    assigned: 0,
    in_progress: 0,
    waiting_customer: 0,
    resolved: 0,
    closed: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  return result;
};

// Instance methods
ticketSchema.methods.addComment = function(message, author, isInternal = false) {
  this.comments.push({
    message,
    author,
    isInternal
  });
  
  this.history.push({
    action: 'comment_added',
    description: isInternal ? 'Internal comment added' : 'Comment added',
    performedBy: author
  });
  
  return this.save();
};

ticketSchema.methods.updateStatus = function(newStatus, performedBy, notes = '') {
  this._modifier = performedBy;
  this._original = this.toObject();
  this.status = newStatus;
  
  if (notes) {
    this.comments.push({
      message: notes,
      author: performedBy,
      isInternal: true
    });
  }
  
  return this.save();
};

ticketSchema.methods.assignTo = function(assigneeId, performedBy) {
  this._modifier = performedBy;
  this._original = this.toObject();
  this.assignedTo = assigneeId;
  this.status = 'assigned';
  
  return this.save();
};

module.exports = mongoose.model('Ticket', ticketSchema);
