import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Bot, Database, FileText, Code, ArrowRight, Zap, Shield, Brain } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background/50 to-background" />
        
        <div className="relative container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-primary/20 text-primary-foreground border-primary/30">
              <Bot className="w-3 h-3 mr-1" />
              AI-Powered Knowledge Assistant
            </Badge>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Knowledge Integration
              </span>
              <br />
              <span className="text-foreground">Copilot</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Unify your Jira, Confluence, and codebase into an intelligent AI assistant. 
              Get instant answers about your project with source attribution.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                onClick={() => navigate("/integrations")}
                className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow text-lg px-8 py-6"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate("/chat")}
                className="border-border/50 hover:border-primary/50 text-lg px-8 py-6"
              >
                Try Demo
                <Bot className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Intelligent Knowledge Integration</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect all your development tools and documentation into a single, searchable AI assistant
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="p-8 bg-gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Jira Integration</h3>
              <p className="text-muted-foreground">
                Access issues, epics, and release information. Get insights on project status and blockers.
              </p>
            </Card>

            <Card className="p-8 bg-gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Confluence Knowledge</h3>
              <p className="text-muted-foreground">
                Search through documentation, team knowledge, and collaborative content instantly.
              </p>
            </Card>

            <Card className="p-8 bg-gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Code className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Code Understanding</h3>
              <p className="text-muted-foreground">
                Powered by Sourcegraph, understand your codebase architecture and find specific implementations.
              </p>
            </Card>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/20">
              <Zap className="w-5 h-5 text-warning" />
              <span className="font-medium">Instant Answers</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/20">
              <Shield className="w-5 h-5 text-success" />
              <span className="font-medium">Source Attribution</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/20">
              <Brain className="w-5 h-5 text-info" />
              <span className="font-medium">AI-Powered RAG</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backend Notice */}
      <div className="container mx-auto px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 bg-gradient-card border border-warning/30">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4 text-warning">⚡ Backend Integration Required</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                This prototype demonstrates the frontend interface. For full functionality including OAuth flows, 
                API integrations, embeddings, and vector search, connect your project to Supabase.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => navigate("/integrations")}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  View Integration Setup
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
