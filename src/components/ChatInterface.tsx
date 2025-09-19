import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationsService } from "@/services/integrations/IntegrationsService";
import type { User } from "@supabase/supabase-js";

interface MockResponse {
  content: string;
  sources?: Array<{
    title: string;
    type: "jira" | "confluence" | "notion" | "code";
    url: string;
  }>;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    title: string;
    type: "jira" | "confluence" | "notion" | "code";
    url: string;
  }>;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getCurrentUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const mockResponses: Record<string, MockResponse> = {
    "setup": {
      content: "To set up your local development environment, you'll need to:\n\n1. Clone the repository from GitHub\n2. Install Node.js (version 18+) and npm\n3. Run `npm install` to install dependencies\n4. Copy `.env.example` to `.env` and configure your API keys\n5. Run `npm run dev` to start the development server\n\nThe setup documentation is detailed in our Confluence space with step-by-step instructions.",
      sources: [
        { title: "Local Development Setup Guide", type: "confluence" as const, url: "#" },
        { title: "Environment Configuration", type: "code" as const, url: "#" },
        { title: "DEV-123: Development Environment", type: "jira" as const, url: "#" }
      ]
    },
    "release": {
      content: "Based on the current Q1 release tracking, here are the main blockers:\n\n• **Authentication Bug** (CRITICAL) - OAuth flow failing in production\n• **Performance Issue** - API response times exceeding 2s threshold\n• **Missing Tests** - 3 core features lack sufficient test coverage\n\nThe release is currently at 78% completion with 5 days remaining in the sprint.",
      sources: [
        { title: "PROJ-456: Q1 Release Tracking", type: "jira" as const, url: "#" },
        { title: "Release Notes Template", type: "confluence" as const, url: "#" },
        { title: "Performance Monitoring Dashboard", type: "code" as const, url: "#" }
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

    // Search across integrated services
    const handleSearch = async () => {
      try {
        if (user) {
          const results = await IntegrationsService.searchAcrossIntegrations(user.id, input);
          
          if (results.length > 0) {
            const assistantMessage: ChatMessage = {
              role: "assistant",
              content: `I found ${results.length} relevant results from your integrated services:`,
              sources: results.map(result => ({
                title: result.title,
                type: result.type,
                url: result.url
              }))
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
            return;
          }
        }

        // Fall back to mock responses
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
      } catch (error) {
        console.error('Search failed:', error);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "I'm sorry, there was an error searching your knowledge base. Please try again.",
          sources: []
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    handleSearch();
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "jira": return "🎫";
      case "confluence": return "📝";
      case "notion": return "📚";
      case "code": return "💻";
      default: return "📄";
    }
  };

  const getSourceColor = (type: string) => {
    switch (type) {
      case "jira": return "bg-info/20 text-info-foreground border-info/30";
      case "confluence": return "bg-warning/20 text-warning-foreground border-warning/30";
      case "notion": return "bg-primary/20 text-primary-foreground border-primary/30";
      case "code": return "bg-success/20 text-success-foreground border-success/30";
      default: return "bg-muted";
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-gradient-card border border-border/50 rounded-lg">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/30">
        <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
          <span className="text-sm font-bold text-primary-foreground">AI</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Knowledge Copilot</h3>
          <p className="text-xs text-muted-foreground">
            Ask about your projects, documentation, and code
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 space-y-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">👋 Welcome to your Knowledge Copilot!</p>
              <p className="text-sm text-muted-foreground">
                Ask me about your Jira tickets, Confluence docs, or Notion pages
              </p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
              {message.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-xs font-bold text-primary-foreground">AI</span>
                </div>
              )}
              
              <Card className={`max-w-[80%] p-4 ${
                message.role === "user" 
                  ? "bg-primary text-primary-foreground ml-auto" 
                  : "bg-background border-border/50"
              }`}>
                <div className="space-y-3">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>

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
                              {source.type.replace('_', ' ')}
                            </Badge>
                            <ExternalLink className="w-3 h-3 ml-2" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {message.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-xs font-bold">You</span>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs font-bold text-primary-foreground">AI</span>
              </div>
              <Card className="bg-background border-border/50 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-150" />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-300" />
                  <span className="text-sm ml-2">Searching your knowledge base...</span>
                </div>
              </Card>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border/30">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your projects, docs, or code..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};