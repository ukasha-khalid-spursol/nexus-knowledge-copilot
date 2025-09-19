# Canva MCP Integration - Testing & Validation Guide

This guide provides comprehensive instructions for testing and validating the Canva MCP (Model Context Protocol) server integration in the Knowledge Integration Copilot project.

## Overview

The Canva integration enables AI-powered design creation through:
- **Canva Connect API** - Direct REST API integration for design operations
- **Canva MCP Server** - WebSocket-based protocol for AI-driven design generation
- **Chat Interface** - Natural language design requests and management
- **OAuth Integration** - Secure authentication with Canva accounts

## Prerequisites

### 1. Environment Setup

#### Node.js and Dependencies
```bash
# Ensure Node.js 18+ is installed
node --version

# Install project dependencies
npm install

# Verify Canva-related packages are installed
npm list @canva/cli ws canvas sharp @types/ws
```

#### Database Setup
```bash
# Apply database migrations
npx supabase migration up

# Verify tables were created
npx supabase db diff --schema public
```

### 2. Canva Developer Account Setup

#### Create Canva App
1. Visit [Canva Developers](https://www.canva.com/developers/)
2. Create a new application
3. Configure OAuth redirect URLs:
   - Development: `http://localhost:3003/auth/canva/callback`
   - Production: `https://yourdomain.com/auth/canva/callback`

#### Required Permissions
Ensure your Canva app has these scopes:
- `design:read` - Read design information
- `design:write` - Create and modify designs
- `design:content:read` - Access design content
- `asset:read` - Read user assets
- `asset:write` - Upload and manage assets

### 3. Environment Configuration

Create/update your `.env` file:
```bash
# Canva OAuth Configuration
CANVA_CLIENT_ID=your_canva_client_id
CANVA_CLIENT_SECRET=your_canva_client_secret
CANVA_REDIRECT_URI=http://localhost:3003/auth/canva/callback

# Canva MCP Server
CANVA_MCP_SERVER_URL=ws://localhost:3001/mcp
CANVA_MCP_API_KEY=your_mcp_api_key

# Supabase Configuration (existing)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing Instructions

### Phase 1: Frontend Integration Testing

#### 1.1 Start Development Server
```bash
npm run dev
```
Verify the server starts on `http://localhost:3003`

#### 1.2 Test Integrations Page
1. Navigate to `/integrations`
2. **Expected Results:**
   - Four integration cards: Jira, Confluence, Sourcegraph, **Canva**
   - Canva card shows "Disconnected" status
   - Card has purple Palette icon
   - Layout is 2x2 grid

#### 1.3 Test Canva Integration Card
1. Click "Connect to Canva" button
2. **Expected Results:**
   - Toast notification about OAuth requirement
   - After 2 seconds: Demo connection established
   - Card status changes to "Connected"
   - User info displays: "Demo User" and "demo@example.com"
   - MCP Server toggle becomes available

#### 1.4 Test MCP Server Connection
1. Toggle "MCP Server" switch ON
2. **Expected Results:**
   - Status shows "Connecting..."
   - After connection attempt: Either "Connected" or "Connection Error"
   - If error: Red message about server not running on localhost:3001

### Phase 2: Chat Interface Testing

#### 2.1 Test Design-Related Queries
1. Navigate to `/chat`
2. Try these test queries:

**Basic Design Help:**
```
Query: "I need help creating designs"
Expected: Design capabilities explanation + Design Actions component
```

**Presentation Request:**
```
Query: "Create a presentation about our Q1 roadmap"
Expected: Presentation-specific response + Design Actions component
```

**Generic Design Query:**
```
Query: "Can you help me design something?"
Expected: Design response with template sources + Design Actions
```

#### 2.2 Test Design Actions Component
1. When Design Actions component appears:
   - **Design Type Selector** - Should show all 12 design types
   - **Title Input** - Optional title field
   - **Create Blank Design** - Button should be enabled
   - **Generate with AI** - Opens dialog
   - **Template Search** - Input and search button

#### 2.3 Test AI Generation Dialog
1. Click "Generate with AI"
2. **Expected Results:**
   - Modal opens with description textarea
   - Shows current design type badge
   - "Generate Design" button enabled when text entered
   - Simulates design generation (demo mode)

#### 2.4 Test Template Search
1. Enter search term (e.g., "business")
2. Click search button
3. **Expected Results:**
   - Loading state
   - Template dialog opens with results
   - Templates show thumbnails, titles, and premium badges
   - Clicking template simulates design creation

### Phase 3: Component Integration Testing

#### 3.1 Test CanvaDesignPreview Component
1. Create a mock design response
2. **Expected Results:**
   - Design preview card with thumbnail
   - Title and design type badge
   - Quick action buttons (Edit, Share, External link)
   - Dropdown menu with export options
   - Metadata display (creation date, dimensions, tags)

#### 3.2 Test Design State Management
1. Create multiple designs through chat
2. **Expected Results:**
   - Each design gets its own preview card
   - Cards are interactive and functional
   - Export states work correctly
   - Share functionality triggers clipboard copy

### Phase 4: Database Schema Validation

#### 4.1 Verify Table Creation
```sql
-- Connect to your Supabase database and run:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'canva_%';

-- Expected tables:
-- canva_integrations
-- canva_designs
-- canva_templates
-- canva_exports
-- canva_chat_interactions
```

#### 4.2 Test RLS Policies
```sql
-- Test user isolation (run as different users)
SELECT * FROM canva_integrations; -- Should only see own integrations
SELECT * FROM canva_designs; -- Should only see designs from own integrations
SELECT * FROM canva_templates; -- Should see all (public)
```

#### 4.3 Test Helper Functions
```sql
-- Test helper functions
SELECT public.has_canva_integration('user-uuid-here');
SELECT * FROM public.search_canva_designs('user-uuid-here', 'business');
SELECT * FROM public.search_canva_templates('presentation');
```

### Phase 5: Real Canva MCP Server Testing

#### 5.1 Install Canva MCP Server
```bash
# Install Canva MCP Server (when available)
npm install -g @canva/mcp-server

# Or clone and build from source
git clone https://github.com/canva/mcp-server
cd mcp-server
npm install
npm run build
```

#### 5.2 Start MCP Server
```bash
# Start the MCP server
canva-mcp-server --port 3001 --api-key YOUR_CANVA_API_KEY

# Or if built from source
npm start -- --port 3001
```

#### 5.3 Test Real MCP Connection
1. Ensure MCP server is running on port 3001
2. In app: Enable MCP Server toggle
3. **Expected Results:**
   - Connection successful
   - "Connected" status with green indicator
   - Can create real designs through chat

#### 5.4 Test Real Design Creation
```
Query: "Create a professional presentation about AI trends"
Expected: Real Canva design created via MCP server
```

## Validation Checklist

### ✅ Frontend Validation
- [ ] All TypeScript types compile without errors
- [ ] No console errors in browser
- [ ] All components render correctly
- [ ] Integration card states work properly
- [ ] Chat interface handles design queries
- [ ] Design actions component functions
- [ ] Design previews display correctly
- [ ] Responsive design works on mobile

### ✅ Backend Validation
- [ ] Database migrations apply successfully
- [ ] All tables created with correct schema
- [ ] RLS policies enforce proper access control
- [ ] Helper functions return expected results
- [ ] Indexes created for performance
- [ ] Sample templates inserted correctly

### ✅ Integration Validation
- [ ] Canva OAuth flow works (when implemented)
- [ ] MCP server connection establishes
- [ ] WebSocket communication functions
- [ ] Design creation through MCP works
- [ ] Export functionality operates
- [ ] Error handling works properly
- [ ] Reconnection logic functions

### ✅ Security Validation
- [ ] OAuth tokens stored securely (encrypted)
- [ ] RLS prevents cross-user data access
- [ ] API keys not exposed in frontend
- [ ] CORS configured properly
- [ ] Input validation prevents injection
- [ ] Error messages don't leak sensitive data

## Troubleshooting

### Common Issues

#### 1. MCP Server Connection Fails
**Problem:** "Connection Error" when enabling MCP server
**Solutions:**
- Check if MCP server is running on port 3001
- Verify WebSocket connection not blocked by firewall
- Check server logs for error messages
- Try different port if 3001 is in use

#### 2. OAuth Redirect Issues
**Problem:** OAuth flow fails or redirects to wrong URL
**Solutions:**
- Verify redirect URI in Canva app settings
- Check environment variables are set correctly
- Ensure URL encoding is proper
- Test with correct development/production URLs

#### 3. Database Migration Errors
**Problem:** Migration fails or tables not created
**Solutions:**
- Check Supabase connection
- Verify user has proper database permissions
- Run migrations individually to isolate issues
- Check for naming conflicts with existing tables

#### 4. Type Compilation Errors
**Problem:** TypeScript errors in build
**Solutions:**
- Verify all type imports are correct
- Check for circular dependencies
- Run `npm run build` to see full error details
- Update @types packages if needed

### Performance Optimization

#### 1. Database Indexing
```sql
-- Add additional indexes if needed
CREATE INDEX CONCURRENTLY idx_canva_designs_search
ON canva_designs USING gin(to_tsvector('english', title));

CREATE INDEX CONCURRENTLY idx_canva_templates_search
ON canva_templates USING gin(to_tsvector('english', title || ' ' || description));
```

#### 2. Component Optimization
- Use React.memo for expensive components
- Implement virtualization for large design lists
- Cache design thumbnails in browser storage
- Debounce search inputs

#### 3. API Rate Limiting
- Implement request queuing for Canva API
- Add exponential backoff for failed requests
- Cache template data to reduce API calls
- Use webhooks for real-time updates when available

## Production Deployment

### 1. Environment Setup
```bash
# Production environment variables
CANVA_CLIENT_ID=prod_client_id
CANVA_CLIENT_SECRET=prod_client_secret
CANVA_REDIRECT_URI=https://yourdomain.com/auth/canva/callback
CANVA_MCP_SERVER_URL=wss://your-mcp-server.com/mcp
```

### 2. Security Considerations
- Enable SSL/TLS for all connections
- Use secure cookie settings for sessions
- Implement rate limiting on API endpoints
- Set up monitoring and alerting
- Regular security audits of dependencies

### 3. Monitoring
- Track MCP server uptime and response times
- Monitor Canva API rate limit usage
- Log design creation and export metrics
- Set up error tracking (Sentry, etc.)
- Monitor database performance

## Support and Resources

### Documentation
- [Canva Connect API](https://www.canva.com/developers/docs/connect-api/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Supabase Documentation](https://supabase.com/docs)

### Community
- [Canva Developers Community](https://community.canva.com/developers)
- [MCP GitHub Repository](https://github.com/modelcontextprotocol)

### Contact
For issues specific to this integration, create an issue in the project repository with:
1. Steps to reproduce
2. Expected vs actual behavior
3. Environment details (Node version, browser, OS)
4. Console/server logs
5. Screenshots if applicable

---

**Note:** This integration is currently in demo mode. Real functionality requires:
1. Valid Canva Developer account and app
2. Running Canva MCP server
3. Proper OAuth implementation
4. Production environment configuration

The demo mode allows testing of UI/UX flows and components without requiring full backend infrastructure.