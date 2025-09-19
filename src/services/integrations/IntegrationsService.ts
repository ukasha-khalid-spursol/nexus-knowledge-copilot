import { supabase } from "@/integrations/supabase/client";
import { JiraIntegrationService } from "@/services/jira/JiraIntegrationService";

export interface IntegrationStatus {
  jira: { connected: boolean; enabled: boolean };
  confluence: { connected: boolean; enabled: boolean };
  sourcegraph: { connected: boolean; enabled: boolean };
  canva: { connected: boolean; enabled: boolean };
}

export class IntegrationsService {
  static async getIntegrationStatus(userId: string): Promise<IntegrationStatus> {
    try {
      const { data } = await supabase
        .from('integrations')
        .select('service_name, is_active')
        .eq('user_id', userId);

      const integrations = data?.reduce((acc, integration) => {
        acc[integration.service_name as keyof IntegrationStatus] = {
          connected: true,
          enabled: integration.is_active
        };
        return acc;
      }, {} as Partial<IntegrationStatus>) || {};

      return {
        jira: { connected: false, enabled: false },
        confluence: { connected: false, enabled: false },
        sourcegraph: { connected: false, enabled: false },
        canva: { connected: false, enabled: false },
        ...integrations
      };
    } catch (error) {
      console.error('Failed to load integration status:', error);
      return {
        jira: { connected: false, enabled: false },
        confluence: { connected: false, enabled: false },
        sourcegraph: { connected: false, enabled: false },
        canva: { connected: false, enabled: false }
      };
    }
  }

  static async toggleIntegration(userId: string, serviceName: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('integrations')
      .update({ is_active: enabled })
      .eq('user_id', userId)
      .eq('service_name', serviceName);

    if (error) {
      throw new Error(`Failed to ${enabled ? 'enable' : 'disable'} ${serviceName} integration: ${error.message}`);
    }
  }

  static async removeIntegration(userId: string, serviceName: string): Promise<void> {
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('user_id', userId)
      .eq('service_name', serviceName);

    if (error) {
      throw new Error(`Failed to remove ${serviceName} integration: ${error.message}`);
    }
  }

  static async searchAcrossIntegrations(userId: string, query: string) {
    const results = [];

    // Search Jira if connected and enabled
    const status = await this.getIntegrationStatus(userId);
    if (status.jira.connected && status.jira.enabled) {
      const jiraCredentials = await JiraIntegrationService.loadIntegration(userId);
      if (jiraCredentials) {
        try {
          const jiraService = new JiraIntegrationService(jiraCredentials);
          const jiraIssues = await jiraService.searchIssues(
            `text ~ "${query}" ORDER BY updated DESC`,
            10
          );
          
          results.push(...jiraIssues.map(issue => ({
            title: `${issue.key}: ${issue.summary}`,
            type: 'jira' as const,
            url: issue.url,
            content: issue.description,
            metadata: {
              status: issue.status,
              assignee: issue.assignee,
              updated: issue.updated
            }
          })));
        } catch (error) {
          console.error('Jira search failed:', error);
        }
      }
    }

    // TODO: Add Confluence and Sourcegraph search when implemented

    return results;
  }
}