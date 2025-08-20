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