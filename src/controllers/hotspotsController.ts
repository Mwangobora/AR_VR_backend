import type{ Request, Response } from 'express';
const { pool } = require('../config/database');
const { createHotspotSchema } = require('../utils/validation');
import type{ CreateHotspotRequest } from '../types';

/**
 * Create new hotspot
 */
class HotspotsController {
  static async createHotspot(req: Request, res: Response) {
  try {
    const { error, value } = createHotspotSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { location_id, title, description, map_x, map_y, hotspot_type, icon_type }: CreateHotspotRequest = value;
    const created_by = req.user?.id;

    // Check if location exists
    const locationCheck = await pool.query('SELECT id FROM locations WHERE id = $1', [location_id]);
    if (locationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const query = `
      INSERT INTO hotspots (location_id, title, description, map_x, map_y, hotspot_type, icon_type, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [location_id, title, description, map_x, map_y, hotspot_type, icon_type || 'default', created_by];
    const result = await pool.query(query, values);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating hotspot:', error);
    res.status(500).json({ error: 'Failed to create hotspot' });
  }
};

/**
 * Get all hotspots for the map (public endpoint)
 */
 static async getAllHotspots(req: Request, res: Response) {
  try {
    const query = `
      SELECT 
        h.*,
        l.name as location_name,
        l.category as location_category,
        l.latitude,
        l.longitude,
        COUNT(pi.id) as panoramic_images_count
      FROM hotspots h
      JOIN locations l ON h.location_id = l.id
      LEFT JOIN panoramic_images pi ON l.id = pi.location_id
      WHERE h.is_active = true
      GROUP BY h.id, l.name, l.category, l.latitude, l.longitude
      ORDER BY h.created_at DESC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
};

/**
 * Get hotspot by ID with location and images
 */
 static async getHotspotById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid hotspot ID' });
    }

    const query = `
      SELECT 
        h.*,
        l.name as location_name,
        l.description as location_description,
        l.category as location_category,
        l.latitude,
        l.longitude,
        json_agg(
          json_build_object(
            'id', pi.id,
            'original_filename', pi.original_filename,
            'stored_filename', pi.stored_filename,
            'file_size', pi.file_size,
            'width', pi.width,
            'height', pi.height,
            'created_at', pi.created_at
          )
        ) FILTER (WHERE pi.id IS NOT NULL) as panoramic_images
      FROM hotspots h
      JOIN locations l ON h.location_id = l.id
      LEFT JOIN panoramic_images pi ON l.id = pi.location_id
      WHERE h.id = $1 AND h.is_active = true
      GROUP BY h.id, l.name, l.description, l.category, l.latitude, l.longitude
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching hotspot:', error);
    res.status(500).json({ error: 'Failed to fetch hotspot' });
  }
};

/**
 * Update hotspot
 */
 static async updateHotspot(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid hotspot ID' });
    }

    const { error, value } = createHotspotSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { location_id, title, description, map_x, map_y, hotspot_type, icon_type } = value;
    const { is_active } = req.body; // is_active is optional and not in schema

    const query = `
      UPDATE hotspots 
      SET location_id = $1, title = $2, description = $3, map_x = $4, map_y = $5, 
          hotspot_type = $6, icon_type = $7, is_active = COALESCE($8, is_active), updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;
    
    const values = [location_id, title, description, map_x, map_y, hotspot_type, icon_type, is_active, id];
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating hotspot:', error);
    res.status(500).json({ error: 'Failed to update hotspot' });
  }
};

/**
 * Delete hotspot
 */
 static async deleteHotspot(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid hotspot ID' });
    }

    const query = 'DELETE FROM hotspots WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }
    
    res.json({ message: 'Hotspot deleted successfully' });
  } catch (error) {
    console.error('Error deleting hotspot:', error);
    res.status(500).json({ error: 'Failed to delete hotspot' });
  }
};

/**
 * Toggle hotspot active status
 */
static async toggleHotspotStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid hotspot ID' });
    }

    const query = `
      UPDATE hotspots 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling hotspot status:', error);
    res.status(500).json({ error: 'Failed to toggle hotspot status' });
  }
};

}

module.exports = HotspotsController;