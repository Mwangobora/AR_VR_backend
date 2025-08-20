const jwt = require('jsonwebtoken');  
const { v4: uuidv4 } = require('uuid');

// Type definitions
interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface UserWithoutPassword {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserWithoutPassword;
}

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const ACCESS_TOKEN_EXPIRES_IN = '1d'; // 1 day
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

/**
 * Generate access token
 */
const generateAccessToken = (user: AuthenticatedUser): string => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user: AuthenticatedUser): { token: string; tokenId: string } => {
  const tokenId = uuidv4();
  const token = jwt.sign(
    {
      id: user.id,
      tokenId,
      type: 'refresh'
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
  
  return { token, tokenId };
};

/**
 * Generate token pair
 */
const generateTokens = (user: UserWithoutPassword): TokenResponse => {
  const authUser: AuthenticatedUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  const accessToken = generateAccessToken(authUser);
  const { token: refreshToken } = generateRefreshToken(authUser);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: 900, // 15 minutes in seconds
    user: user
  };
};

/**
 * Verify access token
 */
const verifyAccessToken = (token: string): AuthenticatedUser | null => {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as any;
    return {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    return null;
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token: string): { id: number; tokenId: string } | null => {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as any;
    if (decoded.type !== 'refresh') {
      return null;
    }
    return {
      id: decoded.id,
      tokenId: decoded.tokenId
    };
  } catch (error) {
    return null;
  }
};

/**
 * Get token expiration date
 */
const getRefreshTokenExpiration = (): Date => {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenExpiration
};