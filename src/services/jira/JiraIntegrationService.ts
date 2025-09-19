import { supabase } from "@/integrations/supabase/client";

export interface JiraCredentials {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status: string;
  assignee?: string;
  created: string;
  updated: string;
  url: string;
}

export class JiraIntegrationService {
  constructor(private credentials: JiraCredentials) {}

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await fetch(`${this.credentials.baseUrl}/rest/api/3/myself`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.credentials.email}:${this.credentials.apiToken}`)}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Jira validation error:', error);
      return false;
    }
  }

  async getProjects(): Promise<any[]> {
    try {
      const response = await fetch(`${this.credentials.baseUrl}/rest/api/3/project`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.credentials.email}:${this.credentials.apiToken}`)}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Jira projects:', error);
      throw error;
    }
  }

  async searchIssues(jql: string = 'assignee = currentUser() ORDER BY updated DESC', maxResults: number = 50): Promise<JiraIssue[]> {
    try {
      const params = new URLSearchParams({
        jql,
        maxResults: maxResults.toString(),
        fields: 'id,key,summary,description,status,assignee,created,updated'
      });

      const response = await fetch(`${this.credentials.baseUrl}/rest/api/3/search?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.credentials.email}:${this.credentials.apiToken}`)}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to search issues: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.issues?.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description?.content?.[0]?.content?.[0]?.text || '',
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        created: issue.fields.created,
        updated: issue.fields.updated,
        url: `${this.credentials.baseUrl}/browse/${issue.key}`
      })) || [];
    } catch (error) {
      console.error('Error searching Jira issues:', error);
      throw error;
    }
  }

  static async saveIntegration(userId: string, credentials: JiraCredentials): Promise<void> {
    // Simple encryption (in production, use proper encryption)
    const encryptedToken = btoa(credentials.apiToken);
    
    const { error } = await supabase
      .from('integrations')
      .upsert({
        user_id: userId,
        service_name: 'jira',
        api_key_encrypted: encryptedToken,
        base_url: credentials.baseUrl,
        additional_config: { email: credentials.email },
        is_active: true,
        last_verified_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,service_name'
      });

    if (error) {
      throw new Error(`Failed to save Jira integration: ${error.message}`);
    }
  }

  static async loadIntegration(userId: string): Promise<JiraCredentials | null> {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('service_name', 'jira')
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
      .eq('service_name', 'jira');

    if (error) {
      throw new Error(`Failed to remove Jira integration: ${error.message}`);
    }
  }
}