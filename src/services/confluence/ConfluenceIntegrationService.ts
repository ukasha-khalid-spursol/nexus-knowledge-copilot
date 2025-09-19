import { supabase } from "@/integrations/supabase/client";

export interface ConfluenceCredentials {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface ConfluencePage {
  id: string;
  title: string;
  excerpt?: string;
  content?: string;
  status: string;
  space: string;
  lastModified: string;
  author?: string;
  url: string;
}

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  description?: string;
  type: string;
}

export class ConfluenceIntegrationService {
  constructor(private credentials: ConfluenceCredentials) {}

  async validateCredentials(): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Clean up base URL (remove trailing slash, ensure https)
      let baseUrl = this.credentials.baseUrl.trim();
      if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
      }
      baseUrl = baseUrl.replace(/\/$/, '');

      console.log('Validating Confluence credentials for:', baseUrl);

      const response = await fetch(`${baseUrl}/wiki/rest/api/user/current`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.credentials.email}:${this.credentials.apiToken}`)}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors' // This will likely fail due to CORS, but we'll handle it
      });

      if (response.ok) {
        return { isValid: true };
      } else if (response.status === 401) {
        return { isValid: false, error: 'Invalid email or API token' };
      } else if (response.status === 404) {
        return { isValid: false, error: 'Confluence instance URL not found' };
      } else {
        return { isValid: false, error: `Server returned status ${response.status}` };
      }
    } catch (error) {
      console.error('Confluence validation error:', error);
      
      // Handle CORS and network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { 
          isValid: false, 
          error: 'Cannot reach Confluence instance. Please verify the URL is correct and accessible.' 
        };
      }
      
      return { 
        isValid: false, 
        error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async getSpaces(): Promise<ConfluenceSpace[]> {
    try {
      const response = await fetch(`${this.credentials.baseUrl}/wiki/rest/api/space`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.credentials.email}:${this.credentials.apiToken}`)}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch spaces: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.results?.map((space: any) => ({
        id: space.id,
        key: space.key,
        name: space.name,
        description: space.description?.plain?.value || '',
        type: space.type
      })) || [];
    } catch (error) {
      console.error('Error fetching Confluence spaces:', error);
      throw error;
    }
  }

  async searchPages(query: string = '', spaceKey?: string, maxResults: number = 50): Promise<ConfluencePage[]> {
    try {
      const params = new URLSearchParams({
        cql: spaceKey 
          ? `text ~ "${query}" AND space = "${spaceKey}" ORDER BY lastModified DESC`
          : `text ~ "${query}" ORDER BY lastModified DESC`,
        limit: maxResults.toString(),
        expand: 'body.storage,space,history.lastUpdated,history.createdBy'
      });

      const response = await fetch(`${this.credentials.baseUrl}/wiki/rest/api/content/search?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.credentials.email}:${this.credentials.apiToken}`)}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to search pages: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.results?.map((page: any) => ({
        id: page.id,
        title: page.title,
        excerpt: page.excerpt || '',
        content: page.body?.storage?.value || '',
        status: page.status,
        space: page.space?.name || 'Unknown Space',
        lastModified: page.history?.lastUpdated?.when || page.history?.createdDate || '',
        author: page.history?.lastUpdated?.by?.displayName || page.history?.createdBy?.displayName || 'Unknown',
        url: `${this.credentials.baseUrl}/wiki${page._links?.webui || `/spaces/${page.space?.key}/pages/${page.id}`}`
      })) || [];
    } catch (error) {
      console.error('Error searching Confluence pages:', error);
      throw error;
    }
  }

  static async saveIntegration(userId: string, credentials: ConfluenceCredentials): Promise<void> {
    // Simple encryption (in production, use proper encryption)
    const encryptedToken = btoa(credentials.apiToken);
    
    const { error } = await supabase
      .from('integrations')
      .upsert({
        user_id: userId,
        service_name: 'confluence',
        api_key_encrypted: encryptedToken,
        base_url: credentials.baseUrl,
        additional_config: { email: credentials.email },
        is_active: true,
        last_verified_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,service_name'
      });

    if (error) {
      throw new Error(`Failed to save Confluence integration: ${error.message}`);
    }
  }

  static async loadIntegration(userId: string): Promise<ConfluenceCredentials | null> {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('service_name', 'confluence')
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Decrypt token (in production, use proper decryption)
    const decryptedToken = atob(data.api_key_encrypted);
    const config = data.additional_config as { email?: string } || {};

    return {
      baseUrl: data.base_url,
      email: config.email || '',
      apiToken: decryptedToken
    };
  }

  static async removeIntegration(userId: string): Promise<void> {
    const { error } = await supabase
      .from('integrations')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('service_name', 'confluence');

    if (error) {
      throw new Error(`Failed to remove Confluence integration: ${error.message}`);
    }
  }
}