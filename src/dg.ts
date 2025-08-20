// test-app.ts - Create this file to test your routes in isolation
const express = require('express');
const cors = require('cors');
import type { Request, Response } from 'express';

const app = express();
const PORT = 3001; // Different port to avoid conflicts

// Basic middleware
app.use(cors());
app.use(express.json());

// Test each route file individually
console.log('🧪 Testing routes individually...');

try {
  console.log('1️⃣ Testing authRoutes...');
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
  console.log('✅ authRoutes loaded successfully');
} catch (error: any) {
  console.log('❌ authRoutes failed:', error.message);
  console.log('Stack:', error.stack);
  process.exit(1);
}

try {
  console.log('2️⃣ Testing locationRoutes...');
  const locationRoutes = require('./routes/locationRoutes');
  app.use('/api/locations', locationRoutes);
  console.log('✅ locationRoutes loaded successfully');
} catch (error: any) {
  console.log('❌ locationRoutes failed:', error.message);
  console.log('Stack:', error.stack);
  process.exit(1);
}

try {
  console.log('3️⃣ Testing imageRoutes...');
  const imageRoutes = require('./routes/imageRoutes');
  app.use('/api/images', imageRoutes);
  console.log('✅ imageRoutes loaded successfully');
} catch (error: any) {
  console.log('❌ imageRoutes failed:', error.message);
  console.log('Stack:', error.stack);
  process.exit(1);
}

try {
  console.log('4️⃣ Testing hotspotRoutes...');
  const hotspotRoutes = require('./routes/hotspotRoutes');
  app.use('/api/hotspots', hotspotRoutes);
  console.log('✅ hotspotRoutes loaded successfully');
} catch (error: any) {
  console.log('❌ hotspotRoutes failed:', error.message);
  console.log('Stack:', error.stack);
  process.exit(1);
}

// Test endpoints
app.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'All routes loaded successfully!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`✅ All routes loaded without path-to-regexp errors!`);
  console.log(`🔧 Test endpoint: http://localhost:${PORT}/test`);
  
  // Test a few endpoints
  console.log('\n📋 Available test endpoints:');
  console.log(`   GET  http://localhost:${PORT}/api/locations`);
  console.log(`   GET  http://localhost:${PORT}/api/hotspots`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register`);
  
  console.log('\n🎉 SUCCESS: If you see this, your routes are NOT the problem!');
  console.log('🔍 The path-to-regexp error is likely in:');
  console.log('   - Middleware files (auth, upload, logger)');
  console.log('   - Controller files');
  console.log('   - Dynamic route generation');
  
  // Don't exit, keep server running for testing
  // process.exit(0); 
});