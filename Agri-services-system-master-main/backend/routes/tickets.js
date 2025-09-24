const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  assignTicket,
  addComment,
  getTicketStats,
  closeTicket,
  deleteTicket
} = require('../controllers/ticketController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Create new ticket
router.post('/', createTicket);

// Get tickets (with filters and pagination)
router.get('/', getTickets);

// Get ticket statistics
router.get('/stats', getTicketStats);

// Get specific ticket by ID
router.get('/:id', getTicketById);

// Update ticket status (admin/CSR only)
router.patch('/:id/status', updateTicketStatus);

// Assign ticket to staff member (admin only)
router.patch('/:id/assign', assignTicket);

// Add comment to ticket
router.post('/:id/comments', addComment);

// Close ticket
router.patch('/:id/close', closeTicket);

// Delete ticket
router.delete('/:id', deleteTicket);

module.exports = router;
