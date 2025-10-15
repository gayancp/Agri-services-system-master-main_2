const express = require('express');
const router = express.Router();

// Import controllers
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  getAllUsers,
  deleteAccount
} = require('../controllers/userController');


const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validatePasswordChange
} = require('../middleware/validation');


router.post('/register', validateUserRegistration, registerUser);
router.post('/login', validateUserLogin, loginUser);


router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, validateProfileUpdate, updateUserProfile);
router.put('/change-password', authenticateToken, validatePasswordChange, changePassword);
router.delete('/profile', authenticateToken, deleteAccount);


router.get('/', authenticateToken, authorizeRoles('admin'), getAllUsers);

module.exports = router;