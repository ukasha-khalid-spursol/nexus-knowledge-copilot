// Canva Integration Types for MCP Server and Connect API

export interface CanvaCredentials {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  scope: string;
}

export interface CanvaUser {
  id: string;
  display_name: string;
  email: string;
  team_id?: string;
}

export interface CanvaDesign {
  id: string;
  title: string;
  thumbnail: {
    url: string;
    width: number;
    height: number;
  };
  urls: {
    edit_url: string;
    view_url: string;
  };
  created_at: string;
  updated_at: string;
  design_type: CanvaDesignType;
  is_owner: boolean;
  can_edit: boolean;
  tags: string[];
}

export type CanvaDesignType =
  | 'presentation'
  | 'document'
  | 'social_media'
  | 'marketing'
  | 'video'
  | 'logo'
  | 'poster'
  | 'flyer'
  | 'business_card'
  | 'resume'
  | 'infographic'
  | 'custom';

export interface CanvaTemplate {
  id: string;
  title: string;
  description?: string;
  thumbnail: {
    url: string;
    width: number;
    height: number;
  };
  design_type: CanvaDesignType;
  is_premium: boolean;
  categories: string[];
  keywords: string[];
}

export interface CanvaAsset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'font' | 'graphic';
  url: string;
  thumbnail?: string;
  size: number;
  format: string;
  dimensions?: {
    width: number;
    height: number;
  };
  upload_date: string;
}

export interface CanvaFolder {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  items_count: number;
}

export interface CanvaBrandKit {
  id: string;
  name: string;
  brand_colors: Array<{
    id: string;
    hex: string;
    name?: string;
  }>;
  brand_fonts: Array<{
    id: string;
    name: string;
    family: string;
  }>;
  logos: CanvaAsset[];
}

// MCP Protocol Types
export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPRequest extends MCPMessage {
  method: string;
  params?: any;
}

export interface MCPResponse extends MCPMessage {
  result?: any;
  error?: MCPError;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// Design Generation Request Types
export interface DesignRequest {
  type: 'create' | 'edit' | 'duplicate' | 'export';
  design_type: CanvaDesignType;
  template_id?: string;
  title?: string;
  description?: string;
  content?: DesignContent;
  dimensions?: {
    width: number;
    height: number;
  };
  brand_kit_id?: string;
}

export interface DesignContent {
  text_elements?: Array<{
    content: string;
    position: { x: number; y: number };
    style?: {
      font_family?: string;
      font_size?: number;
      color?: string;
      bold?: boolean;
      italic?: boolean;
    };
  }>;
  image_elements?: Array<{
    asset_id: string;
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
  }>;
  background?: {
    color?: string;
    image_id?: string;
  };
}

export interface DesignEditRequest extends DesignRequest {
  design_id: string;
  changes: Array<{
    element_id?: string;
    action: 'add' | 'remove' | 'modify';
    data: any;
  }>;
}

export interface ExportRequest {
  design_id: string;
  format: 'png' | 'jpg' | 'pdf' | 'gif' | 'mp4';
  quality?: 'low' | 'medium' | 'high';
  pages?: number[];
}

export interface ExportResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

// Database Types
export interface CanvaIntegrationConfig {
  id: string;
  tenant_id: string;
  user_id: string;
  credentials: CanvaCredentials;
  user_info: CanvaUser;
  status: 'active' | 'inactive' | 'error';
  last_sync: string;
  created_at: string;
  updated_at: string;
}

export interface DesignRecord {
  id: string;
  tenant_id: string;
  canva_design_id: string;
  title: string;
  design_type: CanvaDesignType;
  thumbnail_url: string;
  edit_url: string;
  view_url: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata: {
    tags: string[];
    folder_id?: string;
    is_template: boolean;
    brand_kit_id?: string;
  };
}

export interface TemplateRecord {
  id: string;
  canva_template_id: string;
  title: string;
  description?: string;
  design_type: CanvaDesignType;
  thumbnail_url: string;
  categories: string[];
  keywords: string[];
  is_premium: boolean;
  popularity_score: number;
  indexed_at: string;
}

// Chat Integration Types
export interface DesignChatMessage {
  role: 'user' | 'assistant';
  content: string;
  design?: CanvaDesign;
  design_request?: DesignRequest;
  designs?: CanvaDesign[];
  sources?: Array<{
    title: string;
    type: 'canva_design' | 'canva_template';
    url: string;
    thumbnail?: string;
  }>;
}

export interface DesignCapability {
  type: 'create' | 'edit' | 'export' | 'share';
  available: boolean;
  reason?: string;
}

// MCP Server Configuration
export interface CanvaMCPConfig {
  server_url?: string;
  api_key?: string;
  workspace_id?: string;
  enable_templates: boolean;
  enable_assets: boolean;
  enable_brand_kit: boolean;
  rate_limit: {
    requests_per_minute: number;
    burst_limit: number;
  };
}

// Event Types for Real-time Updates
export interface CanvaWebhookEvent {
  type: 'design.created' | 'design.updated' | 'design.deleted' | 'design.shared';
  timestamp: string;
  user_id: string;
  data: {
    design: CanvaDesign;
    changes?: any;
  };
}

// Error Types
export interface CanvaAPIError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  status_code: number;
}

export class MCPConnectionError extends Error {
  code: 'CONNECTION_FAILED' | 'TIMEOUT' | 'INVALID_RESPONSE';
  details?: any;

  constructor(message: string, code: 'CONNECTION_FAILED' | 'TIMEOUT' | 'INVALID_RESPONSE' = 'CONNECTION_FAILED', details?: any) {
    super(message);
    this.name = 'MCPConnectionError';
    this.code = code;
    this.details = details;
  }
}

// Utility Types
export type DesignFilter = {
  design_type?: CanvaDesignType;
  created_after?: string;
  created_before?: string;
  owner_id?: string;
  tags?: string[];
  search_term?: string;
};

export type TemplateFilter = {
  design_type?: CanvaDesignType;
  categories?: string[];
  keywords?: string[];
  is_premium?: boolean;
  search_term?: string;
};