-- =====================================================
-- Azure SQL Server Schema Migration
-- From Supabase PostgreSQL to SQL Server 2019+
-- =====================================================

-- Create main database (run separately as master)
-- CREATE DATABASE [NexusKnowledgeCopilot];
-- GO
-- USE [NexusKnowledgeCopilot];
-- GO

-- =====================================================
-- 1. AUTHENTICATION & USER MANAGEMENT SYSTEM
-- =====================================================

-- Create users table to replace Supabase auth.users
CREATE TABLE [dbo].[users] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [email] NVARCHAR(255) NOT NULL UNIQUE,
    [email_verified] BIT NOT NULL DEFAULT 0,
    [password_hash] NVARCHAR(255) NOT NULL, -- bcrypt hash
    [salt] NVARCHAR(100) NOT NULL,
    [phone] NVARCHAR(20) NULL,
    [phone_verified] BIT NOT NULL DEFAULT 0,
    [raw_user_meta_data] NVARCHAR(MAX) NULL, -- JSON string
    [is_super_admin] BIT NOT NULL DEFAULT 0,
    [last_sign_in_at] DATETIME2 NULL,
    [email_confirmed_at] DATETIME2 NULL,
    [phone_confirmed_at] DATETIME2 NULL,
    [confirmation_token] NVARCHAR(255) NULL,
    [confirmation_sent_at] DATETIME2 NULL,
    [recovery_token] NVARCHAR(255) NULL,
    [recovery_sent_at] DATETIME2 NULL,
    [email_change_token] NVARCHAR(255) NULL,
    [email_change] NVARCHAR(255) NULL,
    [email_change_sent_at] DATETIME2 NULL,
    [banned_until] DATETIME2 NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    INDEX [IX_users_email] NONCLUSTERED ([email]),
    INDEX [IX_users_created_at] NONCLUSTERED ([created_at] DESC)
);

-- Create sessions table for JWT management
CREATE TABLE [dbo].[sessions] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [user_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,
    [access_token] NVARCHAR(500) NOT NULL,
    [refresh_token] NVARCHAR(500) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    INDEX [IX_sessions_user_id] NONCLUSTERED ([user_id]),
    INDEX [IX_sessions_expires_at] NONCLUSTERED ([expires_at])
);

-- Create profiles table (equivalent to public.profiles)
CREATE TABLE [dbo].[profiles] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [user_id] UNIQUEIDENTIFIER NOT NULL UNIQUE REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,
    [display_name] NVARCHAR(255) NULL,
    [avatar_url] NVARCHAR(1000) NULL,
    [bio] NVARCHAR(MAX) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    INDEX [IX_profiles_user_id] NONCLUSTERED ([user_id])
);

-- Create user roles lookup table (replaces PostgreSQL enum)
CREATE TABLE [dbo].[app_roles] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [role_name] NVARCHAR(50) NOT NULL UNIQUE,
    [description] NVARCHAR(255) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Insert default roles
INSERT INTO [dbo].[app_roles] ([role_name], [description]) VALUES
    ('admin', 'System administrator with full access'),
    ('user', 'Regular user with standard access');

-- Create user_roles table
CREATE TABLE [dbo].[user_roles] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [user_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,
    [role_id] INT NOT NULL REFERENCES [dbo].[app_roles]([id]),
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UNIQUE ([user_id], [role_id]),
    INDEX [IX_user_roles_user_id] NONCLUSTERED ([user_id]),
    INDEX [IX_user_roles_role_id] NONCLUSTERED ([role_id])
);

-- =====================================================
-- 2. CANVA INTEGRATION SYSTEM
-- =====================================================

-- Create integration status lookup table
CREATE TABLE [dbo].[integration_statuses] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [status_name] NVARCHAR(50) NOT NULL UNIQUE,
    [description] NVARCHAR(255) NULL
);

INSERT INTO [dbo].[integration_statuses] ([status_name], [description]) VALUES
    ('active', 'Integration is active and functioning'),
    ('inactive', 'Integration has been disabled by user'),
    ('error', 'Integration has encountered an error'),
    ('pending', 'Integration is being set up');

-- Create Canva design types lookup table
CREATE TABLE [dbo].[canva_design_types] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [type_name] NVARCHAR(50) NOT NULL UNIQUE,
    [description] NVARCHAR(255) NULL
);

INSERT INTO [dbo].[canva_design_types] ([type_name], [description]) VALUES
    ('presentation', 'Presentation slides'),
    ('document', 'Text documents'),
    ('social_media', 'Social media posts'),
    ('marketing', 'Marketing materials'),
    ('video', 'Video content'),
    ('logo', 'Logo designs'),
    ('poster', 'Poster designs'),
    ('flyer', 'Flyer designs'),
    ('business_card', 'Business card designs'),
    ('resume', 'Resume templates'),
    ('infographic', 'Infographic designs'),
    ('custom', 'Custom design types');

-- Create canva_integrations table
CREATE TABLE [dbo].[canva_integrations] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [tenant_id] UNIQUEIDENTIFIER NOT NULL,
    [user_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,

    -- OAuth credentials (encrypted)
    [access_token_encrypted] NVARCHAR(MAX) NOT NULL,
    [refresh_token_encrypted] NVARCHAR(MAX) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [token_type] NVARCHAR(50) NOT NULL DEFAULT 'Bearer',
    [scope] NVARCHAR(1000) NOT NULL,

    -- Canva user info
    [canva_user_id] NVARCHAR(255) NOT NULL,
    [canva_display_name] NVARCHAR(255) NOT NULL,
    [canva_email] NVARCHAR(255) NOT NULL,
    [canva_team_id] NVARCHAR(255) NULL,

    -- Integration status
    [status_id] INT NOT NULL REFERENCES [dbo].[integration_statuses]([id]) DEFAULT 1, -- active
    [last_sync] DATETIME2 NULL DEFAULT GETUTCDATE(),
    [error_message] NVARCHAR(MAX) NULL,

    -- MCP server connection info
    [mcp_server_url] NVARCHAR(500) DEFAULT 'ws://localhost:3001/mcp',
    [mcp_enabled] BIT NOT NULL DEFAULT 0,
    [mcp_last_connected] DATETIME2 NULL,

    -- Metadata
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    -- Constraints
    UNIQUE ([user_id], [tenant_id]),
    UNIQUE ([canva_user_id], [tenant_id]),
    INDEX [IX_canva_integrations_user_status] NONCLUSTERED ([user_id], [status_id], [expires_at]),
    INDEX [IX_canva_integrations_tenant] NONCLUSTERED ([tenant_id])
);

-- Create canva_designs table
CREATE TABLE [dbo].[canva_designs] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [tenant_id] UNIQUEIDENTIFIER NOT NULL,
    [integration_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[canva_integrations]([id]) ON DELETE CASCADE,

    -- Canva design info
    [canva_design_id] NVARCHAR(255) NOT NULL,
    [title] NVARCHAR(500) NOT NULL,
    [design_type_id] INT NOT NULL REFERENCES [dbo].[canva_design_types]([id]),

    -- URLs and media
    [thumbnail_url] NVARCHAR(1000) NOT NULL,
    [edit_url] NVARCHAR(1000) NOT NULL,
    [view_url] NVARCHAR(1000) NOT NULL,

    -- Permissions and ownership
    [is_owner] BIT NOT NULL DEFAULT 0,
    [can_edit] BIT NOT NULL DEFAULT 0,
    [created_by] NVARCHAR(255) NULL, -- Canva user ID who created it

    -- Design metadata (JSON as NVARCHAR for SQL Server compatibility)
    [tags] NVARCHAR(MAX) NULL, -- JSON array: ["tag1", "tag2"]
    [dimensions] NVARCHAR(MAX) NULL, -- JSON: {"width": 800, "height": 600}

    -- Sync info
    [canva_created_at] DATETIME2 NOT NULL,
    [canva_updated_at] DATETIME2 NOT NULL,
    [last_synced] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    -- Local metadata
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [updated_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    -- Constraints and indexes
    UNIQUE ([canva_design_id], [tenant_id]),
    INDEX [IX_canva_designs_integration_updated] NONCLUSTERED ([integration_id], [canva_updated_at] DESC),
    INDEX [IX_canva_designs_type] NONCLUSTERED ([design_type_id]),
    INDEX [IX_canva_designs_created_by] NONCLUSTERED ([created_by]),
    INDEX [IX_canva_designs_tenant] NONCLUSTERED ([tenant_id])
);

-- Enable Full-Text Search on title for better search performance
CREATE FULLTEXT CATALOG [CanvaSearchCatalog];
CREATE FULLTEXT INDEX ON [dbo].[canva_designs]([title]) KEY INDEX PK__canva_de__3213E83F;

-- Create canva_templates table
CREATE TABLE [dbo].[canva_templates] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,

    -- Canva template info
    [canva_template_id] NVARCHAR(255) NOT NULL UNIQUE,
    [title] NVARCHAR(500) NOT NULL,
    [description] NVARCHAR(MAX) NULL,
    [design_type_id] INT NOT NULL REFERENCES [dbo].[canva_design_types]([id]),

    -- Media
    [thumbnail_url] NVARCHAR(1000) NOT NULL,

    -- Metadata (JSON arrays as NVARCHAR)
    [categories] NVARCHAR(MAX) NULL, -- JSON: ["business", "professional"]
    [keywords] NVARCHAR(MAX) NULL, -- JSON: ["presentation", "business"]
    [is_premium] BIT NOT NULL DEFAULT 0,
    [popularity_score] INT NOT NULL DEFAULT 0,

    -- Sync info
    [indexed_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [last_updated] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    INDEX [IX_canva_templates_type] NONCLUSTERED ([design_type_id]),
    INDEX [IX_canva_templates_premium] NONCLUSTERED ([is_premium]),
    INDEX [IX_canva_templates_popularity] NONCLUSTERED ([popularity_score] DESC)
);

-- Enable Full-Text Search on templates
CREATE FULLTEXT INDEX ON [dbo].[canva_templates]([title], [description]) KEY INDEX PK__canva_te__3213E83F;

-- Create canva_exports table
CREATE TABLE [dbo].[canva_exports] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [tenant_id] UNIQUEIDENTIFIER NOT NULL,
    [user_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,
    [design_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[canva_designs]([id]) ON DELETE CASCADE,

    -- Export details
    [canva_export_id] NVARCHAR(255) NOT NULL UNIQUE,
    [format] NVARCHAR(50) NOT NULL, -- png, jpg, pdf, gif, mp4
    [quality] NVARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high
    [pages] NVARCHAR(MAX) NULL, -- JSON array for multi-page designs

    -- Export status
    [status] NVARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    [download_url] NVARCHAR(1000) NULL,
    [error_message] NVARCHAR(MAX) NULL,

    -- Timestamps
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [completed_at] DATETIME2 NULL,
    [expires_at] DATETIME2 NULL, -- When download URL expires

    INDEX [IX_canva_exports_status] NONCLUSTERED ([status]),
    INDEX [IX_canva_exports_user_created] NONCLUSTERED ([user_id], [created_at] DESC),
    INDEX [IX_canva_exports_tenant] NONCLUSTERED ([tenant_id])
);

-- Create canva_chat_interactions table
CREATE TABLE [dbo].[canva_chat_interactions] (
    [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [tenant_id] UNIQUEIDENTIFIER NOT NULL,
    [user_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,

    -- Chat context
    [conversation_id] UNIQUEIDENTIFIER NULL,
    [message_content] NVARCHAR(MAX) NOT NULL,

    -- Design context
    [design_request] NVARCHAR(MAX) NULL, -- JSON object
    [created_design_id] UNIQUEIDENTIFIER NULL REFERENCES [dbo].[canva_designs]([id]),
    [template_used] NVARCHAR(255) NULL, -- canva_template_id if used

    -- AI generation details
    [ai_prompt] NVARCHAR(MAX) NULL,
    [mcp_request_id] NVARCHAR(255) NULL,
    [generation_time_ms] INT NULL,

    -- Metadata
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    INDEX [IX_canva_chat_user] NONCLUSTERED ([user_id]),
    INDEX [IX_canva_chat_conversation] NONCLUSTERED ([conversation_id]),
    INDEX [IX_canva_chat_created] NONCLUSTERED ([created_at] DESC),
    INDEX [IX_canva_chat_tenant] NONCLUSTERED ([tenant_id])
);

-- =====================================================
-- 3. TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

-- Create trigger for users table
CREATE TRIGGER [trg_users_updated_at]
ON [dbo].[users]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [dbo].[users]
    SET [updated_at] = GETUTCDATE()
    FROM [dbo].[users] u
    INNER JOIN INSERTED i ON u.[id] = i.[id];
END;

-- Create trigger for profiles table
CREATE TRIGGER [trg_profiles_updated_at]
ON [dbo].[profiles]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [dbo].[profiles]
    SET [updated_at] = GETUTCDATE()
    FROM [dbo].[profiles] p
    INNER JOIN INSERTED i ON p.[id] = i.[id];
END;

-- Create trigger for canva_integrations table
CREATE TRIGGER [trg_canva_integrations_updated_at]
ON [dbo].[canva_integrations]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [dbo].[canva_integrations]
    SET [updated_at] = GETUTCDATE()
    FROM [dbo].[canva_integrations] ci
    INNER JOIN INSERTED i ON ci.[id] = i.[id];
END;

-- Create trigger for canva_designs table
CREATE TRIGGER [trg_canva_designs_updated_at]
ON [dbo].[canva_designs]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [dbo].[canva_designs]
    SET [updated_at] = GETUTCDATE()
    FROM [dbo].[canva_designs] cd
    INNER JOIN INSERTED i ON cd.[id] = i.[id];
END;

-- Create trigger for automatic profile creation
CREATE TRIGGER [trg_users_create_profile]
ON [dbo].[users]
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO [dbo].[profiles] ([user_id], [display_name])
    SELECT
        i.[id],
        CASE
            WHEN JSON_VALUE(i.[raw_user_meta_data], '$.display_name') IS NOT NULL
            THEN JSON_VALUE(i.[raw_user_meta_data], '$.display_name')
            ELSE LEFT(i.[email], CHARINDEX('@', i.[email]) - 1)
        END
    FROM INSERTED i;

    -- Create default user role
    INSERT INTO [dbo].[user_roles] ([user_id], [role_id])
    SELECT
        i.[id],
        CASE
            WHEN JSON_VALUE(i.[raw_user_meta_data], '$.role') = 'admin' THEN 1
            ELSE 2 -- default to 'user' role
        END
    FROM INSERTED i;
END;

-- =====================================================
-- 4. STORED PROCEDURES FOR BUSINESS LOGIC
-- =====================================================

-- Procedure to check if user has a specific role
CREATE PROCEDURE [dbo].[sp_HasUserRole]
    @UserId UNIQUEIDENTIFIER,
    @RoleName NVARCHAR(50),
    @HasRole BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT @HasRole = CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END
    FROM [dbo].[user_roles] ur
    INNER JOIN [dbo].[app_roles] ar ON ur.[role_id] = ar.[id]
    WHERE ur.[user_id] = @UserId AND ar.[role_name] = @RoleName;
END;

-- Procedure to get user's primary role
CREATE PROCEDURE [dbo].[sp_GetUserRole]
    @UserId UNIQUEIDENTIFIER,
    @RoleName NVARCHAR(50) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 @RoleName = ar.[role_name]
    FROM [dbo].[user_roles] ur
    INNER JOIN [dbo].[app_roles] ar ON ur.[role_id] = ar.[id]
    WHERE ur.[user_id] = @UserId
    ORDER BY ar.[id]; -- Admin roles have lower IDs
END;

-- Procedure to check if user has active Canva integration
CREATE PROCEDURE [dbo].[sp_HasCanvaIntegration]
    @UserId UNIQUEIDENTIFIER,
    @HasIntegration BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT @HasIntegration = CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END
    FROM [dbo].[canva_integrations] ci
    INNER JOIN [dbo].[integration_statuses] ist ON ci.[status_id] = ist.[id]
    WHERE ci.[user_id] = @UserId
        AND ist.[status_name] = 'active'
        AND ci.[expires_at] > GETUTCDATE();
END;

-- Procedure to search Canva designs
CREATE PROCEDURE [dbo].[sp_SearchCanvaDesigns]
    @UserId UNIQUEIDENTIFIER,
    @SearchTerm NVARCHAR(255) = NULL,
    @DesignType NVARCHAR(50) = NULL,
    @PageSize INT = 20,
    @PageNumber INT = 1
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;

    SELECT
        cd.[id],
        cd.[canva_design_id],
        cd.[title],
        cdt.[type_name] as [design_type],
        cd.[thumbnail_url],
        cd.[edit_url],
        cd.[view_url],
        cd.[is_owner],
        cd.[can_edit],
        cd.[tags],
        cd.[dimensions],
        cd.[canva_created_at],
        cd.[canva_updated_at],
        cd.[last_synced]
    FROM [dbo].[canva_designs] cd
    INNER JOIN [dbo].[canva_integrations] ci ON cd.[integration_id] = ci.[id]
    INNER JOIN [dbo].[canva_design_types] cdt ON cd.[design_type_id] = cdt.[id]
    INNER JOIN [dbo].[integration_statuses] ist ON ci.[status_id] = ist.[id]
    WHERE ci.[user_id] = @UserId
        AND ist.[status_name] = 'active'
        AND (@SearchTerm IS NULL OR
             CONTAINS(cd.[title], @SearchTerm) OR
             cd.[tags] LIKE '%' + @SearchTerm + '%')
        AND (@DesignType IS NULL OR cdt.[type_name] = @DesignType)
    ORDER BY cd.[canva_updated_at] DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;

-- Procedure to search Canva templates
CREATE PROCEDURE [dbo].[sp_SearchCanvaTemplates]
    @SearchTerm NVARCHAR(255) = NULL,
    @DesignType NVARCHAR(50) = NULL,
    @IsPremium BIT = NULL,
    @PageSize INT = 20,
    @PageNumber INT = 1
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;

    SELECT
        ct.[id],
        ct.[canva_template_id],
        ct.[title],
        ct.[description],
        cdt.[type_name] as [design_type],
        ct.[thumbnail_url],
        ct.[categories],
        ct.[keywords],
        ct.[is_premium],
        ct.[popularity_score]
    FROM [dbo].[canva_templates] ct
    INNER JOIN [dbo].[canva_design_types] cdt ON ct.[design_type_id] = cdt.[id]
    WHERE (@SearchTerm IS NULL OR
           CONTAINS((ct.[title], ct.[description]), @SearchTerm) OR
           ct.[keywords] LIKE '%' + @SearchTerm + '%' OR
           ct.[categories] LIKE '%' + @SearchTerm + '%')
        AND (@DesignType IS NULL OR cdt.[type_name] = @DesignType)
        AND (@IsPremium IS NULL OR ct.[is_premium] = @IsPremium)
    ORDER BY ct.[popularity_score] DESC, ct.[last_updated] DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;

-- =====================================================
-- 5. ROW LEVEL SECURITY (SQL Server 2016+)
-- =====================================================

-- Enable RLS on tables
ALTER TABLE [dbo].[profiles] ENABLE ROW LEVEL SECURITY;
ALTER TABLE [dbo].[user_roles] ENABLE ROW LEVEL SECURITY;
ALTER TABLE [dbo].[canva_integrations] ENABLE ROW LEVEL SECURITY;
ALTER TABLE [dbo].[canva_designs] ENABLE ROW LEVEL SECURITY;
ALTER TABLE [dbo].[canva_exports] ENABLE ROW LEVEL SECURITY;
ALTER TABLE [dbo].[canva_chat_interactions] ENABLE ROW LEVEL SECURITY;

-- Create security policy functions
CREATE FUNCTION [dbo].[fn_securitypredicate_profiles](@user_id UNIQUEIDENTIFIER)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS fn_securitypredicate_result
WHERE @user_id = CAST(SESSION_CONTEXT(N'UserId') AS UNIQUEIDENTIFIER) OR
      EXISTS (SELECT 1 FROM [dbo].[user_roles] ur
              INNER JOIN [dbo].[app_roles] ar ON ur.[role_id] = ar.[id]
              WHERE ur.[user_id] = CAST(SESSION_CONTEXT(N'UserId') AS UNIQUEIDENTIFIER)
                AND ar.[role_name] = 'admin');

-- Create security policies
CREATE SECURITY POLICY [dbo].[UserAccessPolicy]
ADD FILTER PREDICATE [dbo].[fn_securitypredicate_profiles]([user_id]) ON [dbo].[profiles],
ADD FILTER PREDICATE [dbo].[fn_securitypredicate_profiles]([user_id]) ON [dbo].[user_roles],
ADD FILTER PREDICATE [dbo].[fn_securitypredicate_profiles]([user_id]) ON [dbo].[canva_integrations],
ADD FILTER PREDICATE [dbo].[fn_securitypredicate_profiles]([user_id]) ON [dbo].[canva_exports],
ADD FILTER PREDICATE [dbo].[fn_securitypredicate_profiles]([user_id]) ON [dbo].[canva_chat_interactions];

-- Special policy for canva_designs (through integration)
CREATE FUNCTION [dbo].[fn_securitypredicate_canva_designs](@integration_id UNIQUEIDENTIFIER)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS fn_securitypredicate_result
WHERE EXISTS (SELECT 1 FROM [dbo].[canva_integrations] ci
              WHERE ci.[id] = @integration_id
                AND ci.[user_id] = CAST(SESSION_CONTEXT(N'UserId') AS UNIQUEIDENTIFIER));

CREATE SECURITY POLICY [dbo].[CanvaDesignsAccessPolicy]
ADD FILTER PREDICATE [dbo].[fn_securitypredicate_canva_designs]([integration_id]) ON [dbo].[canva_designs];

-- =====================================================
-- 6. SAMPLE DATA INSERTION
-- =====================================================

-- Insert sample templates
INSERT INTO [dbo].[canva_templates] (
    [canva_template_id], [title], [description], [design_type_id], [thumbnail_url],
    [categories], [keywords], [is_premium], [popularity_score]
) VALUES
(
    'template_001',
    'Professional Business Presentation',
    'Clean and modern presentation template perfect for business meetings and corporate communications.',
    (SELECT [id] FROM [dbo].[canva_design_types] WHERE [type_name] = 'presentation'),
    'https://via.placeholder.com/300x200/4f46e5/white?text=Business+Template',
    '["business", "professional", "corporate"]',
    '["presentation", "business", "professional", "corporate", "meeting"]',
    0,
    95
),
(
    'template_002',
    'Creative Marketing Flyer',
    'Eye-catching flyer template ideal for marketing campaigns and promotional materials.',
    (SELECT [id] FROM [dbo].[canva_design_types] WHERE [type_name] = 'flyer'),
    'https://via.placeholder.com/300x200/10b981/white?text=Marketing+Flyer',
    '["marketing", "promotional", "creative"]',
    '["flyer", "marketing", "promotion", "advertising", "creative"]',
    0,
    87
),
(
    'template_003',
    'Social Media Post Collection',
    'Trendy social media templates optimized for Instagram, Facebook, and Twitter.',
    (SELECT [id] FROM [dbo].[canva_design_types] WHERE [type_name] = 'social_media'),
    'https://via.placeholder.com/300x200/f59e0b/white?text=Social+Media',
    '["social media", "instagram", "facebook"]',
    '["social", "instagram", "facebook", "twitter", "post"]',
    1,
    92
),
(
    'template_004',
    'Modern Logo Design Kit',
    'Versatile logo templates with multiple variations and color schemes.',
    (SELECT [id] FROM [dbo].[canva_design_types] WHERE [type_name] = 'logo'),
    'https://via.placeholder.com/300x200/ef4444/white?text=Logo+Kit',
    '["branding", "logo", "identity"]',
    '["logo", "brand", "identity", "design", "modern"]',
    1,
    88
);

-- =====================================================
-- 7. PERFORMANCE OPTIMIZATION
-- =====================================================

-- Update statistics for better query performance
UPDATE STATISTICS [dbo].[users];
UPDATE STATISTICS [dbo].[profiles];
UPDATE STATISTICS [dbo].[user_roles];
UPDATE STATISTICS [dbo].[canva_integrations];
UPDATE STATISTICS [dbo].[canva_designs];
UPDATE STATISTICS [dbo].[canva_templates];
UPDATE STATISTICS [dbo].[canva_exports];
UPDATE STATISTICS [dbo].[canva_chat_interactions];

-- Add check constraints for data validation
ALTER TABLE [dbo].[users] ADD CONSTRAINT [CK_users_email_format]
    CHECK ([email] LIKE '%_@_%.__%');

ALTER TABLE [dbo].[canva_exports] ADD CONSTRAINT [CK_canva_exports_format]
    CHECK ([format] IN ('png', 'jpg', 'jpeg', 'pdf', 'gif', 'mp4'));

ALTER TABLE [dbo].[canva_exports] ADD CONSTRAINT [CK_canva_exports_quality]
    CHECK ([quality] IN ('low', 'medium', 'high'));

-- =====================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =====================================================

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Main users table replacing Supabase auth.users with custom authentication',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'users';

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Stores Canva OAuth integrations and MCP server connections for users',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'canva_integrations';

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Caches Canva design metadata for faster access and search functionality',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'canva_designs';

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Stores available Canva templates for design creation',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'canva_templates';

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Tracks design export jobs and download URLs',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'canva_exports';

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Logs design-related chat interactions for analytics and improvement',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'canva_chat_interactions';

PRINT 'Azure SQL Server schema migration script completed successfully!';
PRINT 'Remember to:';
PRINT '1. Create the database first: CREATE DATABASE [NexusKnowledgeCopilot]';
PRINT '2. Configure connection strings in your Node.js backend';
PRINT '3. Set up proper backup and monitoring for the database';
PRINT '4. Run data migration scripts to transfer existing data from Supabase';