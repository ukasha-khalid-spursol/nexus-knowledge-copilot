# Nexus Knowledge Copilot Backend API Documentation

## Overview

This is a comprehensive Node.js backend API that replaces Supabase for the Nexus Knowledge Copilot application. It provides authentication, user management, and integration services with Azure SQL Server.

## Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Azure SQL Server
- **Authentication**: JWT with refresh tokens
- **Logging**: Winston
- **Validation**: Joi + Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **File Processing**: Multer, Sharp

### Project Structure
```
backend/
├── src/
│   ├── controllers/        # Request handlers
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   ├── routes/           # API route definitions
│   ├── utils/            # Utility functions
│   ├── config/           # Configuration files
│   └── migrations/       # Database migrations
├── logs/                 # Application logs
├── uploads/              # File uploads
├── package.json
└── server.js            # Entry point
```

## API Endpoints

### Base URL
- **Development**: `http://localhost:3001/api`
- **Production**: `https://your-azure-vm.cloudapp.azure.com/api`

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "displayName": "John Doe",
  "role": "user"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": false,
    "role": "user"
  },
  "message": "Registration successful. Please check your email for verification."
}
```

**Status Codes:**
- `201` - Created
- `400` - Invalid input
- `409` - User already exists

---

### POST /auth/login
Sign in with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": true,
    "role": "user"
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "jwt-refresh-token",
    "tokenType": "Bearer",
    "expiresIn": "15m"
  },
  "session": {
    "sessionId": "uuid",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Invalid credentials
- `403` - Account banned/unverified

---

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:**
```json
{
  "accessToken": "new-jwt-token",
  "refreshToken": "same-refresh-token"
}
```

**Status Codes:**
- `200` - Success
- `401` - Invalid/expired refresh token

---

### POST /auth/logout
Sign out from current session.

**Headers:**
```
Authorization: Bearer jwt-token
```

**Response:**
```json
{
  "message": "Signed out successfully"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

### POST /auth/logout-all
Sign out from all devices/sessions.

**Headers:**
```
Authorization: Bearer jwt-token
```

**Response:**
```json
{
  "message": "Signed out from 3 devices"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

### POST /auth/forgot-password
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the email exists, a password reset link has been sent"
}
```

**Status Codes:**
- `200` - Always returns success for security

---

### POST /auth/reset-password
Reset password with token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid token or weak password

---

### POST /auth/verify-email
Verify email address with token.

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response:**
```json
{
  "message": "Email verified successfully"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid token

---

## User Management Endpoints

### GET /user/profile
Get current user's profile.

**Headers:**
```
Authorization: Bearer jwt-token
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "emailVerified": true,
  "profile": {
    "displayName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "bio": "Software developer"
  },
  "role": "user",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

### PUT /user/profile
Update user profile.

**Headers:**
```
Authorization: Bearer jwt-token
```

**Request Body:**
```json
{
  "displayName": "Jane Doe",
  "bio": "Updated bio"
}
```

**Response:**
```json
{
  "profile": {
    "id": "uuid",
    "displayName": "Jane Doe",
    "bio": "Updated bio",
    "avatarUrl": "https://example.com/avatar.jpg",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid input
- `401` - Unauthorized

---

### PUT /user/password
Change user password.

**Headers:**
```
Authorization: Bearer jwt-token
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

**Response:**
```json
{
  "message": "Password updated successfully"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid current password
- `401` - Unauthorized

---

### GET /user/sessions
Get active sessions for current user.

**Headers:**
```
Authorization: Bearer jwt-token
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "expiresAt": "2024-01-08T00:00:00.000Z",
      "current": true
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

### DELETE /user/sessions/:sessionId
Revoke a specific session.

**Headers:**
```
Authorization: Bearer jwt-token
```

**Response:**
```json
{
  "message": "Session revoked successfully"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `404` - Session not found

---

## Canva Integration Endpoints

### POST /canva/connect
Connect user's Canva account via OAuth.

**Headers:**
```
Authorization: Bearer jwt-token
```

**Request Body:**
```json
{
  "code": "oauth-authorization-code",
  "state": "oauth-state"
}
```

**Response:**
```json
{
  "integration": {
    "id": "uuid",
    "canvaUserId": "canva-user-id",
    "canvaDisplayName": "John Doe",
    "canvaEmail": "john@example.com",
    "status": "active",
    "connectedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid OAuth code
- `401` - Unauthorized

---

### GET /canva/designs
Get user's Canva designs.

**Headers:**
```
Authorization: Bearer jwt-token
```

**Query Parameters:**
- `search` - Search term for design titles
- `type` - Design type filter
- `limit` - Number of results (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "designs": [
    {
      "id": "uuid",
      "canvaDesignId": "canva-id",
      "title": "My Presentation",
      "designType": "presentation",
      "thumbnailUrl": "https://canva.com/thumb.jpg",
      "editUrl": "https://canva.com/edit",
      "viewUrl": "https://canva.com/view",
      "isOwner": true,
      "canEdit": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 50
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - No Canva integration

---

### POST /canva/designs
Create a new Canva design.

**Headers:**
```
Authorization: Bearer jwt-token
```

**Request Body:**
```json
{
  "title": "New Design",
  "designType": "presentation",
  "templateId": "template-id"
}
```

**Response:**
```json
{
  "design": {
    "id": "uuid",
    "canvaDesignId": "canva-id",
    "title": "New Design",
    "designType": "presentation",
    "thumbnailUrl": "https://canva.com/thumb.jpg",
    "editUrl": "https://canva.com/edit",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `201` - Created
- `400` - Invalid input
- `401` - Unauthorized
- `403` - No Canva integration

---

### POST /canva/designs/ai-generate
Generate design using AI prompt.

**Headers:**
```
Authorization: Bearer jwt-token
```

**Request Body:**
```json
{
  "prompt": "Create a presentation about renewable energy",
  "designType": "presentation",
  "autoLayout": true
}
```

**Response:**
```json
{
  "design": {
    "id": "uuid",
    "canvaDesignId": "canva-id",
    "title": "AI: Create a presentation about...",
    "designType": "presentation",
    "thumbnailUrl": "https://canva.com/thumb.jpg",
    "editUrl": "https://canva.com/edit",
    "generationTimeMs": 3500,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `201` - Created
- `400` - Invalid input
- `401` - Unauthorized
- `403` - No Canva integration

---

### GET /canva/templates
Search Canva templates.

**Query Parameters:**
- `search` - Search term
- `type` - Design type filter
- `premium` - Filter by premium status (true/false)
- `limit` - Number of results (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "canvaTemplateId": "template-id",
      "title": "Business Presentation",
      "description": "Professional template",
      "designType": "presentation",
      "thumbnailUrl": "https://canva.com/template.jpg",
      "isPremium": false,
      "popularityScore": 95,
      "categories": ["business", "professional"],
      "keywords": ["presentation", "business"]
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 100
  }
}
```

**Status Codes:**
- `200` - Success

---

### POST /canva/designs/:id/export
Export a Canva design.

**Headers:**
```
Authorization: Bearer jwt-token
```

**Request Body:**
```json
{
  "format": "pdf",
  "quality": "high",
  "pages": [1, 2, 3]
}
```

**Response:**
```json
{
  "export": {
    "id": "uuid",
    "canvaExportId": "export-id",
    "format": "pdf",
    "quality": "high",
    "status": "processing",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `202` - Accepted (processing)
- `400` - Invalid input
- `401` - Unauthorized
- `404` - Design not found

---

### GET /canva/exports/:id
Get export status and download URL.

**Headers:**
```
Authorization: Bearer jwt-token
```

**Response:**
```json
{
  "export": {
    "id": "uuid",
    "status": "completed",
    "downloadUrl": "https://canva.com/download/abc123",
    "expiresAt": "2024-01-02T00:00:00.000Z",
    "format": "pdf",
    "quality": "high",
    "completedAt": "2024-01-01T00:01:00.000Z"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `404` - Export not found

---

## Health Check Endpoints

### GET /health
Basic health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

**Status Codes:**
- `200` - Healthy
- `503` - Unhealthy

---

### GET /health/detailed
Detailed health check including database status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": "15ms",
      "connectionCount": 5
    },
    "redis": {
      "status": "healthy",
      "responseTime": "2ms"
    },
    "email": {
      "status": "healthy"
    }
  },
  "system": {
    "uptime": "24h 15m 30s",
    "memory": {
      "used": "120MB",
      "total": "512MB"
    },
    "cpu": "15%"
  }
}
```

**Status Codes:**
- `200` - All services healthy
- `503` - One or more services unhealthy

---

## Error Responses

All API endpoints may return these common error responses:

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 401 Unauthorized
```json
{
  "error": "Access token required",
  "code": "TOKEN_MISSING",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": "admin",
  "current": "user",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "code": "NOT_FOUND",
  "path": "/api/unknown",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests from this IP, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 900,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "requestId": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Authentication

### JWT Token Format
Access tokens contain the following claims:
```json
{
  "userId": "uuid",
  "sessionId": "uuid",
  "role": "user|admin",
  "type": "access",
  "iat": 1704067200,
  "exp": 1704068100
}
```

### Authorization Header
Include the access token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiry
- **Access Token**: 15 minutes
- **Refresh Token**: 7 days
- **Email Verification**: 24 hours
- **Password Reset**: 1 hour

---

## Rate Limiting

### Global Limits
- **General API**: 1000 requests per 15 minutes per IP
- **Authentication**: 10 requests per 15 minutes per IP

### User Limits
- **Login Attempts**: 5 per email per 15 minutes
- **Password Reset**: 3 per email per hour
- **Email Verification**: 5 per email per hour

---

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Security Headers
- HTTPS enforcement
- XSS protection
- CSRF protection
- Content Security Policy
- CORS configuration

### Audit Logging
All security-related events are logged:
- Login attempts (success/failure)
- Password changes
- Email verifications
- Permission violations
- Suspicious activities

---

This API documentation provides a comprehensive overview of all available endpoints and their usage patterns for the Nexus Knowledge Copilot backend system.