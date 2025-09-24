const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    trim: true,
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: [
      'general',
      'crop_management',
      'livestock',
      'equipment',
      'weather',
      'market_prices',
      'pest_control',
      'soil_health',
      'organic_farming',
      'technology',
      'government_schemes',
      'success_stories'
    ],
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  commentCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
forumPostSchema.index({ author: 1 });
forumPostSchema.index({ category: 1 });
forumPostSchema.index({ createdAt: -1 });
forumPostSchema.index({ lastActivity: -1 });
forumPostSchema.index({ isPinned: -1, lastActivity: -1 });
forumPostSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Virtual for like count
forumPostSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Method to check if user has liked the post
forumPostSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Pre-save middleware to update lastActivity
forumPostSchema.pre('save', function(next) {
  if (this.isModified('content') || this.isModified('title')) {
    this.lastActivity = new Date();
  }
  next();
});

const ForumPost = mongoose.model('ForumPost', forumPostSchema);

module.exports = ForumPost;