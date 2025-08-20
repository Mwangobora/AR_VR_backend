import type{ Request, Response, NextFunction } from 'express';
const { verifyAccessToken } = require('../utils/jwt');

/**
 * Authenticate JWT token
 * 
 */

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const user = verifyAccessToken(token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }

  req.user = user;
  next();
};

/**
 * Check if user is super admin
 */
const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }

  next();
};

/**
 * Check if user is admin or super admin
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireSuperAdmin,
  requireAdmin
};