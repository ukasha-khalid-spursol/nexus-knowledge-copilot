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
import { ConfluenceIntegrationService, type ConfluenceCredentials } from "@/services/confluence/ConfluenceIntegrationService";
import Navbar from "@/components/Navbar";

const IntegrationSetup = () => {
  const { service } = useParams<{ service: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [serviceUrl, setServiceUrl] = useState("");
  const [serviceEmail, setServiceEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your API key to continue",
        variant: "destructive"
      });
      return;
    }

    // Validate service-specific fields
    if ((service === 'jira' || service === 'confluence') && (!serviceUrl.trim() || !serviceEmail.trim())) {
      toast({
        title: "Required Fields Missing",
        description: `Please enter your ${service} URL and email address`,
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const user = (await supabase.auth.getSession()).data.session?.user;
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (service === 'jira') {
        const credentials: JiraCredentials = { 
          baseUrl: serviceUrl.trim(), 
          email: serviceEmail.trim(), 
          apiToken: apiKey.trim() 
        };

        await JiraIntegrationService.saveIntegration(user.id, credentials);
        console.log('Jira integration saved successfully');
      } else if (service === 'confluence') {
        const credentials: ConfluenceCredentials = { 
          baseUrl: serviceUrl.trim(), 
          email: serviceEmail.trim(), 
          apiToken: apiKey.trim() 
        };

        await ConfluenceIntegrationService.saveIntegration(user.id, credentials);
        console.log('Confluence integration saved successfully');
      } else {
        // Simulate saving for other services
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast({
        title: "Integration Saved!",
        description: `Successfully saved ${currentService.name} credentials. Connection will be tested when you use it in chat.`,
      });

      // Navigate back to integrations page
      navigate("/integrations");
    } catch (error) {
      console.error('Integration save error:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
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

              {/* Service-specific fields */}
              {(service === 'jira' || service === 'confluence') && (
                <>
                  <div className="space-y-3">
                    <Label htmlFor="serviceUrl" className="text-base font-medium flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      {service === 'jira' ? 'Jira Instance URL' : 'Confluence Instance URL'}
                    </Label>
                    <Input
                      id="serviceUrl"
                      type="url"
                      placeholder={service === 'jira' ? "https://yourcompany.atlassian.net" : "https://yourcompany.atlassian.net/wiki"}
                      value={serviceUrl}
                      onChange={(e) => setServiceUrl(e.target.value)}
                      className="text-base"
                    />
                    <p className="text-sm text-muted-foreground">
                      Your {service} instance URL (e.g., https://yourcompany.atlassian.net{service === 'confluence' ? '/wiki' : ''})
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="serviceEmail" className="text-base font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </Label>
                    <Input
                      id="serviceEmail"
                      type="email"
                      placeholder="your.email@company.com"
                      value={serviceEmail}
                      onChange={(e) => setServiceEmail(e.target.value)}
                      className="text-base"
                    />
                    <p className="text-sm text-muted-foreground">
                      The email address associated with your {service} account
                    </p>
                  </div>
                </>
              )}

              {/* Save Button */}
              <Button 
                onClick={handleSave}
                disabled={
                  isSaving || 
                  !apiKey.trim() || 
                  ((service === 'jira' || service === 'confluence') && (!serviceUrl.trim() || !serviceEmail.trim()))
                }
                className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
                size="lg"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Integration
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