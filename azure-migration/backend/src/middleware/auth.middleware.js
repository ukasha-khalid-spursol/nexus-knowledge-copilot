const jwt = require('jsonwebtoken');
const { dbUtils } = require('../utils/database');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token type is access token
    if (decoded.type !== 'access') {
      return res.status(401).json({
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Check if user exists and is active
    const user = await dbUtils.getRecord('users', 'id = @userId', {
      userId: decoded.userId
    }, 'id, email, email_verified, banned_until, created_at, updated_at');

    if (!user) {
      logger.security('Authentication attempt with non-existent user', {
        userId: decoded.userId,
        ip: req.ip
      });
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is banned
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      logger.security('Authentication attempt by banned user', {
        userId: user.id,
        bannedUntil: user.banned_until,
        ip: req.ip
      });
      return res.status(403).json({
        error: 'Account temporarily banned',
        code: 'ACCOUNT_BANNED',
        bannedUntil: user.banned_until
      });
    }

    // Check if email is verified (if email verification is required)
    if (!user.email_verified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
      return res.status(403).json({
        error: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Check if session is valid
    const sessionExists = await dbUtils.recordExists(
      'sessions',
      'id = @sessionId AND user_id = @userId AND expires_at > GETUTCDATE()',
      {
        sessionId: decoded.sessionId,
        userId: decoded.userId
      }
    );

    if (!sessionExists) {
      logger.security('Authentication with invalid session', {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
        ip: req.ip
      });
      return res.status(401).json({
        error: 'Session expired or invalid',
        code: 'INVALID_SESSION'
      });
    }

    // Get user role
    const userRole = await dbUtils.getRecord(
      'user_roles ur INNER JOIN app_roles ar ON ur.role_id = ar.id',
      'ur.user_id = @userId',
      { userId: decoded.userId },
      'ar.role_name as role'
    );

    // Attach user data to request
    req.user = {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified,
      role: userRole?.role || 'user',
      sessionId: decoded.sessionId
    };

    // Log successful authentication
    logger.auth('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      role: req.user.role,
      ip: req.ip
    });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.security('Invalid JWT token', {
        error: error.message,
        ip: req.ip
      });
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      logger.auth('Expired JWT token', {
        expiredAt: error.expiredAt,
        ip: req.ip
      });
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

/**
 * Middleware to check if user has required role
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userRole = req.user.role;

      // Admin role has access to everything
      if (userRole === 'admin') {
        return next();
      }

      // Check if user has the required role
      if (userRole !== requiredRole) {
        logger.security('Insufficient permissions', {
          userId: req.user.id,
          userRole,
          requiredRole,
          endpoint: req.originalUrl,
          ip: req.ip
        });
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredRole,
          current: userRole
        });
      }

      next();
    } catch (error) {
      logger.error('Role check middleware error:', error);
      return res.status(500).json({
        error: 'Authorization service error',
        code: 'AUTH_SERVICE_ERROR'
      });
    }
  };
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = requireRole('admin');

/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // Use the authenticateToken middleware but don't fail on error
    const mockRes = {
      status: () => ({ json: () => {} })
    };

    authenticateToken(req, mockRes, (error) => {
      if (error) {
        req.user = null;
      }
      next();
    });
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * Middleware to check if the user can access their own resource
 */
const requireOwnership = (userIdParam = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const requestedUserId = req.params[userIdParam] || req.body[userIdParam];
      const currentUserId = req.user.id;

      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // User can only access their own resources
      if (requestedUserId !== currentUserId) {
        logger.security('Unauthorized resource access attempt', {
          userId: currentUserId,
          requestedUserId,
          endpoint: req.originalUrl,
          ip: req.ip
        });
        return res.status(403).json({
          error: 'Access denied - can only access your own resources',
          code: 'ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      logger.error('Ownership check middleware error:', error);
      return res.status(500).json({
        error: 'Authorization service error',
        code: 'AUTH_SERVICE_ERROR'
      });
    }
  };
};

/**
 * Middleware to extract tenant ID from request
 */
const extractTenantId = (req, res, next) => {
  try {
    // For now, we'll use a simple tenant strategy
    // This can be enhanced to support multi-tenancy
    req.tenantId = req.headers['x-tenant-id'] || 'default';

    // In the future, you might want to:
    // 1. Extract tenant from subdomain
    // 2. Extract tenant from user's organization
    // 3. Use JWT claims for tenant information

    next();
  } catch (error) {
    logger.error('Tenant extraction error:', error);
    return res.status(500).json({
      error: 'Tenant service error',
      code: 'TENANT_SERVICE_ERROR'
    });
  }
};

/**
 * Middleware to validate session context
 */
const validateSession = async (req, res, next) => {
  try {
    if (!req.user || !req.user.sessionId) {
      return next();
    }

    // Get session details
    const session = await dbUtils.getRecord(
      'sessions',
      'id = @sessionId AND user_id = @userId',
      {
        sessionId: req.user.sessionId,
        userId: req.user.id
      }
    );

    if (!session) {
      return res.status(401).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Check if session is expired
    if (new Date(session.expires_at) <= new Date()) {
      await dbUtils.deleteRecord('sessions', 'id = @sessionId', {
        sessionId: req.user.sessionId
      });

      return res.status(401).json({
        error: 'Session expired',
        code: 'SESSION_EXPIRED'
      });
    }

    // Update last accessed timestamp
    await dbUtils.updateRecord(
      'sessions',
      { updated_at: new Date() },
      'id = @sessionId',
      { sessionId: req.user.sessionId }
    );

    next();
  } catch (error) {
    logger.error('Session validation error:', error);
    return res.status(500).json({
      error: 'Session service error',
      code: 'SESSION_SERVICE_ERROR'
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  optionalAuth,
  requireOwnership,
  extractTenantId,
  validateSession
};