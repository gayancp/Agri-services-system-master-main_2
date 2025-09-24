// Import required packages
const path = require('path');
// Load env from backend/.env regardless of CWD
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const User = require("./models/User");

// Import routes
const userRoutes = require("./routes/users");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");
const customerServiceRoutes = require("./routes/customerService");
const serviceProviderRoutes = require("./routes/serviceProvider");
const serviceListingRoutes = require("./routes/serviceListings");
const publicRoutes = require("./routes/public");
const paymentRoutes = require("./routes/payments");
const forumRoutes = require("./routes/forum");
const ticketRoutes = require("./routes/tickets");

// Create express app
const app = express();

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  // Allow common localhost ports in dev; can be narrowed via CORS_ORIGIN
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
// Allow embedding these resources from a different origin (frontend at :3000)
// to avoid CORP (Cross-Origin-Resource-Policy) blocking images/styles.
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static('uploads', {
    maxAge: '1d',
    immutable: false,
  })
);

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB successfully');
  // One-time cleanup: remove invalid provider locations that lack coordinates
  (async () => {
    try {
      const filter = {
        'serviceProviderDetails.location.type': 'Point',
        $or: [
          { 'serviceProviderDetails.location.coordinates': { $exists: false } },
          { 'serviceProviderDetails.location.coordinates': { $size: 0 } },
          { 'serviceProviderDetails.location.coordinates.0': { $exists: false } },
          { 'serviceProviderDetails.location.coordinates.1': { $exists: false } }
        ]
      };
      const result = await User.updateMany(filter, { $unset: { 'serviceProviderDetails.location': '' } });
      if (result.modifiedCount > 0) {
        console.log(`Cleaned ${result.modifiedCount} user record(s) with invalid provider location`);
      }
    } catch (e) {
      console.warn('Startup cleanup skipped (user location):', e.message);
    }
  })();
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// Routes
app.get("/", (req, res) => {
  res.json({ 
    message: "Agricultural Services System API",
    version: "1.0.0",
    status: "running"
  });
});

// API routes
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/customer-service", customerServiceRoutes);
app.use("/api/service-provider", serviceProviderRoutes);
app.use("/api/service-listings", serviceListingRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/tickets", ticketRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'development') {
    console.warn('[WARN] JWT_SECRET is not set. Authentication may fail. Set it in backend/.env');
  }
});
