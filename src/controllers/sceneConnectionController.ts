import type { Request, Response } from 'express';
const { validationResult } = require('express-validator');
const { 
  SceneConnectionModel, 
  PanoramicImageModel, 
  ResponseFormatterModel 
} = require('../models');

class SceneConnectionController {
  // Get a single scene connection with full details
  static async getConnectionById(req: Request, res: Response) {
    try {
      const connectionId = req.params.id ? parseInt(req.params.id) : NaN;

      if (!connectionId || isNaN(connectionId)) {
        return res.status(400).json(
          ResponseFormatterModel.formatErrorResponse('INVALID_CONNECTION_ID', 'Valid connection ID is required', 400)
        );
      }

      const connection = await SceneConnectionModel.findById(connectionId);
      if (!connection) {
        return res.status(404).json(
          ResponseFormatterModel.formatErrorResponse('CONNECTION_NOT_FOUND', 'Scene connection not found', 404)
        );
      }

      const formattedConnection = ResponseFormatterModel.formatSceneConnection(connection);
      res.json(ResponseFormatterModel.formatSuccessResponse(formattedConnection));

    } catch (error) {
      console.error('Error fetching scene connection:', error);
      res.status(500).json(
        ResponseFormatterModel.formatErrorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch scene connection', 500)
      );
    }
  }

  // Get all connections for a specific panoramic image
  static async getConnectionsForImage(req: Request, res: Response) {
    try {
      const imageId = req.params.imageId ? parseInt(req.params.imageId) : NaN;

      if (!imageId || isNaN(imageId)) {
        return res.status(400).json(
          ResponseFormatterModel.formatErrorResponse('INVALID_IMAGE_ID', 'Valid image ID is required', 400)
        );
      }

      // Check if source image exists
      const imageCheck = await PanoramicImageModel.findById(imageId);
      if (!imageCheck) {
        return res.status(404).json(
          ResponseFormatterModel.formatErrorResponse('IMAGE_NOT_FOUND', 'Source image not found', 404)
        );
      }

      const connections = await SceneConnectionModel.findByFromImageId(imageId);
      const formattedConnections = ResponseFormatterModel.formatSceneConnections(connections);

      const meta = {
        total: formattedConnections.length,
        source_image_id: imageId,
        timestamp: new Date().toISOString()
      };

      res.json(ResponseFormatterModel.formatResponseWithMeta(formattedConnections, meta));

    } catch (error) {
      console.error('Error fetching scene connections:', error);
      res.status(500).json(
        ResponseFormatterModel.formatErrorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch scene connections', 500)
      );
    }
  }

  // Get all connections (for admin dashboard)
  static async getAllConnections(req: Request, res: Response) {
    try {
      const connections = await SceneConnectionModel.findAll();
      const formattedConnections = ResponseFormatterModel.formatSceneConnections(connections);

      const meta = {
        total: formattedConnections.length,
        timestamp: new Date().toISOString()
      };

      res.json(ResponseFormatterModel.formatResponseWithMeta(formattedConnections, meta));
    } catch (error) {
      console.error('Error fetching all connections:', error);
      res.status(500).json(
        ResponseFormatterModel.formatErrorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch connections', 500)
      );
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
      const imagesExist = await PanoramicImageModel.findByIds([from_image_id, to_image_id]);
      if (imagesExist.length !== 2) {
        return res.status(400).json({ error: 'One or both panoramic images not found' });
      }

      // Create the connection
      const connection = await SceneConnectionModel.create({
        from_image_id,
        to_image_id,
        direction_angle,
        distance_meters,
        transition_type,
        connection_name,
        is_bidirectional,
        is_active
      });

      // If bidirectional, create reverse connection
      if (is_bidirectional) {
        const reverseAngle = (direction_angle + 180) % 360;
        await SceneConnectionModel.create({
          from_image_id: to_image_id,
          to_image_id: from_image_id,
          direction_angle: reverseAngle,
          distance_meters,
          transition_type,
          connection_name: connection_name ? `${connection_name} (reverse)` : null,
          is_bidirectional: false,
          is_active
        });
      }

      // Return the created connection in enhanced format
      const createdConnection = await SceneConnectionModel.findById(connection.id);
      const formattedConnection = ResponseFormatterModel.formatSceneConnection(createdConnection!);
      
      res.status(201).json(
        ResponseFormatterModel.formatSuccessResponse(formattedConnection, 'Scene connection created successfully')
      );
    } catch (error: any) {
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
      if (!id) {
        return res.status(400).json({ error: 'Connection ID is required' });
      }

      const updates = req.body;

      const updatedConnection = await SceneConnectionModel.update(parseInt(id), updates);
      if (!updatedConnection) {
        return res.status(404).json({ error: 'Scene connection not found' });
      }

      // Return the updated connection in enhanced format
      const connection = await SceneConnectionModel.findById(parseInt(id));
      const formattedConnection = ResponseFormatterModel.formatSceneConnection(connection!);
      
      res.json(
        ResponseFormatterModel.formatSuccessResponse(formattedConnection, 'Scene connection updated successfully')
      );
    } catch (error) {
      console.error('Error updating scene connection:', error);
      res.status(500).json({ error: 'Failed to update scene connection' });
    }
  }

  // Delete a scene connection
  static async deleteConnection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Connection ID is required' });
      }

      const deletedConnection = await SceneConnectionModel.delete(parseInt(id));
      if (!deletedConnection) {
        return res.status(404).json({ error: 'Scene connection not found' });
      }

      res.json(ResponseFormatterModel.formatSuccessResponse(null, 'Scene connection deleted successfully'));
    } catch (error) {
      console.error('Error deleting scene connection:', error);
      res.status(500).json({ error: 'Failed to delete scene connection' });
    }
  }

  // Get available images for connection creation
  static async getAvailableImages(req: Request, res: Response) {
    try {
      const images = await PanoramicImageModel.getAvailableImages();
      res.json(images);
    } catch (error) {
      console.error('Error fetching available images:', error);
      res.status(500).json({ error: 'Failed to fetch available images' });
    }
  }
}

module.exports = { SceneConnectionController };
