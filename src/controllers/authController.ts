import type{ Request, Response } from 'express';
const { pool } = require('../config/database');
const { generateTokens, verifyRefreshToken, getRefreshTokenExpiration } = require('../utils/jwt');
const { hashPassword, comparePassword } = require('../utils/password');
const { registerSchema, loginSchema, refreshTokenSchema } = require('../utils/validation');
import type{ LoginRequest, RegisterRequest, RefreshTokenRequest, UserWithoutPassword } from '../types';

/**
 * Register new user
 */
class AuthController {
  static async register(req: Request, res: Response) {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, email, password, role = 'admin' }: RegisterRequest = value;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, email, role, is_active, created_at, updated_at`,
      [username, email, passwordHash, role]
    );

    const user: UserWithoutPassword = result.rows[0];

    // Generate tokens
    const tokens = generateTokens(user);

    // Store refresh token in database
    const { tokenId } = verifyRefreshToken(tokens.refresh_token)!;
    const refreshTokenHash = await hashPassword(tokens.refresh_token);
    const expiresAt = getRefreshTokenExpiration();

    await pool.query(
      'INSERT INTO refresh_tokens (token_id, user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [tokenId, user.id, refreshTokenHash, expiresAt]
    );

    res.status(201).json(tokens);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

/**
 * Login user
 */
static async login(req: Request, res: Response) {
  try {
    const debugEnabled = (process.env.DEBUG || '').toLowerCase() === 'true';
    if (debugEnabled) {
      console.log('[LOGIN][REQ]', JSON.stringify({
        email: (req.body?.email ?? '').toString(),
        // Never log raw password
        bodyKeys: Object.keys(req.body || {}),
        ip: (req as any).ip,
        userAgent: req.get('user-agent') || undefined,
      }));
    }
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password }: LoginRequest = value;

    // Find user
    const result = await pool.query(
      `SELECT id, username, email, password_hash, role, is_active, created_at, updated_at 
       FROM users WHERE email = $1 AND is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      if (debugEnabled) console.warn('[LOGIN] User not found or inactive for email');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Compare password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      if (debugEnabled) console.warn('[LOGIN] Invalid password for user id', user.id);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Remove password hash from user object
    const { password_hash, ...userWithoutPassword } = user;

    // Generate tokens
    const tokens = generateTokens(userWithoutPassword);

    // Store refresh token in database
    const { tokenId } = verifyRefreshToken(tokens.refresh_token)!;
    const refreshTokenHash = await hashPassword(tokens.refresh_token);
    const expiresAt = getRefreshTokenExpiration();

    await pool.query(
      'INSERT INTO refresh_tokens (token_id, user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [tokenId, user.id, refreshTokenHash, expiresAt]
    );

    if (debugEnabled) {
      console.log('[LOGIN][SUCCESS]', JSON.stringify({ userId: user.id, role: user.role }));
    }

    // Return both tokens and user data to avoid second API call
    res.json({
      ...tokens,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

/**
 * Refresh access token
 */
static async refreshToken(req: Request, res: Response) {
  try {
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { refresh_token }: RefreshTokenRequest = value;

    // Verify refresh token
    const tokenData = verifyRefreshToken(refresh_token);
    if (!tokenData) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    // Check if token exists and is not revoked
    const storedToken = await pool.query(
      `SELECT rt.*, u.username, u.email, u.role, u.is_active 
       FROM refresh_tokens rt 
       JOIN users u ON rt.user_id = u.id 
       WHERE rt.token_id = $1 AND rt.is_revoked = false AND rt.expires_at > NOW() AND u.is_active = true`,
      [tokenData.tokenId]
    );

    if (storedToken.rows.length === 0) {
      return res.status(403).json({ error: 'Refresh token not found or expired' });
    }

    const tokenRecord = storedToken.rows[0];

    // Verify the token hash
    const isValidToken = await comparePassword(refresh_token, tokenRecord.refresh_token_hash);
    if (!isValidToken) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    // Revoke old refresh token
    await pool.query('UPDATE refresh_tokens SET is_revoked = true WHERE id = $1', [tokenRecord.id]);

    // Generate new tokens
    const user: UserWithoutPassword = {
      id: tokenRecord.user_id,
      username: tokenRecord.username,
      email: tokenRecord.email,
      role: tokenRecord.role,
      is_active: tokenRecord.is_active,
      created_at: tokenRecord.created_at,
      updated_at: tokenRecord.updated_at
    };

    const tokens = generateTokens(user);

    // Store new refresh token
    const { tokenId: newTokenId } = verifyRefreshToken(tokens.refresh_token)!;
    const newRefreshTokenHash = await hashPassword(tokens.refresh_token);
    const expiresAt = getRefreshTokenExpiration();

    await pool.query(
      'INSERT INTO refresh_tokens (token_id, user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [newTokenId, user.id, newRefreshTokenHash, expiresAt]
    );

    res.json(tokens);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

/**
 * Logout user
 */
static async logout(req: Request, res: Response) {
  try {
    const { refresh_token }: RefreshTokenRequest = req.body;

    if (refresh_token) {
      const tokenData = verifyRefreshToken(refresh_token);
      if (tokenData) {
        // Revoke refresh token
        await pool.query(
          'UPDATE refresh_tokens SET is_revoked = true WHERE token_id = $1',
          [tokenData.tokenId]
        );
      }
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
};

/**
 * Get current user profile
 */
static async getProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await pool.query(
      `SELECT id, username, email, role, is_active, last_login, created_at, updated_at 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};
}


module.exports = AuthController