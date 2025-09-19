import { useState, useEffect } from "react";
import { IntegrationCard } from "@/components/IntegrationCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Database, FileText, BookOpen, ArrowRight, CheckCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { IntegrationsService, type IntegrationStatus } from "@/services/integrations/IntegrationsService";
import { JiraIntegrationService } from "@/services/jira/JiraIntegrationService";
import { ConfluenceIntegrationService } from "@/services/confluence/ConfluenceIntegrationService";
import type { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";

const Integrations = () => {
  const [connections, setConnections] = useState<IntegrationStatus>({
    jira: { connected: false, enabled: false },
    confluence: { connected: false, enabled: false },
    notion: { connected: false, enabled: false },
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useUserRole(user);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && !roleLoading && user && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access integrations.",
        variant: "destructive",
      });
      navigate("/chat");
    }
  }, [loading, roleLoading, user, isAdmin, navigate, toast]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  // Load integration status from database
  useEffect(() => {
    const loadIntegrations = async () => {
      if (!user) return;

      try {
        const status = await IntegrationsService.getIntegrationStatus(user.id);
        setConnections(status);
      } catch (error) {
        console.error('Failed to load integrations:', error);
      }
    };

    loadIntegrations();
  }, [user]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied message for non-admin users (only after everything has loaded)
  if (user && !loading && !roleLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-gradient-card border-border/50 text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-destructive" />
                  </div>
                </div>
                <CardTitle className="text-2xl mb-2">Access Restricted</CardTitle>
                <CardDescription className="text-lg">
                  This page is only accessible to admin users. Contact your administrator for access.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/chat")} className="bg-gradient-primary hover:opacity-90">
                  Go to Chat
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const handleConnect = (service: keyof typeof connections) => {
    console.log('handleConnect called with service:', service);
    try {
      navigate(`/integrations/setup/${service}`);
      console.log('Navigation called successfully');
    } catch (error) {
      console.error('Navigation error:', error);
      toast({
        title: "Navigation Error",
        description: "Failed to navigate to setup page",
        variant: "destructive"
      });
    }
  };

  const handleDisconnect = async (service: keyof typeof connections) => {
    if (!user) return;

    try {
      await IntegrationsService.removeIntegration(user.id, service);

      // Update local state
      setConnections(prev => ({ 
        ...prev, 
        [service]: { connected: false, enabled: false }
      }));

      toast({
        title: "Integration Removed",
        description: `Successfully removed ${service} integration`,
      });
    } catch (error) {
      toast({
        title: "Removal Failed",
        description: `Failed to remove ${service} integration`,
        variant: "destructive"
      });
    }
  };

  const handleToggleEnabled = async (service: keyof typeof connections, enabled: boolean) => {
    if (!user) return;

    try {
      await IntegrationsService.toggleIntegration(user.id, service, enabled);
      
      // Update local state
      setConnections(prev => ({ 
        ...prev, 
        [service]: { ...prev[service], enabled }
      }));

      toast({
        title: enabled ? "Integration Enabled" : "Integration Disabled",
        description: `${service} integration has been ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: "Toggle Failed",
        description: `Failed to ${enabled ? 'enable' : 'disable'} ${service} integration`,
        variant: "destructive"
      });
    }
  };

  const allConnected = Object.values(connections).every(service => service.connected);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Connect Your Knowledge Sources
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Integrate with your existing tools and design platforms to create a unified knowledge base with AI-powered design capabilities
            </p>
          </div>

          {/* Integration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <IntegrationCard
              name="Jira"
              description="Connect your project management and issue tracking to get insights on tickets, epics, and release planning."
              icon={<Database className="w-5 h-5" />}
              connected={connections.jira.connected}
              enabled={connections.jira.enabled}
              onConnect={() => handleConnect("jira")}
              onDisconnect={() => handleDisconnect("jira")}
              onToggleEnabled={(enabled) => handleToggleEnabled("jira", enabled)}
            />

            <IntegrationCard
              name="Confluence"
              description="Access your team's documentation, knowledge base articles, and collaborative content."
              icon={<FileText className="w-5 h-5" />}
              connected={connections.confluence.connected}
              enabled={connections.confluence.enabled}
              onConnect={() => handleConnect("confluence")}
              onDisconnect={() => handleDisconnect("confluence")}
              onToggleEnabled={(enabled) => handleToggleEnabled("confluence", enabled)}
            />

            <IntegrationCard
              name="Notion"
              description="Access your Notion workspace pages, databases, and documentation for comprehensive knowledge search."
              icon={<BookOpen className="w-5 h-5" />}
              connected={connections.notion.connected}
              enabled={connections.notion.enabled}
              onConnect={() => handleConnect("notion")}
              onDisconnect={() => handleDisconnect("notion")}
              onToggleEnabled={(enabled) => handleToggleEnabled("notion", enabled)}
            />
          </div>

          {/* Status and Next Steps */}
          <div className="text-center">
            {allConnected ? (
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 bg-success/20 text-success-foreground px-4 py-2 rounded-full border border-success/30">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">All integrations connected!</span>
                </div>
                
                <p className="text-muted-foreground">
                  Your knowledge sources are now being indexed. You can start asking questions to your AI copilot.
                </p>
                
                <Button 
                  onClick={() => navigate("/chat")}
                  className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
                >
                  Start Asking Questions
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Connect at least one integration to start using your Knowledge Copilot
              </p>
            )}
          </div>

          {/* Backend Notice */}
          <div className="mt-16 p-6 bg-gradient-card border border-border/50 rounded-lg">
            <h3 className="font-semibold mb-2 text-warning">⚠️ Backend Required</h3>
            <p className="text-sm text-muted-foreground">
              This demo shows the frontend interface. For full functionality including OAuth flows, 
              API integrations, and vector embeddings, you'll need to connect Supabase for backend services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;