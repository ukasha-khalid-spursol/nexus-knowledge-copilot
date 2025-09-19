-- Canva Integration Schema Extensions
-- This migration adds tables and types for Canva MCP integration

-- Create enum for Canva design types
CREATE TYPE public.canva_design_type AS ENUM (
  'presentation',
  'document',
  'social_media',
  'marketing',
  'video',
  'logo',
  'poster',
  'flyer',
  'business_card',
  'resume',
  'infographic',
  'custom'
);

-- Create enum for integration status
CREATE TYPE public.integration_status AS ENUM (
  'active',
  'inactive',
  'error',
  'pending'
);

-- Create canva_integrations table to store user Canva connection info
CREATE TABLE public.canva_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, -- For multi-tenant support
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- OAuth credentials (encrypted)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  scope TEXT NOT NULL,

  -- Canva user info
  canva_user_id TEXT NOT NULL,
  canva_display_name TEXT NOT NULL,
  canva_email TEXT NOT NULL,
  canva_team_id TEXT,

  -- Integration status
  status integration_status NOT NULL DEFAULT 'active',
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT now(),
  error_message TEXT,

  -- MCP server connection info
  mcp_server_url TEXT DEFAULT 'ws://localhost:3001/mcp',
  mcp_enabled BOOLEAN DEFAULT false,
  mcp_last_connected TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(user_id, tenant_id), -- One Canva integration per user per tenant
  UNIQUE(canva_user_id, tenant_id) -- One tenant per Canva user
);

-- Create canva_designs table to cache design metadata
CREATE TABLE public.canva_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  integration_id UUID REFERENCES public.canva_integrations(id) ON DELETE CASCADE NOT NULL,

  -- Canva design info
  canva_design_id TEXT NOT NULL,
  title TEXT NOT NULL,
  design_type canva_design_type NOT NULL,

  -- URLs and media
  thumbnail_url TEXT NOT NULL,
  edit_url TEXT NOT NULL,
  view_url TEXT NOT NULL,

  -- Permissions and ownership
  is_owner BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT, -- Canva user ID who created it

  -- Design metadata
  tags TEXT[] DEFAULT '{}',
  dimensions JSONB, -- {width: number, height: number}

  -- Sync info
  canva_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  canva_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Local metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(canva_design_id, tenant_id),

  -- Indexes for search
  INDEX idx_canva_designs_title_search USING gin(to_tsvector('english', title)),
  INDEX idx_canva_designs_tags USING gin(tags),
  INDEX idx_canva_designs_type (design_type),
  INDEX idx_canva_designs_created_by (created_by)
);

-- Create canva_templates table to cache template metadata
CREATE TABLE public.canva_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Canva template info
  canva_template_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  design_type canva_design_type NOT NULL,

  -- Media
  thumbnail_url TEXT NOT NULL,

  -- Metadata
  categories TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  is_premium BOOLEAN NOT NULL DEFAULT false,
  popularity_score INTEGER DEFAULT 0,

  -- Sync info
  indexed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Indexes for search
  INDEX idx_canva_templates_title_search USING gin(to_tsvector('english', title)),
  INDEX idx_canva_templates_keywords USING gin(keywords),
  INDEX idx_canva_templates_categories USING gin(categories),
  INDEX idx_canva_templates_type (design_type),
  INDEX idx_canva_templates_premium (is_premium)
);

-- Create canva_exports table to track export jobs
CREATE TABLE public.canva_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  design_id UUID REFERENCES public.canva_designs(id) ON DELETE CASCADE NOT NULL,

  -- Export details
  canva_export_id TEXT NOT NULL UNIQUE,
  format TEXT NOT NULL, -- png, jpg, pdf, gif, mp4
  quality TEXT NOT NULL DEFAULT 'medium', -- low, medium, high
  pages INTEGER[], -- for multi-page designs

  -- Export status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  download_url TEXT,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- When download URL expires

  INDEX idx_canva_exports_status (status),
  INDEX idx_canva_exports_user (user_id),
  INDEX idx_canva_exports_created (created_at DESC)
);

-- Create canva_chat_interactions table to track design-related conversations
CREATE TABLE public.canva_chat_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Chat context
  conversation_id UUID, -- Group related messages
  message_content TEXT NOT NULL,

  -- Design context
  design_request JSONB, -- Original design request parameters
  created_design_id UUID REFERENCES public.canva_designs(id),
  template_used TEXT, -- canva_template_id if used

  -- AI generation details
  ai_prompt TEXT,
  mcp_request_id TEXT, -- For tracing MCP requests
  generation_time_ms INTEGER,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  INDEX idx_canva_chat_user (user_id),
  INDEX idx_canva_chat_conversation (conversation_id),
  INDEX idx_canva_chat_created (created_at DESC)
);

-- Enable Row-Level Security on all tables
ALTER TABLE public.canva_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canva_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canva_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canva_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canva_chat_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for canva_integrations
CREATE POLICY "Users can view their own Canva integrations"
ON public.canva_integrations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Canva integrations"
ON public.canva_integrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Canva integrations"
ON public.canva_integrations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Canva integrations"
ON public.canva_integrations
FOR DELETE
USING (auth.uid() = user_id);

-- Create RLS policies for canva_designs
CREATE POLICY "Users can view designs from their integrations"
ON public.canva_designs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.canva_integrations ci
    WHERE ci.id = integration_id AND ci.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert designs to their integrations"
ON public.canva_designs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.canva_integrations ci
    WHERE ci.id = integration_id AND ci.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update designs from their integrations"
ON public.canva_designs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.canva_integrations ci
    WHERE ci.id = integration_id AND ci.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete designs from their integrations"
ON public.canva_designs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.canva_integrations ci
    WHERE ci.id = integration_id AND ci.user_id = auth.uid()
  )
);

-- Templates are public (read-only)
CREATE POLICY "Templates are viewable by everyone"
ON public.canva_templates
FOR SELECT
USING (true);

-- Admin-only access for template management
CREATE POLICY "Only admins can modify templates"
ON public.canva_templates
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for canva_exports
CREATE POLICY "Users can view their own exports"
ON public.canva_exports
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exports"
ON public.canva_exports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exports"
ON public.canva_exports
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for canva_chat_interactions
CREATE POLICY "Users can view their own chat interactions"
ON public.canva_chat_interactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat interactions"
ON public.canva_chat_interactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add update triggers for timestamp management
CREATE TRIGGER update_canva_integrations_updated_at
BEFORE UPDATE ON public.canva_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_canva_designs_updated_at
BEFORE UPDATE ON public.canva_designs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create helper functions for Canva integration

-- Function to check if user has active Canva integration
CREATE OR REPLACE FUNCTION public.has_canva_integration(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.canva_integrations
    WHERE user_id = _user_id
      AND status = 'active'
      AND expires_at > now()
  )
$$;

-- Function to get user's Canva integration
CREATE OR REPLACE FUNCTION public.get_canva_integration(_user_id UUID)
RETURNS public.canva_integrations
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.canva_integrations
  WHERE user_id = _user_id
    AND status = 'active'
    AND expires_at > now()
  LIMIT 1
$$;

-- Function to search designs by title and tags
CREATE OR REPLACE FUNCTION public.search_canva_designs(
  _user_id UUID,
  _search_term TEXT DEFAULT NULL,
  _design_type canva_design_type DEFAULT NULL,
  _limit INTEGER DEFAULT 20,
  _offset INTEGER DEFAULT 0
)
RETURNS SETOF public.canva_designs
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cd.*
  FROM public.canva_designs cd
  JOIN public.canva_integrations ci ON cd.integration_id = ci.id
  WHERE ci.user_id = _user_id
    AND ci.status = 'active'
    AND (_search_term IS NULL OR (
      to_tsvector('english', cd.title) @@ plainto_tsquery('english', _search_term)
      OR _search_term = ANY(cd.tags)
    ))
    AND (_design_type IS NULL OR cd.design_type = _design_type)
  ORDER BY cd.canva_updated_at DESC
  LIMIT _limit
  OFFSET _offset
$$;

-- Function to search templates
CREATE OR REPLACE FUNCTION public.search_canva_templates(
  _search_term TEXT DEFAULT NULL,
  _design_type canva_design_type DEFAULT NULL,
  _is_premium BOOLEAN DEFAULT NULL,
  _limit INTEGER DEFAULT 20,
  _offset INTEGER DEFAULT 0
)
RETURNS SETOF public.canva_templates
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.canva_templates
  WHERE (_search_term IS NULL OR (
    to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', _search_term)
    OR _search_term = ANY(keywords)
    OR _search_term = ANY(categories)
  ))
    AND (_design_type IS NULL OR design_type = _design_type)
    AND (_is_premium IS NULL OR is_premium = _is_premium)
  ORDER BY popularity_score DESC, last_updated DESC
  LIMIT _limit
  OFFSET _offset
$$;

-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_canva_integrations_user_status
ON public.canva_integrations(user_id, status, expires_at);

CREATE INDEX CONCURRENTLY idx_canva_designs_integration_updated
ON public.canva_designs(integration_id, canva_updated_at DESC);

CREATE INDEX CONCURRENTLY idx_canva_exports_user_created
ON public.canva_exports(user_id, created_at DESC);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Insert some sample templates for demonstration
INSERT INTO public.canva_templates (
  canva_template_id, title, description, design_type, thumbnail_url,
  categories, keywords, is_premium, popularity_score
) VALUES
(
  'template_001',
  'Professional Business Presentation',
  'Clean and modern presentation template perfect for business meetings and corporate communications.',
  'presentation',
  'https://via.placeholder.com/300x200/4f46e5/white?text=Business+Template',
  ARRAY['business', 'professional', 'corporate'],
  ARRAY['presentation', 'business', 'professional', 'corporate', 'meeting'],
  false,
  95
),
(
  'template_002',
  'Creative Marketing Flyer',
  'Eye-catching flyer template ideal for marketing campaigns and promotional materials.',
  'flyer',
  'https://via.placeholder.com/300x200/10b981/white?text=Marketing+Flyer',
  ARRAY['marketing', 'promotional', 'creative'],
  ARRAY['flyer', 'marketing', 'promotion', 'advertising', 'creative'],
  false,
  87
),
(
  'template_003',
  'Social Media Post Collection',
  'Trendy social media templates optimized for Instagram, Facebook, and Twitter.',
  'social_media',
  'https://via.placeholder.com/300x200/f59e0b/white?text=Social+Media',
  ARRAY['social media', 'instagram', 'facebook'],
  ARRAY['social', 'instagram', 'facebook', 'twitter', 'post'],
  true,
  92
),
(
  'template_004',
  'Modern Logo Design Kit',
  'Versatile logo templates with multiple variations and color schemes.',
  'logo',
  'https://via.placeholder.com/300x200/ef4444/white?text=Logo+Kit',
  ARRAY['branding', 'logo', 'identity'],
  ARRAY['logo', 'brand', 'identity', 'design', 'modern'],
  true,
  88
);

COMMENT ON TABLE public.canva_integrations IS 'Stores Canva OAuth integrations and MCP server connections for users';
COMMENT ON TABLE public.canva_designs IS 'Caches Canva design metadata for faster access and search';
COMMENT ON TABLE public.canva_templates IS 'Stores available Canva templates for design creation';
COMMENT ON TABLE public.canva_exports IS 'Tracks design export jobs and download URLs';
COMMENT ON TABLE public.canva_chat_interactions IS 'Logs design-related chat interactions for analytics and improvement';