-- Create database tables
CREATE DATABASE udom_arvr_maps;

-- Users table for authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'super_admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campus locations table
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- e.g., 'building', 'facility', 'landmark'
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 360 images table
CREATE TABLE panoramic_images (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    width INTEGER,
    height INTEGER,
    is_processed BOOLEAN DEFAULT FALSE,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hotspots/Markers table
CREATE TABLE hotspots (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    map_x DECIMAL(10, 6) NOT NULL,
    map_y DECIMAL(10, 6) NOT NULL,
    hotspot_type VARCHAR(50) DEFAULT 'panoramic' CHECK (hotspot_type IN ('panoramic', 'info', 'external_link')),
    icon_type VARCHAR(50) DEFAULT 'default',
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table for session management
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    token_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scene Connections Table for VR Navigation
CREATE TABLE scene_connections (
    id SERIAL PRIMARY KEY,
    from_image_id INTEGER NOT NULL REFERENCES panoramic_images(id) ON DELETE CASCADE,
    to_image_id INTEGER NOT NULL REFERENCES panoramic_images(id) ON DELETE CASCADE,
    direction_angle DECIMAL(5,2) NOT NULL CHECK (direction_angle >= 0 AND direction_angle < 360),
    distance_meters DECIMAL(8,2) DEFAULT 0 CHECK (distance_meters >= 0),
    transition_type VARCHAR(50) DEFAULT 'walk' CHECK (transition_type IN ('walk', 'teleport', 'fade', 'slide')),
    connection_name VARCHAR(255),
    is_bidirectional BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate connections
    UNIQUE(from_image_id, to_image_id),
    -- Prevent self-connections
    CHECK (from_image_id != to_image_id)
);

-- Indexes for performance
CREATE INDEX idx_scene_connections_from_image ON scene_connections(from_image_id);
CREATE INDEX idx_scene_connections_to_image ON scene_connections(to_image_id);
CREATE INDEX idx_scene_connections_active ON scene_connections(is_active);
