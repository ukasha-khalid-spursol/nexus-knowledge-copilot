import { supabase } from "@/integrations/supabase/client";

export interface NotionCredentials {
  apiToken: string;
}

export interface NotionPage {
  id: string;
  title: string;
  excerpt?: string;
  content?: string;
  lastModified: string;
  url: string;
  database?: string;
}

export interface NotionDatabase {
  id: string;
  title: string;
  description?: string;
}

export class NotionIntegrationService {
  constructor(private credentials: NotionCredentials) {}

  async validateCredentials(): Promise<{ isValid: boolean; error?: string }> {
    try {
      console.log('Validating Notion credentials...');

      const response = await fetch('https://api.notion.com/v1/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.credentials.apiToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { isValid: true };
      } else if (response.status === 401) {
        return { isValid: false, error: 'Invalid API token' };
      } else {
        return { isValid: false, error: `Server returned status ${response.status}` };
      }
    } catch (error) {
      console.error('Notion validation error:', error);
      
      // Handle CORS and network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { 
          isValid: false, 
          error: 'Cannot reach Notion API. Please verify your token is correct.' 
        };
      }
      
      return { 
        isValid: false, 
        error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async searchPages(query: string = '', maxResults: number = 50): Promise<NotionPage[]> {
    try {
      const response = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.apiToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          filter: {
            value: 'page',
            property: 'object'
          },
          page_size: Math.min(maxResults, 100)
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to search pages: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.results?.map((page: any) => ({
        id: page.id,
        title: this.extractTitle(page),
        excerpt: this.extractExcerpt(page),
        lastModified: page.last_edited_time,
        url: page.url,
        database: page.parent?.type === 'database_id' ? 'Database Item' : 'Page'
      })) || [];
    } catch (error) {
      console.error('Error searching Notion pages:', error);
      throw error;
    }
  }

  private extractTitle(page: any): string {
    if (page.properties?.title?.title?.[0]?.plain_text) {
      return page.properties.title.title[0].plain_text;
    }
    if (page.properties?.Name?.title?.[0]?.plain_text) {
      return page.properties.Name.title[0].plain_text;
    }
    return 'Untitled';
  }

  private extractExcerpt(page: any): string {
    // Try to get excerpt from various property types
    const properties = page.properties || {};
    
    for (const [key, property] of Object.entries(properties)) {
      if (property && typeof property === 'object') {
        const prop = property as any;
        if (prop.rich_text?.[0]?.plain_text) {
          return prop.rich_text[0].plain_text.substring(0, 200);
        }
        if (prop.text?.[0]?.plain_text) {
          return prop.text[0].plain_text.substring(0, 200);
        }
      }
    }
    
    return '';
  }

  static async saveIntegration(userId: string, credentials: NotionCredentials): Promise<void> {
    // Simple encryption (in production, use proper encryption)
    const encryptedToken = btoa(credentials.apiToken);
    
    const { error } = await supabase
      .from('integrations')
      .upsert({
        user_id: userId,
        service_name: 'notion',
        api_key_encrypted: encryptedToken,
        base_url: null,
        additional_config: {},
        is_active: true,
        last_verified_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,service_name'
      });

    if (error) {
      throw new Error(`Failed to save Notion integration: ${error.message}`);
    }
  }

  static async loadIntegration(userId: string): Promise<NotionCredentials | null> {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('service_name', 'notion')
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Decrypt token (in production, use proper decryption)
    const decryptedToken = atob(data.api_key_encrypted);

    return {
      apiToken: decryptedToken
    };
  }
}