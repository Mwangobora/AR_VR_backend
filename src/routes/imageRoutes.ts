const express = require('express');
const router = express.Router();
const imagesController = require('../controllers/imageController');
const { authenticateToken, requireAdmin, requireSuperAdmin } = require('../middlewares/auth');
const { uploadPanoramic } = require('../middlewares/upload');

// PUBLIC ROUTES
router.get('/panoramic/:id', imagesController.getPanoramicImage);
router.get('/location/:locationId', imagesController.getLocationImages);

// ADMIN PROTECTED ROUTES

router.post('/panoramic', authenticateToken, requireAdmin, uploadPanoramic.single('panoramic'), imagesController.uploadPanoramicImage);
router.delete('/panoramic/:id', authenticateToken, requireSuperAdmin, imagesController.deletePanoramicImage);

module.exports = router;
