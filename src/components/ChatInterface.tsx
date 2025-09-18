import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, ExternalLink, Loader2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    title: string;
    type: "jira" | "confluence" | "code";
    url: string;
  }>;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const mockResponses = {
    "setup": {
      content: "To set up your local development environment, you'll need to:\n\n1. Clone the repository from GitHub\n2. Install Node.js (version 18+) and npm\n3. Run `npm install` to install dependencies\n4. Copy `.env.example` to `.env` and configure your API keys\n5. Run `npm run dev` to start the development server\n\nThe setup documentation is detailed in our Confluence space with step-by-step instructions.",
      sources: [
        { title: "Local Development Setup Guide", type: "confluence" as const, url: "#" },
        { title: "Environment Configuration", type: "code" as const, url: "#" },
        { title: "DEV-123: Update setup instructions", type: "jira" as const, url: "#" }
      ]
    },
    "release": {
      content: "Based on the current Q1 release tracking, here are the main blockers:\n\n• **Authentication Bug** (CRITICAL) - OAuth flow failing in production\n• **Performance Issue** - API response times exceeding 2s threshold\n• **Missing Tests** - 3 core features lack sufficient test coverage\n\nThe release is currently at 78% completion with 5 days remaining in the sprint.",
      sources: [
        { title: "PROJ-456: Q1 Release Tracking", type: "jira" as const, url: "#" },
        { title: "Performance Monitoring Dashboard", type: "confluence" as const, url: "#" },
        { title: "Test Coverage Report", type: "code" as const, url: "#" }
      ]
    },
    "oauth": {
      content: "OAuth authentication is handled in several key locations:\n\n• **Primary Handler**: `src/auth/oauth.service.ts` - Main OAuth flow implementation\n• **Route Configuration**: `src/routes/auth.routes.ts` - Defines OAuth endpoints\n• **Middleware**: `src/middleware/auth.middleware.ts` - Token validation\n• **Frontend Integration**: `src/components/AuthProvider.tsx` - React context setup\n\nThe flow follows OAuth 2.0 PKCE standard for security.",
      sources: [
        { title: "OAuth Service Implementation", type: "code" as const, url: "#" },
        { title: "Authentication Architecture", type: "confluence" as const, url: "#" },
        { title: "AUTH-789: OAuth Implementation", type: "jira" as const, url: "#" }
      ]
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate API delay
    setTimeout(() => {
      let response = mockResponses.setup;
      
      if (input.toLowerCase().includes("release") || input.toLowerCase().includes("blocking")) {
        response = mockResponses.release;
      } else if (input.toLowerCase().includes("oauth") || input.toLowerCase().includes("auth")) {
        response = mockResponses.oauth;
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.content,
        sources: response.sources
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "jira": return "🎫";
      case "confluence": return "📝";
      case "code": return "💻";
      default: return "📄";
    }
  };

  const getSourceColor = (type: string) => {
    switch (type) {
      case "jira": return "bg-info/20 text-info-foreground border-info/30";
      case "confluence": return "bg-warning/20 text-warning-foreground border-warning/30";
      case "code": return "bg-success/20 text-success-foreground border-success/30";
      default: return "bg-muted";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-5xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-medium mb-2">Ask me anything about your project</h3>
            <p className="text-muted-foreground">Try asking about setup, releases, or code architecture</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-4xl mx-auto">
              <Card className="p-4 bg-gradient-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer" 
                    onClick={() => setInput("How do I set up local dev?")}>
                <h4 className="font-medium mb-2">🚀 Onboarding</h4>
                <p className="text-sm text-muted-foreground">"How do I set up local dev?"</p>
              </Card>
              <Card className="p-4 bg-gradient-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => setInput("What's blocking the Q1 release?")}>
                <h4 className="font-medium mb-2">📊 Release Check</h4>
                <p className="text-sm text-muted-foreground">"What's blocking the Q1 release?"</p>
              </Card>
              <Card className="p-4 bg-gradient-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => setInput("Where is OAuth handled in the repo?")}>
                <h4 className="font-medium mb-2">💻 Code Q&A</h4>
                <p className="text-sm text-muted-foreground">"Where is OAuth handled in the repo?"</p>
              </Card>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`flex gap-4 ${message.role === "user" ? "justify-end" : ""}`}>
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div className={`max-w-3xl ${message.role === "user" ? "order-first" : ""}`}>
                <Card className={`p-4 ${
                  message.role === "user" 
                    ? "bg-primary/10 border-primary/20 ml-auto" 
                    : "bg-gradient-card border-border/50"
                }`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  
                  {message.sources && (
                    <div className="mt-4 pt-4 border-t border-border/30">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">SOURCES</h4>
                      <div className="space-y-2">
                        {message.sources.map((source, idx) => (
                          <Button
                            key={idx}
                            variant="ghost"
                            className="h-auto p-2 w-full justify-start text-left hover:bg-secondary/50"
                            onClick={() => window.open(source.url, '_blank')}
                          >
                            <span className="mr-2">{getSourceIcon(source.type)}</span>
                            <span className="flex-1 text-sm">{source.title}</span>
                            <Badge className={`ml-2 text-xs ${getSourceColor(source.type)}`}>
                              {source.type}
                            </Badge>
                            <ExternalLink className="w-3 h-3 ml-2" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
              
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <Card className="p-4 bg-gradient-card border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Searching knowledge base...</span>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/30 p-4">
        <div className="max-w-5xl mx-auto w-full">
          <form onSubmit={handleSubmit} className="flex gap-4">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your project, code, or releases..."
              className="pr-12 bg-primary/5 border-border/50 focus:border-primary/50"
              disabled={isLoading}
            />
          </div>
          <Button type="submit" disabled={!input.trim() || isLoading} className="px-6">
            <Send className="w-4 h-4" />
          </Button>
        </form>
        </div>
      </div>
    </div>
  );
};