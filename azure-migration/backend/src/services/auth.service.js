const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { dbUtils, executeQuery, sql } = require('../utils/database');
const logger = require('../utils/logger');
const emailService = require('./email.service');

class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const { email, password, displayName, role = 'user' } = userData;

    try {
      // Check if user already exists
      const existingUser = await dbUtils.recordExists('users', 'email = @email', { email });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Validate password strength
      this.validatePassword(password);

      // Hash password
      const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
      const passwordHash = await bcrypt.hash(password, salt);

      // Generate user ID
      const userId = uuidv4();

      // Create user
      const user = await dbUtils.insertRecord('users', {
        id: userId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        salt,
        email_verified: false,
        raw_user_meta_data: JSON.stringify({ display_name: displayName || email.split('@')[0] })
      });

      // Create profile
      await dbUtils.insertRecord('profiles', {
        user_id: userId,
        display_name: displayName || email.split('@')[0]
      });

      // Assign role
      const roleRecord = await dbUtils.getRecord('app_roles', 'role_name = @role', { role });
      if (roleRecord) {
        await dbUtils.insertRecord('user_roles', {
          user_id: userId,
          role_id: roleRecord.id
        });
      }

      // Generate email verification token
      const verificationToken = this.generateEmailToken(userId);

      // Send verification email
      if (process.env.NODE_ENV === 'production') {
        await emailService.sendVerificationEmail(email, verificationToken, displayName);
      }

      logger.auth('User registered successfully', {
        userId,
        email,
        role
      });

      return {
        user: {
          id: userId,
          email,
          emailVerified: false,
          role
        },
        message: 'Registration successful. Please check your email for verification.'
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Sign in user with email and password
   */
  async signIn(email, password, deviceInfo = {}) {
    try {
      // Get user
      const user = await dbUtils.getRecord(
        'users',
        'email = @email',
        { email: email.toLowerCase() }
      );

      if (!user) {
        await this.handleFailedLogin(email, 'user_not_found');
        throw new Error('Invalid email or password');
      }

      // Check if account is banned
      if (user.banned_until && new Date(user.banned_until) > new Date()) {
        throw new Error(`Account temporarily banned until ${user.banned_until}`);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        await this.handleFailedLogin(email, 'invalid_password');
        throw new Error('Invalid email or password');
      }

      // Check email verification
      if (!user.email_verified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
        throw new Error('Please verify your email before signing in');
      }

      // Get user role
      const userRole = await dbUtils.getRecord(
        'user_roles ur INNER JOIN app_roles ar ON ur.role_id = ar.id',
        'ur.user_id = @userId',
        { userId: user.id },
        'ar.role_name as role'
      );

      // Create session
      const sessionData = await this.createSession(user.id, deviceInfo);

      // Generate tokens
      const tokens = this.generateTokens(user.id, sessionData.sessionId, userRole?.role || 'user');

      // Update last sign in
      await dbUtils.updateRecord(
        'users',
        { last_sign_in_at: new Date() },
        'id = @userId',
        { userId: user.id }
      );

      logger.auth('User signed in successfully', {
        userId: user.id,
        email: user.email,
        sessionId: sessionData.sessionId
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified,
          role: userRole?.role || 'user'
        },
        tokens,
        session: sessionData
      };
    } catch (error) {
      logger.error('Sign in error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if session exists and is valid
      const session = await dbUtils.getRecord(
        'sessions',
        'id = @sessionId AND user_id = @userId AND expires_at > GETUTCDATE()',
        {
          sessionId: decoded.sessionId,
          userId: decoded.userId
        }
      );

      if (!session) {
        throw new Error('Invalid or expired session');
      }

      // Get user role
      const userRole = await dbUtils.getRecord(
        'user_roles ur INNER JOIN app_roles ar ON ur.role_id = ar.id',
        'ur.user_id = @userId',
        { userId: decoded.userId },
        'ar.role_name as role'
      );

      // Generate new access token
      const accessToken = this.generateAccessToken(
        decoded.userId,
        decoded.sessionId,
        userRole?.role || 'user'
      );

      // Update session timestamp
      await dbUtils.updateRecord(
        'sessions',
        { updated_at: new Date() },
        'id = @sessionId',
        { sessionId: decoded.sessionId }
      );

      logger.auth('Token refreshed successfully', {
        userId: decoded.userId,
        sessionId: decoded.sessionId
      });

      return {
        accessToken,
        refreshToken // Return the same refresh token
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Sign out user
   */
  async signOut(sessionId) {
    try {
      // Delete session
      const deletedRows = await dbUtils.deleteRecord('sessions', 'id = @sessionId', { sessionId });

      if (deletedRows > 0) {
        logger.auth('User signed out successfully', { sessionId });
      }

      return { message: 'Signed out successfully' };
    } catch (error) {
      logger.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Sign out from all devices
   */
  async signOutAll(userId) {
    try {
      // Delete all sessions for the user
      const deletedRows = await dbUtils.deleteRecord('sessions', 'user_id = @userId', { userId });

      logger.auth('User signed out from all devices', { userId, sessionsDeleted: deletedRows });

      return { message: `Signed out from ${deletedRows} devices` };
    } catch (error) {
      logger.error('Sign out all error:', error);
      throw error;
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== 'email_verification') {
        throw new Error('Invalid token type');
      }

      // Update user email verification status
      const updatedUser = await dbUtils.updateRecord(
        'users',
        {
          email_verified: true,
          email_confirmed_at: new Date()
        },
        'id = @userId',
        { userId: decoded.userId }
      );

      if (!updatedUser) {
        throw new Error('User not found');
      }

      logger.auth('Email verified successfully', {
        userId: decoded.userId,
        email: updatedUser.email
      });

      return { message: 'Email verified successfully' };
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    try {
      const user = await dbUtils.getRecord('users', 'email = @email', { email: email.toLowerCase() });

      if (!user) {
        // Don't reveal if email exists or not
        return { message: 'If the email exists, a password reset link has been sent' };
      }

      // Generate reset token
      const resetToken = this.generateResetToken(user.id);

      // Store reset token (you might want to create a password_resets table)
      await dbUtils.updateRecord(
        'users',
        { recovery_token: resetToken, recovery_sent_at: new Date() },
        'id = @userId',
        { userId: user.id }
      );

      // Send reset email
      if (process.env.NODE_ENV === 'production') {
        await emailService.sendPasswordResetEmail(user.email, resetToken);
      }

      logger.auth('Password reset requested', {
        userId: user.id,
        email: user.email
      });

      return { message: 'If the email exists, a password reset link has been sent' };
    } catch (error) {
      logger.error('Forgot password error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      // Validate new password
      this.validatePassword(newPassword);

      // Hash new password
      const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Update password and clear recovery token
      const updatedUser = await dbUtils.updateRecord(
        'users',
        {
          password_hash: passwordHash,
          salt,
          recovery_token: null,
          recovery_sent_at: null,
          updated_at: new Date()
        },
        'id = @userId AND recovery_token = @token',
        { userId: decoded.userId, token }
      );

      if (!updatedUser) {
        throw new Error('Invalid or expired reset token');
      }

      // Sign out from all devices for security
      await this.signOutAll(decoded.userId);

      logger.auth('Password reset successfully', {
        userId: decoded.userId
      });

      return { message: 'Password reset successfully' };
    } catch (error) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Create a new session
   */
  async createSession(userId, deviceInfo = {}) {
    try {
      const sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

      const session = await dbUtils.insertRecord('sessions', {
        id: sessionId,
        user_id: userId,
        access_token: '', // Will be filled by token generation
        refresh_token: '', // Will be filled by token generation
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date()
      });

      return {
        sessionId,
        expiresAt
      };
    } catch (error) {
      logger.error('Create session error:', error);
      throw error;
    }
  }

  /**
   * Generate JWT tokens
   */
  generateTokens(userId, sessionId, role) {
    const accessToken = this.generateAccessToken(userId, sessionId, role);
    const refreshToken = this.generateRefreshToken(userId, sessionId);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m'
    };
  }

  /**
   * Generate access token
   */
  generateAccessToken(userId, sessionId, role) {
    return jwt.sign(
      {
        userId,
        sessionId,
        role,
        type: 'access'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m' }
    );
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId, sessionId) {
    return jwt.sign(
      {
        userId,
        sessionId,
        type: 'refresh'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d' }
    );
  }

  /**
   * Generate email verification token
   */
  generateEmailToken(userId) {
    return jwt.sign(
      {
        userId,
        type: 'email_verification'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EMAIL_TOKEN_EXPIRY || '24h' }
    );
  }

  /**
   * Generate password reset token
   */
  generateResetToken(userId) {
    return jwt.sign(
      {
        userId,
        type: 'password_reset'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_RESET_TOKEN_EXPIRY || '1h' }
    );
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH) || 8;

    if (password.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters long`);
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    return true;
  }

  /**
   * Handle failed login attempts
   */
  async handleFailedLogin(email, reason) {
    try {
      logger.security('Failed login attempt', {
        email,
        reason,
        timestamp: new Date().toISOString()
      });

      // You could implement account lockout logic here
      // For example, lock account after 5 failed attempts
    } catch (error) {
      logger.error('Failed login handler error:', error);
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId) {
    try {
      const sessions = await dbUtils.getRecords(
        'sessions',
        'user_id = @userId AND expires_at > GETUTCDATE()',
        { userId },
        {
          columns: 'id, created_at, updated_at, expires_at',
          orderBy: 'updated_at DESC'
        }
      );

      return sessions;
    } catch (error) {
      logger.error('Get user sessions error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();