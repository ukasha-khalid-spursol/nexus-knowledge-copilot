# Authentication Migration Strategy
## From Supabase Auth to Custom Node.js + Azure SQL Server

### Current Authentication Analysis

#### Current Supabase Auth Implementation:
- **Client**: `@supabase/supabase-js` with Supabase client configuration
- **Authentication Methods**: Email/password signup and login
- **Session Management**: JWT tokens with automatic refresh
- **User State**: Managed through `supabase.auth.onAuthStateChange()`
- **Role-Based Access**: Custom role system (`admin`/`user`) stored in `user_roles` table
- **Profile Management**: Additional user data in `profiles` table
- **Current Dependencies**:
  - Supabase Auth handles password hashing, session management, email verification
  - localStorage persistence for tokens
  - Automatic token refresh

#### Current Frontend Integration Points:
1. **Auth.tsx**: Sign-up and sign-in forms
2. **useUserRole.tsx**: Role fetching and caching hook
3. **Navbar.tsx**: Auth state and role-based navigation
4. **App.tsx**: Route protection (implicit through navigation)
5. **All components**: Access to `supabase.auth.getUser()` and session

---

### Migration Strategy Overview

#### Phase 1: Backend API Development
#### Phase 2: Frontend Authentication Client
#### Phase 3: Data Migration
#### Phase 4: Gradual Cutover
#### Phase 5: Cleanup and Optimization

---

## Phase 1: Node.js Backend API Architecture

### 1.1 Technology Stack

```javascript
// Core Dependencies
{
  "express": "^4.18.2",           // Web framework
  "bcryptjs": "^2.4.3",          // Password hashing
  "jsonwebtoken": "^9.0.0",      // JWT tokens
  "mssql": "^9.1.1",             // SQL Server driver
  "cors": "^2.8.5",              // CORS middleware
  "helmet": "^7.0.0",            // Security headers
  "express-rate-limit": "^6.7.0", // Rate limiting
  "joi": "^17.9.2",              // Request validation
  "nodemailer": "^6.9.3",        // Email service
  "crypto": "built-in",           // Token generation
  "express-session": "^1.17.3",  // Session management
  "connect-session-sequelize": "^7.1.6" // Session store
}
```

### 1.2 Project Structure

```
backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   └── profile.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── validation.middleware.js
│   │   ├── rbac.middleware.js
│   │   └── errorHandler.middleware.js
│   ├── models/
│   │   ├── User.model.js
│   │   ├── Session.model.js
│   │   └── Profile.model.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── token.service.js
│   │   ├── email.service.js
│   │   └── encryption.service.js
│   ├── utils/
│   │   ├── database.js
│   │   ├── logger.js
│   │   └── constants.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   └── protected.routes.js
│   ├── config/
│   │   ├── database.config.js
│   │   ├── auth.config.js
│   │   └── email.config.js
│   └── app.js
├── package.json
└── server.js
```

### 1.3 Core Authentication API Endpoints

```javascript
// AUTH ROUTES (/api/auth)
POST   /register          // User registration
POST   /login             // User login
POST   /logout            // User logout
POST   /refresh-token     // Refresh access token
POST   /forgot-password   // Request password reset
POST   /reset-password    // Reset password with token
POST   /verify-email      // Verify email address
POST   /resend-verification // Resend verification email

// USER ROUTES (/api/user) - Protected
GET    /profile           // Get user profile
PUT    /profile           // Update user profile
GET    /role              // Get user role
PUT    /password          // Change password
DELETE /account           // Delete account

// SESSION ROUTES (/api/sessions) - Protected
GET    /                  // List active sessions
DELETE /:sessionId        // Revoke specific session
DELETE /all               // Revoke all sessions
```

### 1.4 Authentication Service Implementation

```javascript
// auth.service.js
class AuthService {
  async register(userData) {
    // 1. Validate input data
    // 2. Check if user exists
    // 3. Hash password with bcrypt
    // 4. Create user in database
    // 5. Create default profile
    // 6. Assign default role
    // 7. Send verification email
    // 8. Return success response (no tokens until verified)
  }

  async login(email, password) {
    // 1. Find user by email
    // 2. Check if account is verified
    // 3. Verify password
    // 4. Generate access & refresh tokens
    // 5. Create session record
    // 6. Return tokens and user data
  }

  async refreshToken(refreshToken) {
    // 1. Verify refresh token
    // 2. Check session validity
    // 3. Generate new access token
    // 4. Update session
    // 5. Return new access token
  }

  async logout(sessionId) {
    // 1. Invalidate session
    // 2. Add token to blacklist (optional)
    // 3. Return success
  }
}
```

### 1.5 JWT Token Strategy

```javascript
// Token Configuration
const ACCESS_TOKEN_EXPIRY = '15m';    // Short-lived
const REFRESH_TOKEN_EXPIRY = '7d';    // Longer-lived
const EMAIL_TOKEN_EXPIRY = '24h';     // Email verification
const RESET_TOKEN_EXPIRY = '1h';      // Password reset

// Token Payload Structure
{
  // Access Token
  userId: 'uuid',
  email: 'user@example.com',
  role: 'admin|user',
  sessionId: 'uuid',
  type: 'access',
  iat: timestamp,
  exp: timestamp
}

{
  // Refresh Token
  userId: 'uuid',
  sessionId: 'uuid',
  type: 'refresh',
  iat: timestamp,
  exp: timestamp
}
```

### 1.6 Security Implementation

```javascript
// Password Security
- bcrypt with salt rounds: 12
- Minimum password requirements: 8 chars, 1 uppercase, 1 lowercase, 1 number
- Password history: prevent reuse of last 5 passwords

// Rate Limiting
- Login attempts: 5 per IP per 15 minutes
- Registration: 3 per IP per hour
- Password reset: 3 per IP per hour
- API calls: 100 per IP per 15 minutes

// Security Headers (helmet.js)
- HTTPS enforcement
- XSS protection
- CORS configuration
- Content Security Policy

// Session Security
- HttpOnly cookies for refresh tokens
- Secure flag in production
- SameSite=Strict
- Session rotation on privilege escalation
```

---

## Phase 2: Frontend Authentication Client

### 2.1 Custom Auth Client Implementation

```typescript
// src/services/auth/AuthClient.ts
export class AuthClient {
  private apiUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: User | null = null;
  private authStateListeners: AuthStateListener[] = [];

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
    this.loadTokensFromStorage();
  }

  // Core Authentication Methods
  async signUp(email: string, password: string, userData: SignUpData): Promise<AuthResponse>
  async signIn(email: string, password: string): Promise<AuthResponse>
  async signOut(): Promise<void>
  async refreshSession(): Promise<AuthResponse>

  // User Management
  async getUser(): Promise<User | null>
  async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile>
  async changePassword(currentPassword: string, newPassword: string): Promise<void>

  // Email Verification
  async verifyEmail(token: string): Promise<void>
  async resendVerification(): Promise<void>

  // Password Reset
  async forgotPassword(email: string): Promise<void>
  async resetPassword(token: string, newPassword: string): Promise<void>

  // Session Management
  async getSessions(): Promise<Session[]>
  async revokeSession(sessionId: string): Promise<void>
  async revokeAllSessions(): Promise<void>

  // Auth State Management
  onAuthStateChange(callback: AuthStateListener): () => void

  // Token Management
  private async refreshAccessToken(): Promise<string>
  private storeTokens(accessToken: string, refreshToken: string): void
  private clearTokens(): void
}
```

### 2.2 React Hooks Migration

```typescript
// src/hooks/useAuth.tsx - Replaces Supabase auth
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authClient.onAuthStateChange((authState) => {
      setUser(authState.user);
      setSession(authState.session);
      setLoading(false);
    });

    // Initial auth state check
    authClient.getUser().then((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    session,
    loading,
    signUp: authClient.signUp.bind(authClient),
    signIn: authClient.signIn.bind(authClient),
    signOut: authClient.signOut.bind(authClient),
    updateProfile: authClient.updateProfile.bind(authClient)
  };
};

// src/hooks/useUserRole.tsx - Updated for new backend
export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    // Role is now included in the JWT token payload
    setRole(user.role as UserRole);
    setLoading(false);
  }, [user]);

  return { role, loading, isAdmin: role === 'admin' };
};
```

### 2.3 Component Updates

```typescript
// src/components/ProtectedRoute.tsx - New component for route protection
export const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
        return;
      }

      if (requiredRole && role !== requiredRole && role !== 'admin') {
        navigate('/unauthorized');
        return;
      }
    }
  }, [user, loading, role, requiredRole, navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  if (requiredRole && role !== requiredRole && role !== 'admin') {
    return null;
  }

  return <>{children}</>;
};

// Updated App.tsx with route protection
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/chat" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />
          <Route path="/integrations" element={
            <ProtectedRoute requiredRole="admin">
              <Integrations />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
```

---

## Phase 3: Data Migration Strategy

### 3.1 User Data Export from Supabase

```sql
-- Export script for Supabase data
-- Run these queries in Supabase SQL editor

-- 1. Export Users (auth.users)
SELECT
    id,
    email,
    email_confirmed_at,
    last_sign_in_at,
    raw_user_meta_data,
    created_at,
    updated_at
FROM auth.users
ORDER BY created_at;

-- 2. Export Profiles
SELECT
    id,
    user_id,
    display_name,
    avatar_url,
    bio,
    created_at,
    updated_at
FROM public.profiles
ORDER BY created_at;

-- 3. Export User Roles
SELECT
    ur.id,
    ur.user_id,
    ur.role,
    u.email
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
ORDER BY ur.user_id;

-- 4. Export Canva Integration Data
SELECT
    ci.id,
    ci.tenant_id,
    ci.user_id,
    u.email,
    ci.canva_user_id,
    ci.canva_display_name,
    ci.canva_email,
    ci.canva_team_id,
    ci.status,
    ci.mcp_enabled,
    ci.created_at,
    ci.updated_at
FROM public.canva_integrations ci
JOIN auth.users u ON ci.user_id = u.id
ORDER BY ci.created_at;
```

### 3.2 Migration Scripts

```javascript
// migration/migrate-users.js
const migrateUsers = async () => {
  const supabaseUsers = await exportSupabaseUsers();

  for (const supabaseUser of supabaseUsers) {
    try {
      // Generate temporary password (users will need to reset)
      const tempPassword = generateSecurePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // Insert into SQL Server
      await db.request()
        .input('id', sql.UniqueIdentifier, supabaseUser.id)
        .input('email', sql.NVarChar, supabaseUser.email)
        .input('password_hash', sql.NVarChar, hashedPassword)
        .input('salt', sql.NVarChar, await bcrypt.genSalt(12))
        .input('email_verified', sql.Bit, !!supabaseUser.email_confirmed_at)
        .input('email_confirmed_at', sql.DateTime2, supabaseUser.email_confirmed_at)
        .input('raw_user_meta_data', sql.NVarChar, JSON.stringify(supabaseUser.raw_user_meta_data))
        .input('created_at', sql.DateTime2, supabaseUser.created_at)
        .input('updated_at', sql.DateTime2, supabaseUser.updated_at)
        .query(`
          INSERT INTO [users] (
            id, email, password_hash, salt, email_verified,
            email_confirmed_at, raw_user_meta_data, created_at, updated_at
          ) VALUES (
            @id, @email, @password_hash, @salt, @email_verified,
            @email_confirmed_at, @raw_user_meta_data, @created_at, @updated_at
          )
        `);

      // Send password reset email
      await emailService.sendPasswordResetForMigration(supabaseUser.email, tempPassword);

      console.log(`✅ Migrated user: ${supabaseUser.email}`);
    } catch (error) {
      console.error(`❌ Failed to migrate user ${supabaseUser.email}:`, error);
    }
  }
};
```

### 3.3 Migration Validation

```javascript
// migration/validate-migration.js
const validateMigration = async () => {
  // 1. Count validation
  const supabaseCount = await getSupabaseUserCount();
  const sqlServerCount = await getSqlServerUserCount();

  if (supabaseCount !== sqlServerCount) {
    throw new Error(`User count mismatch: Supabase=${supabaseCount}, SQL Server=${sqlServerCount}`);
  }

  // 2. Data integrity validation
  const supabaseUsers = await exportSupabaseUsers();
  for (const supabaseUser of supabaseUsers) {
    const sqlServerUser = await getSqlServerUser(supabaseUser.id);

    if (!sqlServerUser) {
      throw new Error(`User not found in SQL Server: ${supabaseUser.email}`);
    }

    // Validate email, timestamps, metadata
    if (sqlServerUser.email !== supabaseUser.email) {
      throw new Error(`Email mismatch for user ${supabaseUser.id}`);
    }
  }

  // 3. Role validation
  const supabaseRoles = await exportSupabaseRoles();
  for (const role of supabaseRoles) {
    const sqlServerRole = await getSqlServerUserRole(role.user_id);
    if (!sqlServerRole || sqlServerRole.role !== role.role) {
      throw new Error(`Role mismatch for user ${role.user_id}`);
    }
  }

  console.log('✅ Migration validation passed!');
};
```

---

## Phase 4: Gradual Cutover Strategy

### 4.1 Parallel Authentication System

```typescript
// Feature flag approach for gradual migration
interface AuthConfig {
  useSupabase: boolean;
  useCustomAuth: boolean;
  migrationMode: 'supabase' | 'dual' | 'custom';
}

// src/services/auth/AuthManager.ts
export class AuthManager {
  private supabaseClient: SupabaseClient;
  private customAuthClient: AuthClient;
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
    this.supabaseClient = createSupabaseClient();
    this.customAuthClient = new AuthClient(API_URL);
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    switch (this.config.migrationMode) {
      case 'supabase':
        return this.supabaseClient.auth.signInWithPassword({ email, password });

      case 'dual':
        // Try custom auth first, fallback to Supabase
        try {
          return await this.customAuthClient.signIn(email, password);
        } catch (error) {
          console.log('Custom auth failed, trying Supabase:', error);
          return this.supabaseClient.auth.signInWithPassword({ email, password });
        }

      case 'custom':
        return this.customAuthClient.signIn(email, password);

      default:
        throw new Error('Invalid migration mode');
    }
  }
}
```

### 4.2 Environment-Based Configuration

```typescript
// src/config/auth.config.ts
export const authConfig: AuthConfig = {
  migrationMode: (process.env.REACT_APP_AUTH_MODE as any) || 'supabase',
  customAuthApiUrl: process.env.REACT_APP_CUSTOM_AUTH_API_URL || 'http://localhost:3001/api',
  supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
  supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY,
};

// Environment variables for different stages:
// .env.development
REACT_APP_AUTH_MODE=supabase

// .env.staging
REACT_APP_AUTH_MODE=dual

// .env.production
REACT_APP_AUTH_MODE=custom
```

### 4.3 Rollback Strategy

```typescript
// src/services/auth/RollbackManager.ts
export class RollbackManager {
  static async rollbackToSupabase(): Promise<void> {
    // 1. Update environment configuration
    // 2. Clear custom auth tokens
    // 3. Force page refresh to reload with Supabase
    // 4. Notify monitoring systems

    localStorage.removeItem('custom_auth_access_token');
    localStorage.removeItem('custom_auth_refresh_token');

    // Update config
    window.location.href = window.location.href + '?auth_mode=supabase';
  }

  static async emergencyRollback(): Promise<void> {
    // Immediate rollback for critical issues
    console.error('Emergency rollback initiated');
    await this.rollbackToSupabase();
  }
}
```

---

## Phase 5: Monitoring and Optimization

### 5.1 Authentication Metrics

```javascript
// monitoring/auth-metrics.js
const authMetrics = {
  // Performance Metrics
  loginLatency: 'avg_login_response_time_ms',
  tokenRefreshLatency: 'avg_token_refresh_time_ms',

  // Success Metrics
  loginSuccessRate: 'login_success_rate_percent',
  registrationSuccessRate: 'registration_success_rate_percent',

  // Security Metrics
  failedLoginAttempts: 'failed_login_attempts_count',
  passwordResetRequests: 'password_reset_requests_count',
  suspiciousActivity: 'suspicious_activity_alerts_count',

  // Business Metrics
  dailyActiveUsers: 'daily_active_users_count',
  newRegistrations: 'new_registrations_count',
  sessionDuration: 'avg_session_duration_minutes'
};
```

### 5.2 Performance Optimization

```javascript
// Performance optimization strategies
const optimizations = {
  // Database
  connectionPooling: 'Implement connection pooling for SQL Server',
  indexOptimization: 'Create indexes on frequently queried fields',
  queryOptimization: 'Use stored procedures for complex operations',

  // Caching
  tokenCaching: 'Cache user roles and permissions in Redis',
  sessionCaching: 'Cache active sessions for faster validation',

  // API
  rateLimiting: 'Implement intelligent rate limiting',
  responseCompression: 'Enable gzip compression',
  cdnIntegration: 'Use CDN for static auth assets',

  // Security
  tokenRotation: 'Implement automatic token rotation',
  sessionManagement: 'Clean up expired sessions regularly',
  auditLogging: 'Log all authentication events'
};
```

---

## Implementation Timeline

### Week 1-2: Backend Development
- Set up Node.js backend with Express
- Implement core authentication endpoints
- Set up Azure SQL Server connection
- Implement JWT token management
- Basic security middleware

### Week 3: Advanced Backend Features
- Role-based access control
- Email verification system
- Password reset functionality
- Session management
- Rate limiting and security

### Week 4: Frontend Migration
- Develop custom auth client
- Create new React hooks
- Update components to use new auth system
- Implement route protection

### Week 5: Testing and Data Migration
- Unit and integration testing
- Data migration scripts
- Migration validation
- Performance testing

### Week 6: Staging Deployment
- Deploy to Azure VM
- Staging environment testing
- Performance monitoring setup
- Security audit

### Week 7: Gradual Production Rollout
- Feature flag implementation
- Gradual user migration
- Monitoring and alerting
- Rollback procedures

### Week 8: Full Cutover and Cleanup
- Complete migration to custom auth
- Remove Supabase dependencies
- Performance optimization
- Documentation and training

---

## Risk Mitigation

### Critical Risks:
1. **Data Loss**: Comprehensive backup and validation procedures
2. **Authentication Downtime**: Dual system approach with instant rollback
3. **Security Vulnerabilities**: Security audit and penetration testing
4. **User Experience Disruption**: Gradual migration with user communication
5. **Performance Degradation**: Load testing and performance monitoring

### Rollback Triggers:
- Login failure rate > 5%
- API response time > 2 seconds
- Database connection failures
- Security breach detection
- User experience complaints > threshold

### Success Criteria:
- 99.9% authentication availability
- Sub-500ms average login response time
- Zero data loss during migration
- User satisfaction maintained
- Successful security audit
- Cost reduction achieved vs Supabase

---

This comprehensive migration strategy provides a safe, gradual path from Supabase Auth to a custom Node.js authentication system with Azure SQL Server, ensuring minimal disruption while achieving the desired infrastructure goals.