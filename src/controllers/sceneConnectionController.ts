import type { Request, Response } from 'express';
const { pool } = require('../config/database');

const { validationResult } = require('express-validator');

class SceneConnectionController {
  // Get all connections for a specific panoramic image
  static async getConnectionsForImage(req: Request, res: Response) {
    try {
      const { imageId } = req.params;

      const query = `
        SELECT
          sc.*,
          json_build_object(
            'id', pi_from.id,
            'location_id', pi_from.location_id,
            'original_filename', pi_from.original_filename,
            'stored_filename', pi_from.stored_filename,
            'file_path', pi_from.file_path,
            'file_size', pi_from.file_size,
            'mime_type', pi_from.mime_type,
            'width', pi_from.width,
            'height', pi_from.height,
            'is_processed', pi_from.is_processed,
            'uploaded_by', pi_from.uploaded_by,
            'created_at', pi_from.created_at
          ) as from_image,
          json_build_object(
            'id', pi_to.id,
            'location_id', pi_to.location_id,
            'original_filename', pi_to.original_filename,
            'stored_filename', pi_to.stored_filename,
            'file_path', pi_to.file_path,
            'file_size', pi_to.file_size,
            'mime_type', pi_to.mime_type,
            'width', pi_to.width,
            'height', pi_to.height,
            'is_processed', pi_to.is_processed,
            'uploaded_by', pi_to.uploaded_by,
            'created_at', pi_to.created_at
          ) as to_image,
          l_from.name as from_location_name,
          l_to.name as to_location_name
        FROM scene_connections sc
        JOIN panoramic_images pi_from ON sc.from_image_id = pi_from.id
        JOIN panoramic_images pi_to ON sc.to_image_id = pi_to.id
        JOIN locations l_from ON pi_from.location_id = l_from.id
        JOIN locations l_to ON pi_to.location_id = l_to.id
        WHERE sc.from_image_id = $1 AND sc.is_active = true
        ORDER BY sc.direction_angle ASC
      `;

      const result = await pool.query(query, [imageId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching scene connections:', error);
      res.status(500).json({ error: 'Failed to fetch scene connections' });
    }
  }

  // Get all connections (for admin dashboard)
  static async getAllConnections(req: Request, res: Response) {
    try {
      const query = `
        SELECT
          sc.*,
          json_build_object(
            'id', pi_from.id,
            'location_id', pi_from.location_id,
            'original_filename', pi_from.original_filename,
            'stored_filename', pi_from.stored_filename,
            'file_path', pi_from.file_path,
            'file_size', pi_from.file_size,
            'mime_type', pi_from.mime_type,
            'width', pi_from.width,
            'height', pi_from.height,
            'is_processed', pi_from.is_processed,
            'uploaded_by', pi_from.uploaded_by,
            'created_at', pi_from.created_at
          ) as from_image,
          json_build_object(
            'id', pi_to.id,
            'location_id', pi_to.location_id,
            'original_filename', pi_to.original_filename,
            'stored_filename', pi_to.stored_filename,
            'file_path', pi_to.file_path,
            'file_size', pi_to.file_size,
            'mime_type', pi_to.mime_type,
            'width', pi_to.width,
            'height', pi_to.height,
            'is_processed', pi_to.is_processed,
            'uploaded_by', pi_to.uploaded_by,
            'created_at', pi_to.created_at
          ) as to_image,
          l_from.name as from_location_name,
          l_to.name as to_location_name
        FROM scene_connections sc
        JOIN panoramic_images pi_from ON sc.from_image_id = pi_from.id
        JOIN panoramic_images pi_to ON sc.to_image_id = pi_to.id
        JOIN locations l_from ON pi_from.location_id = l_from.id
        JOIN locations l_to ON pi_to.location_id = l_to.id
        ORDER BY sc.created_at DESC
      `;

      const result = await pool.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching all connections:', error);
      res.status(500).json({ error: 'Failed to fetch connections' });
    }
  }

  // Create a new scene connection
  static async createConnection(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        from_image_id,
        to_image_id,
        direction_angle,
        distance_meters = 0,
        transition_type = 'walk',
        connection_name,
        is_bidirectional = false,
        is_active = true
      } = req.body;

      // Check if images exist
      const imageCheck = await pool.query(
        'SELECT id FROM panoramic_images WHERE id IN ($1, $2)',
        [from_image_id, to_image_id]
      );

      if (imageCheck.rows.length !== 2) {
        return res.status(400).json({ error: 'One or both panoramic images not found' });
      }

      // Create the connection
      const insertQuery = `
        INSERT INTO scene_connections 
        (from_image_id, to_image_id, direction_angle, distance_meters, transition_type, connection_name, is_bidirectional, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [
        from_image_id,
        to_image_id,
        direction_angle,
        distance_meters,
        transition_type,
        connection_name,
        is_bidirectional,
        is_active
      ]);

      const connection = result.rows[0];

      // If bidirectional, create reverse connection
      if (is_bidirectional) {
        const reverseAngle = (direction_angle + 180) % 360;
        await pool.query(insertQuery, [
          to_image_id,
          from_image_id,
          reverseAngle,
          distance_meters,
          transition_type,
          connection_name ? `${connection_name} (reverse)` : null,
          false, // Don't make reverse connection bidirectional to avoid infinite loop
          is_active
        ]);
      }

      res.status(201).json(connection);
    } catch (error:any) {
      console.error('Error creating scene connection:', error);
      if (error.code === '23505') { // Unique constraint violation
        res.status(400).json({ error: 'Connection already exists between these images' });
      } else {
        res.status(500).json({ error: 'Failed to create scene connection' });
      }
    }
  }

  // Update a scene connection
  static async updateConnection(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updates = req.body;

      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (['direction_angle', 'distance_meters', 'transition_type', 'connection_name', 'is_bidirectional', 'is_active'].includes(key)) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      values.push(id);
      const query = `
        UPDATE scene_connections 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Scene connection not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating scene connection:', error);
      res.status(500).json({ error: 'Failed to update scene connection' });
    }
  }

  // Delete a scene connection
  static async deleteConnection(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM scene_connections WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Scene connection not found' });
      }

      res.json({ message: 'Scene connection deleted successfully' });
    } catch (error) {
      console.error('Error deleting scene connection:', error);
      res.status(500).json({ error: 'Failed to delete scene connection' });
    }
  }

  // Get available images for connection creation
  static async getAvailableImages(req: Request, res: Response) {
    try {
      const query = `
        SELECT 
          pi.id,
          pi.original_filename,
          pi.location_id,
          l.name as location_name
        FROM panoramic_images pi
        JOIN locations l ON pi.location_id = l.id
        WHERE pi.is_processed = true
        ORDER BY l.name, pi.original_filename
      `;

      const result = await pool.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching available images:', error);
      res.status(500).json({ error: 'Failed to fetch available images' });
    }
  }
}

module.exports = { SceneConnectionController };
