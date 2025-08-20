const express = require('express');
const router = express.Router();
const hotspotsController = require('../controllers/hotspotsController');
const { authenticateToken, requireAdmin, requireSuperAdmin } = require('../middlewares/auth');

router.get('/', hotspotsController.getAllHotspots);
router.get('/:id', hotspotsController.getHotspotById);


router.post('/', authenticateToken, requireAdmin, hotspotsController.createHotspot);
router.put('/:id', authenticateToken, requireAdmin, hotspotsController.updateHotspot);
router.patch('/:id/toggle', authenticateToken, requireAdmin, hotspotsController.toggleHotspotStatus);
router.delete('/:id', authenticateToken, requireSuperAdmin, hotspotsController.deleteHotspot);

module.exports = router;
