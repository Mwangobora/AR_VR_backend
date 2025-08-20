const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth')
const rateLimit = require('express-rate-limit');


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: { error: 'Too many authentication attempts, please try again later.' }
});

// AUTH ROUTES (Public)
router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', AuthController.logout); 

// PROTECTED AUTH ROUTES
router.get('/profile', authenticateToken, AuthController.getProfile);

module.exports = router;