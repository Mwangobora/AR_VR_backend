const express = require('express');
const { body } = require('express-validator');
const { SceneConnectionController } = require('../controllers/sceneConnectionController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// Validation middleware
const createConnectionValidation = [
  body('from_image_id').isInt({ min: 1 }).withMessage('Valid from_image_id is required'),
  body('to_image_id').isInt({ min: 1 }).withMessage('Valid to_image_id is required'),
  body('direction_angle').isFloat({ min: 0, max: 359.99 }).withMessage('Direction angle must be between 0 and 359.99'),
  body('distance_meters').optional().isFloat({ min: 0 }).withMessage('Distance must be non-negative'),
  body('transition_type').optional().isIn(['walk', 'teleport', 'fade', 'slide']).withMessage('Invalid transition type'),
  body('connection_name').optional().isLength({ max: 255 }).withMessage('Connection name too long'),
  body('is_bidirectional').optional().isBoolean().withMessage('is_bidirectional must be boolean'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
];

const updateConnectionValidation = [
  body('direction_angle').optional().isFloat({ min: 0, max: 359.99 }).withMessage('Direction angle must be between 0 and 359.99'),
  body('distance_meters').optional().isFloat({ min: 0 }).withMessage('Distance must be non-negative'),
  body('transition_type').optional().isIn(['walk', 'teleport', 'fade', 'slide']).withMessage('Invalid transition type'),
  body('connection_name').optional().isLength({ max: 255 }).withMessage('Connection name too long'),
  body('is_bidirectional').optional().isBoolean().withMessage('is_bidirectional must be boolean'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
];

// Public routes (no authentication required)
// Get connections for a specific panoramic image (for VR navigation)
router.get('/image/:imageId', SceneConnectionController.getConnectionsForImage);

// Admin routes (authentication required)
// Get all connections
router.get('/', authenticateToken, requireAdmin, SceneConnectionController.getAllConnections);

// Get available images for connection creation
router.get('/available-images', authenticateToken, requireAdmin, SceneConnectionController.getAvailableImages);

// Create new connection
router.post('/', authenticateToken, requireAdmin, createConnectionValidation, SceneConnectionController.createConnection);

// Update connection
router.put('/:id', authenticateToken, requireAdmin, updateConnectionValidation, SceneConnectionController.updateConnection);

// Delete connection
router.delete('/:id', authenticateToken, requireAdmin, SceneConnectionController.deleteConnection);

module.exports = router;
