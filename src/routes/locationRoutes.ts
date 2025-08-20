const express = require('express');
const router = express.Router();
const locationsController = require('../controllers/locationController');
const { authenticateToken, requireAdmin, requireSuperAdmin } = require('../middlewares/auth');

// PUBLIC ROUTES (for frontend users)
router.get('/', locationsController.getAllLocations);
router.get('/:id', locationsController.getLocationById);

// ADMIN PROTECTED ROUTES

router.post('/', authenticateToken, requireAdmin, locationsController.createLocation);
router.put('/:id', authenticateToken, requireAdmin, locationsController.updateLocation);
router.delete('/:id', authenticateToken, requireSuperAdmin, locationsController.deleteLocation);

module.exports = router;
