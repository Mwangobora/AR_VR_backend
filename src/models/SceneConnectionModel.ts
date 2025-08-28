import { pool } from '../config/database';

export interface SceneConnectionRow {
  id: number;
  direction_angle: number;
  distance_meters: number;
  transition_type: string;
  connection_name: string;
  is_bidirectional: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  from_image: any;
  to_image: any;
}

export class SceneConnectionModel {
  // Get a single scene connection by ID
  static async findById(connectionId: number): Promise<SceneConnectionRow | null> {
    const query = `
      SELECT
        sc.id,
        sc.direction_angle,
        sc.distance_meters,
        sc.transition_type,
        sc.connection_name,
        sc.is_bidirectional,
        sc.is_active,
        sc.created_at,
        sc.updated_at,
        -- From image data
        json_build_object(
          'id', pi_from.id,
          'filename', pi_from.original_filename,
          'location', l_from.name,
          'url', '/uploads/' || pi_from.stored_filename,
          'stored_filename', pi_from.stored_filename,
          'dimensions', json_build_object(
            'width', pi_from.width,
            'height', pi_from.height
          ),
          'coordinates', CASE
            WHEN l_from.latitude IS NOT NULL AND l_from.longitude IS NOT NULL
            THEN json_build_object('lat', l_from.latitude, 'lng', l_from.longitude)
            ELSE NULL
          END
        ) as from_image,
        -- To image data
        json_build_object(
          'id', pi_to.id,
          'filename', pi_to.original_filename,
          'location', l_to.name,
          'url', '/uploads/' || pi_to.stored_filename,
          'stored_filename', pi_to.stored_filename,
          'dimensions', json_build_object(
            'width', pi_to.width,
            'height', pi_to.height
          ),
          'coordinates', CASE
            WHEN l_to.latitude IS NOT NULL AND l_to.longitude IS NOT NULL
            THEN json_build_object('lat', l_to.latitude, 'lng', l_to.longitude)
            ELSE NULL
          END
        ) as to_image
      FROM scene_connections sc
      JOIN panoramic_images pi_from ON sc.from_image_id = pi_from.id
      JOIN panoramic_images pi_to ON sc.to_image_id = pi_to.id
      JOIN locations l_from ON pi_from.location_id = l_from.id
      JOIN locations l_to ON pi_to.location_id = l_to.id
      WHERE sc.id = $1
    `;

    const result = await pool.query(query, [connectionId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Get all connections for a specific image
  static async findByFromImageId(imageId: number): Promise<SceneConnectionRow[]> {
    const query = `
      SELECT
        sc.id,
        sc.direction_angle,
        sc.distance_meters,
        sc.transition_type,
        sc.connection_name,
        sc.is_bidirectional,
        sc.is_active,
        sc.created_at,
        sc.updated_at,
        -- Enhanced from_image data
        json_build_object(
          'id', pi_from.id,
          'filename', pi_from.original_filename,
          'stored_filename', pi_from.stored_filename,
          'location', l_from.name,
          'url', '/uploads/' || pi_from.stored_filename,
          'dimensions', json_build_object(
            'width', pi_from.width,
            'height', pi_from.height
          ),
          'coordinates', CASE
            WHEN l_from.latitude IS NOT NULL AND l_from.longitude IS NOT NULL
            THEN json_build_object('lat', l_from.latitude, 'lng', l_from.longitude)
            ELSE NULL
          END
        ) as from_image,
        -- Enhanced to_image data
        json_build_object(
          'id', pi_to.id,
          'filename', pi_to.original_filename,
          'stored_filename', pi_to.stored_filename,
          'location', l_to.name,
          'url', '/uploads/' || pi_to.stored_filename,
          'dimensions', json_build_object(
            'width', pi_to.width,
            'height', pi_to.height
          ),
          'coordinates', CASE
            WHEN l_to.latitude IS NOT NULL AND l_to.longitude IS NOT NULL
            THEN json_build_object('lat', l_to.latitude, 'lng', l_to.longitude)
            ELSE NULL
          END
        ) as to_image
      FROM scene_connections sc
      JOIN panoramic_images pi_from ON sc.from_image_id = pi_from.id
      JOIN panoramic_images pi_to ON sc.to_image_id = pi_to.id
      JOIN locations l_from ON pi_from.location_id = l_from.id
      JOIN locations l_to ON pi_to.location_id = l_to.id
      WHERE sc.from_image_id = $1 AND sc.is_active = true
      ORDER BY sc.direction_angle ASC
    `;

    const result = await pool.query(query, [imageId]);
    return result.rows;
  }

  // Get all connections for admin dashboard
  static async findAll(): Promise<SceneConnectionRow[]> {
    const query = `
      SELECT
        sc.id,
        sc.direction_angle,
        sc.distance_meters,
        sc.transition_type,
        sc.connection_name,
        sc.is_bidirectional,
        sc.is_active,
        sc.created_at,
        sc.updated_at,
        -- From image data
        json_build_object(
          'id', pi_from.id,
          'filename', pi_from.original_filename,
          'location', l_from.name,
          'url', '/uploads/' || pi_from.stored_filename,
          'stored_filename', pi_from.stored_filename,
          'dimensions', json_build_object(
            'width', pi_from.width,
            'height', pi_from.height
          ),
          'coordinates', CASE
            WHEN l_from.latitude IS NOT NULL AND l_from.longitude IS NOT NULL
            THEN json_build_object('lat', l_from.latitude, 'lng', l_from.longitude)
            ELSE NULL
          END
        ) as from_image,
        -- To image data
        json_build_object(
          'id', pi_to.id,
          'filename', pi_to.original_filename,
          'location', l_to.name,
          'url', '/uploads/' || pi_to.stored_filename,
          'stored_filename', pi_to.stored_filename,
          'dimensions', json_build_object(
            'width', pi_to.width,
            'height', pi_to.height
          ),
          'coordinates', CASE
            WHEN l_to.latitude IS NOT NULL AND l_to.longitude IS NOT NULL
            THEN json_build_object('lat', l_to.latitude, 'lng', l_to.longitude)
            ELSE NULL
          END
        ) as to_image
      FROM scene_connections sc
      JOIN panoramic_images pi_from ON sc.from_image_id = pi_from.id
      JOIN panoramic_images pi_to ON sc.to_image_id = pi_to.id
      JOIN locations l_from ON pi_from.location_id = l_from.id
      JOIN locations l_to ON pi_to.location_id = l_to.id
      ORDER BY sc.created_at DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // Create a new scene connection
  static async create(connectionData: {
    from_image_id: number;
    to_image_id: number;
    direction_angle: number;
    distance_meters: number;
    transition_type: string;
    connection_name: string;
    is_bidirectional: boolean;
    is_active: boolean;
  }): Promise<any> {
    const query = `
      INSERT INTO scene_connections 
      (from_image_id, to_image_id, direction_angle, distance_meters, transition_type, connection_name, is_bidirectional, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      connectionData.from_image_id,
      connectionData.to_image_id,
      connectionData.direction_angle,
      connectionData.distance_meters,
      connectionData.transition_type,
      connectionData.connection_name,
      connectionData.is_bidirectional,
      connectionData.is_active
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Update a scene connection
  static async update(id: number, updates: any): Promise<any> {
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
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `
      UPDATE scene_connections 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Delete a scene connection
  static async delete(id: number): Promise<any> {
    const query = 'DELETE FROM scene_connections WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Check if images exist
  static async checkImagesExist(imageIds: number[]): Promise<boolean> {
    const query = 'SELECT id FROM panoramic_images WHERE id = ANY($1)';
    const result = await pool.query(query, [imageIds]);
    return result.rows.length === imageIds.length;
  }
}
