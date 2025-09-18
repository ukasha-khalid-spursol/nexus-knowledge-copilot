import { useState } from "react";
import { IntegrationCard } from "@/components/IntegrationCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Database, FileText, Code, ArrowRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Integrations = () => {
  const [connections, setConnections] = useState({
    jira: false,
    confluence: false,
    sourcegraph: false,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleConnect = (service: keyof typeof connections) => {
    // Simulate connection process
    setTimeout(() => {
      setConnections(prev => ({ ...prev, [service]: true }));
      toast({
        title: "Integration Connected",
        description: `Successfully connected to ${service.charAt(0).toUpperCase() + service.slice(1)}`,
      });
    }, 1000);
    
    toast({
      title: "Connecting...",
      description: `Setting up ${service.charAt(0).toUpperCase() + service.slice(1)} integration`,
    });
  };

  const allConnected = Object.values(connections).every(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Connect Your Knowledge Sources
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Integrate with your existing tools to create a unified knowledge base for your AI copilot
            </p>
          </div>

          {/* Integration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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