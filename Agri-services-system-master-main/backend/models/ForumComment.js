const mongoose = require('mongoose');

const forumCommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumPost',
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumComment',
    default: null
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
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumComment'
  }]
}, {
  timestamps: true
});

// Indexes for better performance
forumCommentSchema.index({ post: 1, createdAt: 1 });
forumCommentSchema.index({ author: 1 });
forumCommentSchema.index({ parentComment: 1 });

// Virtual for like count
forumCommentSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for reply count
forumCommentSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Method to check if user has liked the comment
forumCommentSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Pre-save middleware to set editedAt when content is modified
forumCommentSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// Post-save middleware to update post's comment count and last activity
forumCommentSchema.post('save', async function() {
  try {
    const ForumPost = mongoose.model('ForumPost');
    await ForumPost.findByIdAndUpdate(
      this.post,
      {
        $inc: { commentCount: 1 },
        lastActivity: new Date()
      }
    );
  } catch (error) {
    console.error('Error updating post comment count:', error);
  }
});

// Post-remove middleware to update post's comment count
forumCommentSchema.post('remove', async function() {
  try {
    const ForumPost = mongoose.model('ForumPost');
    await ForumPost.findByIdAndUpdate(
      this.post,
      {
        $inc: { commentCount: -1 }
      }
    );
  } catch (error) {
    console.error('Error updating post comment count:', error);
  }
});

const ForumComment = mongoose.model('ForumComment', forumCommentSchema);

module.exports = ForumComment;