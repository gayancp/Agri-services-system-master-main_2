const { validationResult } = require('express-validator');
const ForumPost = require('../models/ForumPost');
const ForumComment = require('../models/ForumComment');

// Get all forum posts with pagination and filtering
const getForumPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      author,
      search,
      sortBy = 'lastActivity',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (author) {
      filter.author = author;
    }
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // If sorting by lastActivity, prioritize pinned posts
    if (sortBy === 'lastActivity') {
      sort.isPinned = -1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await ForumPost.find(filter)
      .populate('author', 'firstName lastName role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await ForumPost.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        posts,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: posts.length,
          totalPosts: total
        }
      }
    });
  } catch (error) {
    console.error('Get forum posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch forum posts',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get single forum post with comments
const getForumPost = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await ForumPost.findById(id)
      .populate('author', 'firstName lastName role');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found'
      });
    }

    // Increment view count
    await ForumPost.findByIdAndUpdate(id, { $inc: { views: 1 } });

    // Get comments for this post
    const comments = await ForumComment.find({ 
      post: id, 
      parentComment: null,
      isDeleted: false 
    })
      .populate('author', 'firstName lastName role')
      .populate({
        path: 'replies',
        populate: {
          path: 'author',
          select: 'firstName lastName role'
        }
      })
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        post,
        comments
      }
    });
  } catch (error) {
    console.error('Get forum post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch forum post',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Create new forum post
const createForumPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { title, content, category, tags } = req.body;

    const post = new ForumPost({
      title,
      content,
      category,
      tags: tags || [],
      author: req.user.userId
    });

    await post.save();
    await post.populate('author', 'firstName lastName role');

    res.status(201).json({
      success: true,
      message: 'Forum post created successfully',
      data: post
    });
  } catch (error) {
    console.error('Create forum post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create forum post',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Update forum post
const updateForumPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { title, content, category, tags } = req.body;

    const post = await ForumPost.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found'
      });
    }

    // Check if user is the author or admin
    if (post.author.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    // Update post
    post.title = title;
    post.content = content;
    post.category = category;
    post.tags = tags || [];

    await post.save();
    await post.populate('author', 'firstName lastName role');

    res.status(200).json({
      success: true,
      message: 'Forum post updated successfully',
      data: post
    });
  } catch (error) {
    console.error('Update forum post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update forum post',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Delete forum post
const deleteForumPost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await ForumPost.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found'
      });
    }

    // Check if user is the author or admin
    if (post.author.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    // Delete all comments for this post
    await ForumComment.deleteMany({ post: id });

    // Delete the post
    await ForumPost.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Forum post deleted successfully'
    });
  } catch (error) {
    console.error('Delete forum post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete forum post',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Like/Unlike forum post
const toggleLikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const post = await ForumPost.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found'
      });
    }

    const isLiked = post.isLikedBy(userId);

    if (isLiked) {
      // Unlike the post
      post.likes = post.likes.filter(like => like.user.toString() !== userId);
    } else {
      // Like the post
      post.likes.push({ user: userId });
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: isLiked ? 'Post unliked successfully' : 'Post liked successfully',
      data: {
        liked: !isLiked,
        likeCount: post.likeCount
      }
    });
  } catch (error) {
    console.error('Toggle like post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like on post',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Create comment on forum post
const createComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    // Check if post exists
    const post = await ForumPost.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found'
      });
    }

    // Check if post is locked
    if (post.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'This post is locked and cannot accept new comments'
      });
    }

    const comment = new ForumComment({
      content,
      author: req.user.userId,
      post: postId,
      parentComment: parentCommentId || null
    });

    await comment.save();
    await comment.populate('author', 'firstName lastName role');

    // If this is a reply, add to parent comment's replies
    if (parentCommentId) {
      await ForumComment.findByIdAndUpdate(
        parentCommentId,
        { $push: { replies: comment._id } }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create comment',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Update comment
const updateComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await ForumComment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user is the author or admin
    if (comment.author.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    comment.content = content;
    await comment.save();
    await comment.populate('author', 'firstName lastName role');

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update comment',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Delete comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await ForumComment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user is the author or admin
    if (comment.author.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Mark as deleted instead of actually deleting to preserve thread structure
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    comment.content = '[This comment has been deleted]';
    await comment.save();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Like/Unlike comment
const toggleLikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId;

    const comment = await ForumComment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const isLiked = comment.isLikedBy(userId);

    if (isLiked) {
      // Unlike the comment
      comment.likes = comment.likes.filter(like => like.user.toString() !== userId);
    } else {
      // Like the comment
      comment.likes.push({ user: userId });
    }

    await comment.save();

    res.status(200).json({
      success: true,
      message: isLiked ? 'Comment unliked successfully' : 'Comment liked successfully',
      data: {
        liked: !isLiked,
        likeCount: comment.likeCount
      }
    });
  } catch (error) {
    console.error('Toggle like comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like on comment',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get forum categories
const getForumCategories = async (req, res) => {
  try {
    const categories = [
      { value: 'general', label: 'General Discussion', description: 'General farming topics and discussions' },
      { value: 'crop_management', label: 'Crop Management', description: 'Crop cultivation, planting, and harvesting' },
      { value: 'livestock', label: 'Livestock', description: 'Animal farming and livestock management' },
      { value: 'equipment', label: 'Equipment', description: 'Farming tools and machinery' },
      { value: 'weather', label: 'Weather', description: 'Weather conditions and climate discussions' },
      { value: 'market_prices', label: 'Market Prices', description: 'Commodity prices and market trends' },
      { value: 'pest_control', label: 'Pest Control', description: 'Pest management and disease control' },
      { value: 'soil_health', label: 'Soil Health', description: 'Soil management and fertility' },
      { value: 'organic_farming', label: 'Organic Farming', description: 'Organic and sustainable farming practices' },
      { value: 'technology', label: 'Technology', description: 'Agricultural technology and innovations' },
      { value: 'government_schemes', label: 'Government Schemes', description: 'Government programs and subsidies' },
      { value: 'success_stories', label: 'Success Stories', description: 'Inspiring farming success stories' }
    ];

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get forum categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch forum categories',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getForumPosts,
  getForumPost,
  createForumPost,
  updateForumPost,
  deleteForumPost,
  toggleLikePost,
  createComment,
  updateComment,
  deleteComment,
  toggleLikeComment,
  getForumCategories
};