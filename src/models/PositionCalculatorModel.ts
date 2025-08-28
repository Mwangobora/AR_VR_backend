export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Position2D {
  x: number;
  y: number;
}

export class PositionCalculatorModel {
  // Calculate 3D position for VR hotspots (spherical coordinates)
  static calculatePosition3D(angle: number, distance: number): Position3D {
    // Convert angle to radians
    const angleRad = (angle * Math.PI) / 180;
    
    // Calculate 3D position on a sphere
    // Assuming the viewer is at the center (0, 0, 0)
    // and the hotspot is on a sphere with radius = distance
    const x = distance * Math.cos(angleRad);
    const y = 1.6; // Fixed height for user eye level
    const z = -distance * Math.sin(angleRad); // Negative for forward direction
    
    return {
      x: Math.round(x * 100) / 100, // Round to 2 decimal places
      y: Math.round(y * 100) / 100,
      z: Math.round(z * 100) / 100
    };
  }

  // Calculate 2D position for flat image hotspots
  static calculatePosition2D(angle: number): Position2D {
    // Convert angle to position on a 360-degree image
    // Assuming image is 360 degrees wide
    const normalizedAngle = ((angle + 360) % 360) / 360;
    
    // Convert to pixel coordinates (assuming 100x100 viewport)
    const x = Math.round(normalizedAngle * 100);
    const y = 45; // Fixed vertical position
    
    return { x, y };
  }

  // Calculate multiple positions for batch processing
  static calculateBatchPositions(angles: number[], distances: number[]): {
    positions3D: Position3D[];
    positions2D: Position2D[];
  } {
    const positions3D: Position3D[] = [];
    const positions2D: Position2D[] = [];

    for (let i = 0; i < angles.length; i++) {
      const distance = distances[i] || 5; // Default distance
      positions3D.push(this.calculatePosition3D(angles[i], distance));
      positions2D.push(this.calculatePosition2D(angles[i]));
    }

    return { positions3D, positions2D };
  }
}
