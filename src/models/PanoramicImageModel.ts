import { pool } from '../config/database';

export interface PanoramicImageRow {
  id: number;
  location_id: number;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  is_processed: boolean;
  uploaded_by: number;
  created_at: Date;
}

export class PanoramicImageModel {
  // Check if image exists by ID
  static async findById(id: number): Promise<PanoramicImageRow | null> {
    const query = 'SELECT id FROM panoramic_images WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Check if multiple images exist
  static async findByIds(ids: number[]): Promise<PanoramicImageRow[]> {
    const query = 'SELECT id FROM panoramic_images WHERE id = ANY($1)';
    const result = await pool.query(query, [ids]);
    return result.rows;
  }

  // Get available images for connection creation
  static async getAvailableImages(): Promise<any[]> {
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
    return result.rows;
  }

  // Get image with location details
  static async findByIdWithLocation(id: number): Promise<any> {
    const query = `
      SELECT 
        pi.*,
        l.name as location_name,
        l.latitude,
        l.longitude
      FROM panoramic_images pi
      JOIN locations l ON pi.location_id = l.id
      WHERE pi.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }
}
