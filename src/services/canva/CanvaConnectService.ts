import {
  CanvaCredentials,
  CanvaDesign,
  CanvaTemplate,
  CanvaUser,
  CanvaAsset,
  CanvaFolder,
  CanvaBrandKit,
  CanvaAPIError,
  DesignFilter,
  TemplateFilter,
  ExportRequest,
  ExportResult
} from '@/types/canva';

export class CanvaConnectService {
  private baseUrl = 'https://api.canva.com/rest/v1';
  private credentials: CanvaCredentials | null = null;

  constructor(credentials?: CanvaCredentials) {
    if (credentials) {
      this.setCredentials(credentials);
    }
  }

  setCredentials(credentials: CanvaCredentials): void {
    this.credentials = credentials;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.credentials) {
      throw new Error('Canva credentials not set');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.credentials.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const apiError: CanvaAPIError = {
          error: {
            code: errorData.code || response.status.toString(),
            message: errorData.message || response.statusText,
            details: errorData,
          },
          status_code: response.status,
        };
        throw apiError;
      }

      return await response.json();
    } catch (error) {
      if (error.status_code === 401) {
        // Token might be expired, attempt refresh
        await this.refreshAccessToken();
        return this.makeRequest(endpoint, options);
      }
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.credentials?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refresh_token,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const newCredentials = await response.json();
    this.credentials = {
      ...this.credentials,
      access_token: newCredentials.access_token,
      expires_in: newCredentials.expires_in,
      refresh_token: newCredentials.refresh_token || this.credentials.refresh_token,
    };
  }

  // User Methods
  async getCurrentUser(): Promise<CanvaUser> {
    const response = await this.makeRequest<{ user: CanvaUser }>('/me');
    return response.user;
  }

  // Design Methods
  async createDesign(data: {
    design_type: string;
    title?: string;
    width?: number;
    height?: number;
  }): Promise<CanvaDesign> {
    const response = await this.makeRequest<{ design: CanvaDesign }>('/designs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.design;
  }

  async getDesign(designId: string): Promise<CanvaDesign> {
    const response = await this.makeRequest<{ design: CanvaDesign }>(`/designs/${designId}`);
    return response.design;
  }

  async listDesigns(filter: DesignFilter = {}): Promise<{
    designs: CanvaDesign[];
    has_more: boolean;
    continuation?: string;
  }> {
    const params = new URLSearchParams();

    if (filter.design_type) params.append('design_type', filter.design_type);
    if (filter.created_after) params.append('created_after', filter.created_after);
    if (filter.created_before) params.append('created_before', filter.created_before);
    if (filter.owner_id) params.append('owner_id', filter.owner_id);
    if (filter.search_term) params.append('query', filter.search_term);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await this.makeRequest<{
      items: CanvaDesign[];
      has_more: boolean;
      continuation?: string;
    }>(`/designs${queryString}`);

    return {
      designs: response.items,
      has_more: response.has_more,
      continuation: response.continuation,
    };
  }

  async deleteDesign(designId: string): Promise<void> {
    await this.makeRequest(`/designs/${designId}`, {
      method: 'DELETE',
    });
  }

  // Template Methods
  async searchTemplates(filter: TemplateFilter = {}): Promise<{
    templates: CanvaTemplate[];
    has_more: boolean;
    continuation?: string;
  }> {
    const params = new URLSearchParams();

    if (filter.design_type) params.append('design_type', filter.design_type);
    if (filter.search_term) params.append('query', filter.search_term);
    if (filter.is_premium !== undefined) params.append('is_premium', filter.is_premium.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await this.makeRequest<{
      items: CanvaTemplate[];
      has_more: boolean;
      continuation?: string;
    }>(`/design-templates${queryString}`);

    return {
      templates: response.items,
      has_more: response.has_more,
      continuation: response.continuation,
    };
  }

  async createDesignFromTemplate(templateId: string, title?: string): Promise<CanvaDesign> {
    const response = await this.makeRequest<{ design: CanvaDesign }>('/designs', {
      method: 'POST',
      body: JSON.stringify({
        design_type: 'presentation', // Will be overridden by template
        template_id: templateId,
        title,
      }),
    });
    return response.design;
  }

  // Asset Methods
  async uploadAsset(
    file: File,
    options: { name?: string; tags?: string[]; folder_id?: string } = {}
  ): Promise<CanvaAsset> {
    const formData = new FormData();
    formData.append('file', file);

    if (options.name) formData.append('name', options.name);
    if (options.folder_id) formData.append('folder_id', options.folder_id);
    if (options.tags) formData.append('tags', JSON.stringify(options.tags));

    const response = await this.makeRequest<{ asset: CanvaAsset }>('/assets', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it for FormData
      },
    });

    return response.asset;
  }

  async getAsset(assetId: string): Promise<CanvaAsset> {
    const response = await this.makeRequest<{ asset: CanvaAsset }>(`/assets/${assetId}`);
    return response.asset;
  }

  async listAssets(folderId?: string): Promise<{
    assets: CanvaAsset[];
    has_more: boolean;
    continuation?: string;
  }> {
    const params = folderId ? `?folder_id=${folderId}` : '';
    const response = await this.makeRequest<{
      items: CanvaAsset[];
      has_more: boolean;
      continuation?: string;
    }>(`/assets${params}`);

    return {
      assets: response.items,
      has_more: response.has_more,
      continuation: response.continuation,
    };
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.makeRequest(`/assets/${assetId}`, {
      method: 'DELETE',
    });
  }

  // Folder Methods
  async createFolder(name: string, parentId?: string): Promise<CanvaFolder> {
    const response = await this.makeRequest<{ folder: CanvaFolder }>('/folders', {
      method: 'POST',
      body: JSON.stringify({
        name,
        parent_folder_id: parentId,
      }),
    });
    return response.folder;
  }

  async listFolders(parentId?: string): Promise<{
    folders: CanvaFolder[];
    has_more: boolean;
    continuation?: string;
  }> {
    const params = parentId ? `?parent_folder_id=${parentId}` : '';
    const response = await this.makeRequest<{
      items: CanvaFolder[];
      has_more: boolean;
      continuation?: string;
    }>(`/folders${params}`);

    return {
      folders: response.items,
      has_more: response.has_more,
      continuation: response.continuation,
    };
  }

  // Brand Kit Methods
  async getBrandKit(brandKitId?: string): Promise<CanvaBrandKit> {
    const endpoint = brandKitId ? `/brand-kits/${brandKitId}` : '/brand-kits/default';
    const response = await this.makeRequest<{ brand_kit: CanvaBrandKit }>(endpoint);
    return response.brand_kit;
  }

  async listBrandKits(): Promise<{
    brand_kits: CanvaBrandKit[];
    has_more: boolean;
    continuation?: string;
  }> {
    const response = await this.makeRequest<{
      items: CanvaBrandKit[];
      has_more: boolean;
      continuation?: string;
    }>('/brand-kits');

    return {
      brand_kits: response.items,
      has_more: response.has_more,
      continuation: response.continuation,
    };
  }

  // Export Methods
  async exportDesign(request: ExportRequest): Promise<ExportResult> {
    const response = await this.makeRequest<{ export: ExportResult }>(
      `/designs/${request.design_id}/export`,
      {
        method: 'POST',
        body: JSON.stringify({
          format: request.format,
          quality: request.quality || 'medium',
          pages: request.pages,
        }),
      }
    );
    return response.export;
  }

  async getExportStatus(exportId: string): Promise<ExportResult> {
    const response = await this.makeRequest<{ export: ExportResult }>(`/exports/${exportId}`);
    return response.export;
  }

  // Helper Methods
  async getDesignThumbnail(designId: string): Promise<string> {
    const design = await this.getDesign(designId);
    return design.thumbnail.url;
  }

  async shareDesign(designId: string, permissions: {
    view?: boolean;
    edit?: boolean;
    comment?: boolean;
  } = { view: true }): Promise<{ share_url: string }> {
    const response = await this.makeRequest<{ share_url: string }>(
      `/designs/${designId}/share`,
      {
        method: 'POST',
        body: JSON.stringify(permissions),
      }
    );
    return response;
  }

  // Batch Operations
  async batchGetDesigns(designIds: string[]): Promise<CanvaDesign[]> {
    const designs = await Promise.all(
      designIds.map(id => this.getDesign(id).catch(() => null))
    );
    return designs.filter(design => design !== null) as CanvaDesign[];
  }

  async batchDeleteDesigns(designIds: string[]): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>
  }> {
    const results = await Promise.allSettled(
      designIds.map(id => this.deleteDesign(id).then(() => id))
    );

    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        success.push(result.value);
      } else {
        failed.push({
          id: designIds[index],
          error: result.reason.message
        });
      }
    });

    return { success, failed };
  }

  // Utility Methods
  isTokenExpired(): boolean {
    if (!this.credentials) return true;

    // Check if token expires within the next 5 minutes
    const expirationBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    const currentTime = Date.now();
    const tokenExpiration = currentTime + (this.credentials.expires_in * 1000);

    return tokenExpiration - currentTime < expirationBuffer;
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      console.error('Canva connection validation failed:', error);
      return false;
    }
  }
}