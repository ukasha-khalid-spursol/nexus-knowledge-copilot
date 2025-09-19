import { useState, useEffect } from "react";
import { IntegrationCard } from "@/components/IntegrationCard";
import { CanvaIntegrationCard } from "@/components/integrations/CanvaIntegrationCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Database, FileText, Code, Palette, ArrowRight, CheckCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import type { User } from "@supabase/supabase-js";
import type { CanvaCredentials, CanvaUser } from "@/types/canva";
import { CanvaConnectService } from "@/services/canva/CanvaConnectService";
import Navbar from "@/components/Navbar";

const Integrations = () => {
  const [connections, setConnections] = useState({
    jira: false,
    confluence: false,
    sourcegraph: false,
    canva: false,
  });
  const [canvaCredentials, setCanvaCredentials] = useState<CanvaCredentials | null>(null);
  const [canvaUserInfo, setCanvaUserInfo] = useState<CanvaUser | null>(null);
  const [canvaService, setCanvaService] = useState<CanvaConnectService | null>(null);
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
      if (service === 'canva') {
        // For Canva, we handle the connection differently since it uses OAuth
        handleCanvaConnect();
      } else {
        navigate(`/integrations/setup/${service}`);
        console.log('Navigation called successfully');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      toast({
        title: "Navigation Error",
        description: "Failed to navigate to setup page",
        variant: "destructive"
      });
    }
  };

  const handleCanvaConnect = async () => {
    try {
      // In a real implementation, this would initiate OAuth flow
      // For demo purposes, we'll simulate the connection
      toast({
        title: "OAuth Required",
        description: "Canva integration requires OAuth setup. This would redirect to Canva's authorization page.",
      });

      // Simulate successful connection for demo
      setTimeout(() => {
        setConnections(prev => ({ ...prev, canva: true }));
        // Simulate getting credentials and user info
        const mockCredentials: CanvaCredentials = {
          access_token: "demo_access_token",
          refresh_token: "demo_refresh_token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "design:read design:write"
        };
        const mockUserInfo: CanvaUser = {
          id: "demo_user_id",
          display_name: "Demo User",
          email: "demo@example.com"
        };

        setCanvaCredentials(mockCredentials);
        setCanvaUserInfo(mockUserInfo);

        // Initialize Canva service
        const service = new CanvaConnectService(mockCredentials);
        setCanvaService(service);

        toast({
          title: "Canva Connected",
          description: "Successfully connected to Canva (demo mode)",
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Canva",
        variant: "destructive"
      });
    }
  };

  const handleCanvaDisconnect = async () => {
    try {
      setConnections(prev => ({ ...prev, canva: false }));
      setCanvaCredentials(null);
      setCanvaUserInfo(null);
      setCanvaService(null);

      toast({
        title: "Canva Disconnected",
        description: "Successfully disconnected from Canva",
      });
    } catch (error) {
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect from Canva",
        variant: "destructive"
      });
    }
  };

  const handleCanvaConfigure = () => {
    // Navigate to a configuration page or open a dialog
    toast({
      title: "Configuration",
      description: "Canva configuration options would be available here",
    });
  };

  const allConnected = Object.values(connections).every(Boolean);

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
              connected={connections.jira}
              onConnect={() => handleConnect("jira")}
            />

            <IntegrationCard
              name="Confluence"
              description="Access your team's documentation, knowledge base articles, and collaborative content."
              icon={<FileText className="w-5 h-5" />}
              connected={connections.confluence}
              onConnect={() => handleConnect("confluence")}
            />

            <IntegrationCard
              name="Sourcegraph"
              description="Index your codebase for intelligent code search and understanding with AI-powered insights."
              icon={<Code className="w-5 h-5" />}
              connected={connections.sourcegraph}
              onConnect={() => handleConnect("sourcegraph")}
            />

            <CanvaIntegrationCard
              isConnected={connections.canva}
              credentials={canvaCredentials}
              userInfo={canvaUserInfo}
              onConnect={handleCanvaConnect}
              onDisconnect={handleCanvaDisconnect}
              onConfigure={handleCanvaConfigure}
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