import { supabase } from "@/integrations/supabase/client";
import { JiraIntegrationService } from "@/services/jira/JiraIntegrationService";

export interface IntegrationStatus {
  jira: boolean;
  confluence: boolean;
  sourcegraph: boolean;
  canva: boolean;
}

export class IntegrationsService {
  static async getIntegrationStatus(userId: string): Promise<IntegrationStatus> {
    try {
      const { data } = await supabase
        .from('integrations')
        .select('service_name')
        .eq('user_id', userId)
        .eq('is_active', true);

      const activeServices = data?.reduce((acc, integration) => {
        acc[integration.service_name as keyof IntegrationStatus] = true;
        return acc;
      }, {} as Partial<IntegrationStatus>) || {};

      return {
        jira: false,
        confluence: false,
        sourcegraph: false,
        canva: false,
        ...activeServices
      };
    } catch (error) {
      console.error('Failed to load integration status:', error);
      return {
        jira: false,
        confluence: false,
        sourcegraph: false,
        canva: false
      };
    }
  }

  static async searchAcrossIntegrations(userId: string, query: string) {
    const results = [];

    // Search Jira if connected
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

    // TODO: Add Confluence and Sourcegraph search when implemented

    return results;
  }
}