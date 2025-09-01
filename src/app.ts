const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
import type { Request, Response} from 'express';
import type { CorsOptions } from 'cors';

// Import routes
const authRoutes = require('./routes/authRoutes');
const locationRoutes = require('./routes/locationRoutes');
const imageRoutes = require('./routes/imageRoutes');
const hotspotRoutes = require('./routes/hotspotRoutes');
const sceneConnectionRoutes = require('./routes/sceneConnectionRoutes');

// Import middleware
const { errorHandler } = require('./middlewares/upload');

const app = express();
const PORT = process.env.PORT || 3000;
const { requestLogger, errorLogger } = require('./middlewares/logger');

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be served cross-origin
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, 
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Separate, more lenient rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 200, 
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Debug request logger (enabled when DEBUG=true)
app.use(requestLogger);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'UDOM AR/VR Maps API'
  });
});

// Use route modules with specific rate limiting for auth
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/hotspots', hotspotRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/scene-connections', sceneConnectionRoutes);

// Static files (serve uploaded images with caching)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1y', // Cache for 1 year
  etag: true
}));

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware (must be last)
app.use(errorLogger);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 UDOM AR/VR Maps API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Authentication endpoints available`);
  console.log(`🗺️ Map and location endpoints active`);
});

module.exports = app;