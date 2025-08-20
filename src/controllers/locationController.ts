import type{ Request, Response } from 'express';
const { pool } = require('../config/database');
const { createLocationSchema } = require('../utils/validation');
import type{ CreateLocationRequest } from '../types';

/**
 * Get all locations with their hotspots
 */
class LocationController {
  static async getAllLocations(req: Request, res: Response) {
  try {
    const query = `
      SELECT 
        l.*,
        json_agg(
          json_build_object(
            'id', h.id,
            'title', h.title,
            'description', h.description,
            'map_x', h.map_x,
            'map_y', h.map_y,
            'hotspot_type', h.hotspot_type,
            'icon_type', h.icon_type,
            'is_active', h.is_active
          )
        ) FILTER (WHERE h.id IS NOT NULL) as hotspots
      FROM locations l
      LEFT JOIN hotspots h ON l.id = h.location_id AND h.is_active = true
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
};

/**
 * Create new location
 */
static async createLocation(req: Request, res: Response) {
  try {
    const { error, value } = createLocationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, description, category, latitude, longitude }: CreateLocationRequest = value;
    const created_by = req.user?.id;

    const query = `
      INSERT INTO locations (name, description, category, latitude, longitude, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [name, description, category, latitude, longitude, created_by];
    const result = await pool.query(query, values);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
};

/**
 * Get single location with panoramic images
 */
static async getLocationById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }
    
    const query = `
      SELECT 
        l.*,
        json_agg(
          json_build_object(
            'id', pi.id,
            'original_filename', pi.original_filename,
            'file_path', pi.file_path,
            'file_size', pi.file_size,
            'width', pi.width,
            'height', pi.height,
            'is_processed', pi.is_processed,
            'created_at', pi.created_at
          )
        ) FILTER (WHERE pi.id IS NOT NULL) as panoramic_images
      FROM locations l
      LEFT JOIN panoramic_images pi ON l.id = pi.location_id
      WHERE l.id = $1
      GROUP BY l.id
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
};

/**
 * Update location
 */
static async updateLocation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { error, value } = createLocationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }

    const { name, description, category, latitude, longitude }: CreateLocationRequest = value;

    const query = `
      UPDATE locations 
      SET name = $1, description = $2, category = $3, latitude = $4, longitude = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    
    const values = [name, description, category, latitude, longitude, id];
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
};

/**
 * Delete location
 */
static async deleteLocation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }

    const query = 'DELETE FROM locations WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
};

}

module.exports = LocationController;