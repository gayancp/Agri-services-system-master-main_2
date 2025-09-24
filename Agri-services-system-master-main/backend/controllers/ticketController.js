const Ticket = require('../models/Ticket');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for ticket attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/tickets');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '_' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, and text files
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and document files are allowed'));
    }
  }
}).array('attachments', 5); // Max 5 files

// Create new ticket
const createTicket = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error'
        });
      }

      const {
        title,
        description,
        issueType,
        priority,
        relatedOrder,
        relatedService,
        tags
      } = req.body;

      // Prepare attachments data
      const attachments = req.files ? req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size
      })) : [];

      const ticket = new Ticket({
        title,
        description,
        issueType,
        priority: priority || 'medium',
        submittedBy: req.user.userId,
        attachments,
        relatedOrder: relatedOrder || null,
        relatedService: relatedService || null,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : []
      });

      await ticket.save();
      await ticket.populate('submittedBy', 'firstName lastName email');

      res.status(201).json({
        success: true,
        message: 'Ticket created successfully',
        data: ticket
      });
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket'
    });
  }
};

// Get all tickets (with filters)
const getTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      issueType,
      assignedTo,
      submittedBy,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (issueType) filter.issueType = issueType;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (submittedBy) filter.submittedBy = submittedBy;

    // For regular users, only show their own tickets
    if (req.user.role === 'farmer' || req.user.role === 'service_provider') {
      filter.submittedBy = req.user.userId;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tickets = await Ticket.find(filter)
      .populate('submittedBy', 'firstName lastName email role')
      .populate('assignedTo', 'firstName lastName email')
      .populate('relatedOrder', 'orderNumber totalAmount')
      .populate('relatedService', 'title serviceName')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Ticket.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets'
    });
  }
};

// Get ticket by ID
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('submittedBy', 'firstName lastName email role phone')
      .populate('assignedTo', 'firstName lastName email')
      .populate('relatedOrder', 'orderNumber totalAmount status items')
      .populate('relatedService', 'title serviceName category')
      .populate('comments.author', 'firstName lastName email role')
      .populate('history.performedBy', 'firstName lastName email role');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'farmer' || req.user.role === 'service_provider') {
      if (ticket.submittedBy._id.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      // Filter out internal comments for non-staff users
      ticket.comments = ticket.comments.filter(comment => !comment.isInternal);
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket'
    });
  }
};

// Update ticket status
const updateTicketStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const ticketId = req.params.id;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'customer_service_rep') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    await ticket.updateStatus(status, req.user.userId, notes);

    const updatedTicket = await Ticket.findById(ticketId)
      .populate('submittedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
      data: updatedTicket
    });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket status'
    });
  }
};

// Assign ticket to staff member
const assignTicket = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const ticketId = req.params.id;

    // Check if user exists and has appropriate role
    const assignee = await User.findById(assignedTo);
    if (!assignee || (assignee.role !== 'customer_service_rep' && assignee.role !== 'admin')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignee'
      });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can assign tickets'
      });
    }

    await ticket.assignTo(assignedTo, req.user.userId);

    const updatedTicket = await Ticket.findById(ticketId)
      .populate('submittedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      data: updatedTicket
    });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign ticket'
    });
  }
};

// Add comment to ticket
const addComment = async (req, res) => {
  try {
    const { message, isInternal } = req.body;
    const ticketId = req.params.id;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check permissions for access
    if (req.user.role === 'farmer' || req.user.role === 'service_provider') {
      if (ticket.submittedBy.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Only staff can add internal comments
    const commentIsInternal = (req.user.role === 'admin' || req.user.role === 'customer_service_rep') && isInternal;

    await ticket.addComment(message, req.user.userId, commentIsInternal);

    const updatedTicket = await Ticket.findById(ticketId)
      .populate('comments.author', 'firstName lastName email role');

    // Filter internal comments for non-staff users
    if (req.user.role === 'farmer' || req.user.role === 'service_provider') {
      updatedTicket.comments = updatedTicket.comments.filter(comment => !comment.isInternal);
    }

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: updatedTicket
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
};

// Get ticket statistics
const getTicketStats = async (req, res) => {
  try {
    const stats = await Ticket.getTicketStats();
    
    // Additional stats for admin/CSR
    if (req.user.role === 'admin' || req.user.role === 'customer_service_rep') {
      const [
        priorityStats,
        typeStats,
        recentTickets,
        myAssignedTickets
      ] = await Promise.all([
        Ticket.aggregate([
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]),
        Ticket.aggregate([
          { $group: { _id: '$issueType', count: { $sum: 1 } } }
        ]),
        Ticket.find({ status: { $ne: 'closed' } })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('submittedBy', 'firstName lastName')
          .lean(),
        Ticket.find({ assignedTo: req.user.userId, status: { $nin: ['resolved', 'closed'] } })
          .sort({ lastActivity: -1 })
          .populate('submittedBy', 'firstName lastName')
          .lean()
      ]);

      stats.priorityBreakdown = priorityStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      stats.typeBreakdown = typeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      stats.recentTickets = recentTickets;
      stats.myAssignedTickets = myAssignedTickets;
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket statistics'
    });
  }
};

// Close ticket (customer satisfaction)
const closeTicket = async (req, res) => {
  try {
    const { resolution, rating, feedback } = req.body;
    const ticketId = req.params.id;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Only staff can close tickets, or the ticket owner can provide satisfaction rating
    if (req.user.role === 'admin' || req.user.role === 'customer_service_rep') {
      ticket.status = 'closed';
      ticket.resolution = resolution;
      ticket.closedAt = new Date();
    } else if (ticket.submittedBy.toString() === req.user.userId.toString() && ticket.status === 'resolved') {
      if (rating) {
        ticket.customerSatisfaction = {
          rating,
          feedback: feedback || '',
          submittedAt: new Date()
        };
      }
      ticket.status = 'closed';
      ticket.closedAt = new Date();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    ticket._modifier = req.user.userId;
    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket closed successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close ticket'
    });
  }
};

// Delete ticket
const deleteTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check permissions: Only admin, CSR, or the ticket owner can delete
    if (req.user.role !== 'admin' && 
        req.user.role !== 'customer_service_rep' && 
        ticket.submittedBy.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete this ticket'
      });
    }

    // Only allow deletion of tickets that are not assigned or in progress
    if (ticket.status === 'assigned' || ticket.status === 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete ticket that is currently being worked on'
      });
    }

    // Delete associated files if any
    if (ticket.attachments && ticket.attachments.length > 0) {
      ticket.attachments.forEach(attachment => {
        if (fs.existsSync(attachment.path)) {
          try {
            fs.unlinkSync(attachment.path);
          } catch (error) {
            console.error('Error deleting file:', error);
          }
        }
      });
    }

    await Ticket.findByIdAndDelete(ticketId);

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete ticket'
    });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  assignTicket,
  addComment,
  getTicketStats,
  closeTicket,
  deleteTicket
};
