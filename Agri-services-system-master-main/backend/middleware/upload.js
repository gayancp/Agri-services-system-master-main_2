const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const serviceListingsDir = path.join(uploadsDir, 'service-listings');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(serviceListingsDir)) {
  fs.mkdirSync(serviceListingsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, serviceListingsDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename: timestamp_random_originalname
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = `${file.fieldname}_${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  }
});

// File filter for image validation
const fileFilter = (req, file, cb) => {
  // Allowed image types
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 10 // Maximum 10 files per upload
  }
});

// Middleware for single image upload
const uploadSingle = upload.single('image');

// Middleware for multiple images upload (for service listings)
const uploadMultiple = upload.array('images', 10); // Max 10 images

// Middleware for service listing images with error handling
const uploadServiceListingImages = (req, res, next) => {
  uploadMultiple(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File size too large. Maximum size is 5MB per image.'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: 'Too many files. Maximum 10 images allowed.'
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field.'
        });
      }
      return res.status(400).json({
        success: false,
        error: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    
    // Validate that at least one image is provided for new listings
    if (req.method === 'POST' && (!req.files || req.files.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'At least one image is required for service listings.'
      });
    }
    
    next();
  });
};

// Middleware for single profile image upload with error handling
const uploadProfileImage = (req, res, next) => {
  uploadSingle(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File size too large. Maximum size is 5MB.'
        });
      }
      return res.status(400).json({
        success: false,
        error: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    next();
  });
};

// Helper function to delete uploaded files
const deleteUploadedFiles = (files) => {
  if (!files || files.length === 0) return;
  
  files.forEach(file => {
    const filePath = file.path || path.join(serviceListingsDir, file.filename);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error deleting file:', filePath, err);
      }
    });
  });
};

// Helper function to delete a single file
const deleteFile = (filename) => {
  const filePath = path.join(serviceListingsDir, filename);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Error deleting file:', filePath, err);
    }
  });
};

// Validation middleware for image requirements
const validateImageRequirements = (req, res, next) => {
  // Check image dimensions if needed (optional enhancement)
  // This could be implemented using sharp or jimp libraries
  next();
};

module.exports = {
  uploadServiceListingImages,
  uploadProfileImage,
  deleteUploadedFiles,
  deleteFile,
  validateImageRequirements
};