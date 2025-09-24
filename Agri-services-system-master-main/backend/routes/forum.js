const express = require('express');
const router = express.Router();

// Import controllers
const {
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
} = require('../controllers/forumController');

// Import middleware
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  validateForumPost,
  validateForumPostUpdate,
  validateComment,
  validateCommentUpdate
} = require('../middleware/validation');

// Public routes
router.get('/categories', getForumCategories);
router.get('/', getForumPosts); // Can be viewed by all
router.get('/:id', getForumPost); // Can be viewed by all

// Protected routes - requires authentication
router.post('/', authenticateToken, validateForumPost, createForumPost);
router.put('/:id', authenticateToken, validateForumPostUpdate, updateForumPost);
router.delete('/:id', authenticateToken, deleteForumPost);
router.post('/:id/like', authenticateToken, toggleLikePost);

// Comment routes - requires authentication
router.post('/:postId/comments', authenticateToken, validateComment, createComment);
router.put('/comments/:commentId', authenticateToken, validateCommentUpdate, updateComment);
router.delete('/comments/:commentId', authenticateToken, deleteComment);
router.post('/comments/:commentId/like', authenticateToken, toggleLikeComment);

module.exports = router;