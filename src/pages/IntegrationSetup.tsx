import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Key, Shield, CheckCircle, Globe, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { JiraIntegrationService, type JiraCredentials } from "@/services/jira/JiraIntegrationService";
import Navbar from "@/components/Navbar";

const IntegrationSetup = () => {
  const { service } = useParams<{ service: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [jiraUrl, setJiraUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const serviceInfo = {
    jira: {
      name: "Jira",
      description: "Connect your Jira instance to access tickets, projects, and workflows",
      placeholder: "Enter your Jira API token",
      helpText: "You can generate an API token in your Atlassian account settings"
    },
    confluence: {
      name: "Confluence",
      description: "Access your Confluence spaces, pages, and documentation", 
      placeholder: "Enter your Confluence API token",
      helpText: "Use the same API token from your Atlassian account"
    },
    sourcegraph: {
      name: "Sourcegraph",
      description: "Index your codebase for intelligent code search and analysis",
      placeholder: "Enter your Sourcegraph access token", 
      helpText: "Generate an access token in your Sourcegraph user settings"
    }
  };

  const currentService = serviceInfo[service as keyof typeof serviceInfo];

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your API key to continue",
        variant: "destructive"
      });
      return;
    }

    // Validate Jira-specific fields
    if (service === 'jira' && (!jiraUrl.trim() || !jiraEmail.trim())) {
      toast({
        title: "Required Fields Missing",
        description: "Please enter your Jira URL and email address",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);

    try {
      const user = (await supabase.auth.getSession()).data.session?.user;
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (service === 'jira') {
        console.log('Attempting Jira validation with:', { 
          baseUrl: jiraUrl, 
          email: jiraEmail, 
          hasToken: !!apiKey 
        });

        const credentials: JiraCredentials = { 
          baseUrl: jiraUrl.trim(), 
          email: jiraEmail.trim(), 
          apiToken: apiKey.trim() 
        };
        
        const jiraService = new JiraIntegrationService(credentials);
        const validation = await jiraService.validateCredentials();
        
        console.log('Validation result:', validation);
        
        if (!validation.isValid) {
          // Handle CORS errors gracefully
          if (validation.error?.includes('Cannot reach Jira instance') || 
              validation.error?.includes('Connection failed') ||
              validation.error?.includes('fetch')) {
            
            const shouldProceed = window.confirm(
              `Validation failed due to browser security restrictions (CORS):\n\n${validation.error}\n\nThis is normal for Jira instances. Would you like to save the integration anyway? The credentials will be tested when the chat tries to use them.`
            );
            
            if (!shouldProceed) {
              setIsConnecting(false);
              return;
            }
            
            console.log('User chose to proceed despite CORS validation failure');
          } else {
            throw new Error(validation.error || "Invalid Jira credentials");
          }
        }

        await JiraIntegrationService.saveIntegration(user.id, credentials);
        console.log('Jira integration saved successfully');
      } else {
        // Simulate API validation for other services
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      toast({
        title: "Integration Connected!",
        description: `Successfully connected to ${currentService.name}`,
      });

      // Navigate back to integrations page
      navigate("/integrations");
    } catch (error) {
      console.error('Integration connection error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (!currentService) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Integration Not Found</h1>
            <Button onClick={() => navigate("/integrations")}>
              Back to Integrations
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/integrations")}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Connect to {currentService.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {currentService.description}
              </p>
            </div>
          </div>

          {/* Setup Card */}
          <Card className="bg-gradient-card border-border/50 p-8">
            <div className="space-y-6">
              {/* Security Notice */}
              <div className="flex items-start gap-3 p-4 bg-info/10 border border-info/20 rounded-lg">
                <Shield className="w-5 h-5 text-info mt-0.5" />
                <div>
                  <h3 className="font-medium text-info-foreground">Secure Connection</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your API key will be encrypted and stored securely. We never share your credentials.
                  </p>
                </div>
              </div>

              {/* API Key Input */}
              <div className="space-y-3">
                <Label htmlFor="apiKey" className="text-base font-medium flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  API Key
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={currentService.placeholder}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="text-base"
                />
                <p className="text-sm text-muted-foreground">
                  {currentService.helpText}
                </p>
              </div>

              {/* Jira-specific fields */}
              {service === 'jira' && (
                <>
                  <div className="space-y-3">
                    <Label htmlFor="jiraUrl" className="text-base font-medium flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Jira Instance URL
                    </Label>
                    <Input
                      id="jiraUrl"
                      type="url"
                      placeholder="https://yourcompany.atlassian.net"
                      value={jiraUrl}
                      onChange={(e) => setJiraUrl(e.target.value)}
                      className="text-base"
                    />
                    <p className="text-sm text-muted-foreground">
                      Your Jira instance URL (e.g., https://yourcompany.atlassian.net)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="jiraEmail" className="text-base font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </Label>
                    <Input
                      id="jiraEmail"
                      type="email"
                      placeholder="your.email@company.com"
                      value={jiraEmail}
                      onChange={(e) => setJiraEmail(e.target.value)}
                      className="text-base"
                    />
                    <p className="text-sm text-muted-foreground">
                      The email address associated with your Jira account
                    </p>
                  </div>
                </>
              )}

              {/* Connect Button */}
              <Button 
                onClick={handleConnect}
                disabled={
                  isConnecting || 
                  !apiKey.trim() || 
                  (service === 'jira' && (!jiraUrl.trim() || !jiraEmail.trim()))
                }
                className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Connect Integration
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Help Section */}
          <div className="mt-8 p-6 bg-gradient-card border border-border/50 rounded-lg">
            <h3 className="font-semibold mb-3 text-foreground">Need Help?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Make sure your API key has the necessary permissions</li>
              <li>• Check that your {currentService.name} instance is accessible</li>
              <li>• Verify the API key format is correct</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSetup;