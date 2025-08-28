import { PositionCalculatorModel } from './PositionCalculatorModel';
import { SceneConnectionRow } from './SceneConnectionModel';

export interface FormattedSceneConnection {
  id: number;
  from_image: {
    id: number;
    filename: string;
    location: string;
    url?: string;
    stored_filename?: string;
    dimensions?: {
      width?: number;
      height?: number;
    };
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  to_image: {
    id: number;
    filename: string;
    location: string;
    url?: string;
    stored_filename?: string;
    dimensions?: {
      width?: number;
      height?: number;
    };
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  hotspot: {
    direction_angle: number;
    position_3d: {
      x: number;
      y: number;
      z: number;
    };
    position_2d: {
      x: number;
      y: number;
    };
  };
  navigation: {
    connection_name: string;
    transition_type: string;
    distance_meters: number;
    is_bidirectional?: boolean;
  };
  metadata: {
    is_active: boolean;
    created_at: string;
    updated_at?: string;
  };
}

export class ResponseFormatterModel {
  // Format a single scene connection row to the desired response structure
  static formatSceneConnection(row: SceneConnectionRow): FormattedSceneConnection {
    // Calculate 3D position for VR hotspots
    const position3D = PositionCalculatorModel.calculatePosition3D(
      row.direction_angle, 
      row.distance_meters || 5
    );
    
    // Calculate 2D position for flat image hotspots
    const position2D = PositionCalculatorModel.calculatePosition2D(row.direction_angle);

    return {
      id: row.id,
      from_image: row.from_image,
      to_image: row.to_image,
      hotspot: {
        direction_angle: parseFloat(row.direction_angle.toString()),
        position_3d: position3D,
        position_2d: position2D
      },
      navigation: {
        connection_name: row.connection_name || '',
        transition_type: row.transition_type || 'walk',
        distance_meters: parseFloat(row.distance_meters.toString()) || 0,
        is_bidirectional: row.is_bidirectional
      },
      metadata: {
        is_active: row.is_active,
        created_at: row.created_at.toString(),
        updated_at: row.updated_at?.toString()
      }
    };
  }

  // Format multiple scene connections
  static formatSceneConnections(rows: SceneConnectionRow[]): FormattedSceneConnection[] {
    return rows.map(row => this.formatSceneConnection(row));
  }

  // Format success response with data
  static formatSuccessResponse(data: any, message?: string) {
    return {
      success: true,
      data,
      ...(message && { message })
    };
  }

  // Format error response
  static formatErrorResponse(error: string, message: string, code: number = 500) {
    return {
      error,
      message,
      code
    };
  }

  // Format response with metadata
  static formatResponseWithMeta(data: any, meta: any) {
    return {
      success: true,
      data,
      meta
    };
  }
}
