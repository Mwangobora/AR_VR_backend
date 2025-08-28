export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithoutPassword extends Omit<User, 'password_hash'> {}

export interface RefreshToken {
  id: number;
  token_id: string;
  user_id: number;
  refresh_token_hash: string;
  expires_at: Date;
  is_revoked: boolean;
  created_at: Date;
}

export interface Location {
  id: number;
  name: string;
  description?: string;
  category?: string;
  latitude: number;
  longitude: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface PanoramicImage {
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

export interface Hotspot {
  id: number;
  location_id: number;
  title: string;
  description?: string;
  map_x: number;
  map_y: number;
  hotspot_type: 'panoramic' | 'info' | 'external_link';
  icon_type: string;
  is_active: boolean;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

// Request/Response Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'super_admin';
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserWithoutPassword;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface CreateLocationRequest {
  name: string;
  description?: string;
  category?: string;
  latitude: number;
  longitude: number;
}

export interface CreateHotspotRequest {
  location_id: number;
  title: string;
  description?: string;
  map_x: number;
  map_y: number;
  hotspot_type: 'panoramic' | 'info' | 'external_link';
  icon_type?: string;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'super_admin';
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Enhanced Scene Connection Types
export interface SceneConnectionImage {
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
}

export interface SceneConnectionHotspot {
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
}

export interface SceneConnectionNavigation {
  connection_name: string;
  transition_type: string;
  distance_meters: number;
  is_bidirectional?: boolean;
}

export interface SceneConnectionMetadata {
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface EnhancedSceneConnection {
  id: number;
  from_image: SceneConnectionImage;
  to_image: SceneConnectionImage;
  hotspot: SceneConnectionHotspot;
  navigation: SceneConnectionNavigation;
  metadata: SceneConnectionMetadata;
}

export interface CreateSceneConnectionRequest {
  from_image_id: number;
  to_image_id: number;
  direction_angle: number;
  distance_meters?: number;
  transition_type?: string;
  connection_name: string;
  is_bidirectional?: boolean;
  is_active?: boolean;
}

export interface UpdateSceneConnectionRequest {
  direction_angle?: number;
  distance_meters?: number;
  transition_type?: string;
  connection_name?: string;
  is_bidirectional?: boolean;
  is_active?: boolean;
}