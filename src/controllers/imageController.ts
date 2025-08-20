import type{ Request, Response } from 'express';
const sharp = require('sharp');
const path = require('path');
const fs = require("fs");
const { pool } = require('../config/database');

interface RequestWithFile extends Request {
  file?: {
    path: string;
    originalname: string;
    filename: string;
    size: number;
    mimetype: string;
  };
  user?: any;
}

/**
 * Upload panoramic image
 */
class ImageController {
  static async uploadPanoramicImage(req: RequestWithFile, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { location_id } = req.body;
    const uploaded_by = req.user?.id;

    if (!location_id || isNaN(Number(location_id))) {
      return res.status(400).json({ error: 'Valid location_id is required' });
    }

    // Check if location exists
    const locationCheck = await pool.query('SELECT id FROM locations WHERE id = $1', [location_id]);
    if (locationCheck.rows.length === 0) {
      // Delete uploaded file if location doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Location not found' });
    }

    // Process image with Sharp to get dimensions and optimize
    const imageInfo = await sharp(req.file.path)
      .jpeg({ quality: 85 })
      .toBuffer({ resolveWithObject: true });

    // Create processed version
    const processedPath = req.file.path.replace(path.extname(req.file.path), '-processed.jpg');
    await sharp(req.file.path)
      .jpeg({ quality: 85 })
      .toFile(processedPath);

    // Save to database
    const query = `
      INSERT INTO panoramic_images 
      (location_id, original_filename, stored_filename, file_path, file_size, mime_type, width, height, uploaded_by, is_processed)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      location_id,
      req.file.originalname,
      req.file.filename,
      processedPath, // Use processed image path
      req.file.size,
      req.file.mimetype,
      imageInfo.info.width,
      imageInfo.info.height,
      uploaded_by,
      true
    ];

    const result = await pool.query(query, values);
    
    // Delete original file, keep processed version
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error uploading panoramic image:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

/**
 * Get panoramic image by ID
 */
static async getPanoramicImage(req: RequestWithFile, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    
    const query = 'SELECT * FROM panoramic_images WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const image = result.rows[0];
    
    // Check if file exists
    if (!fs.existsSync(image.file_path)) {
      return res.status(404).json({ error: 'Image file not found on server' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', image.mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    
    // Serve the image file
    res.sendFile(path.resolve(image.file_path));
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
};

/**
 * Get all images for a location
 */
static async getLocationImages(req: RequestWithFile, res: Response) {
  try {
    const { locationId } = req.params;
    
    if (!locationId || isNaN(Number(locationId))) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }

    const query = `
      SELECT pi.*, l.name as location_name 
      FROM panoramic_images pi
      JOIN locations l ON pi.location_id = l.id
      WHERE pi.location_id = $1
      ORDER BY pi.created_at DESC
    `;
    
    const result = await pool.query(query, [locationId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching location images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
};

/**
 * Delete panoramic image
 */
static async deletePanoramicImage(req: RequestWithFile, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    // Get image info first
    const imageQuery = 'SELECT * FROM panoramic_images WHERE id = $1';
    const imageResult = await pool.query(imageQuery, [id]);
    
    if (imageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = imageResult.rows[0];

    // Delete from database
    const deleteQuery = 'DELETE FROM panoramic_images WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    // Delete file from filesystem
    if (fs.existsSync(image.file_path)) {
      fs.unlinkSync(image.file_path);
    }

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};

}

module.exports = ImageController;
