import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Palette, ExternalLink, Settings, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CanvaConnectService } from "@/services/canva/CanvaConnectService";
import { canvaMCPClient } from "@/services/canva/CanvaMCPClient";
import type { CanvaCredentials, CanvaUser } from "@/types/canva";

interface CanvaIntegrationCardProps {
  isConnected: boolean;
  credentials?: CanvaCredentials;
  userInfo?: CanvaUser;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onConfigure: () => void;
}

export const CanvaIntegrationCard = ({
  isConnected,
  credentials,
  userInfo,
  onConnect,
  onDisconnect,
  onConfigure,
}: CanvaIntegrationCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [mcpStatus, setMcpStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await onConnect();
      toast({
        title: "Canva Connected",
        description: "Successfully connected to your Canva account.",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Canva. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await onDisconnect();
      setMcpEnabled(false);
      setMcpStatus('disconnected');
      await canvaMCPClient.disconnect();
      toast({
        title: "Canva Disconnected",
        description: "Successfully disconnected from Canva.",
      });
    } catch (error) {
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect from Canva.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMcpToggle = async (enabled: boolean) => {
    if (!isConnected) {
      toast({
        title: "Connect First",
        description: "Please connect to Canva before enabling MCP server.",
        variant: "destructive",
      });
      return;
    }

    setMcpEnabled(enabled);

    if (enabled) {
      setMcpStatus('connecting');
      try {
        await canvaMCPClient.connect();
        const isConnected = await canvaMCPClient.ping();
        if (isConnected) {
          setMcpStatus('connected');
          toast({
            title: "MCP Server Connected",
            description: "Canva MCP server is now available for AI-powered design generation.",
          });
        } else {
          throw new Error("MCP server ping failed");
        }
      } catch (error) {
        console.error("MCP Connection Error:", error);
        setMcpStatus('error');
        setMcpEnabled(false);
        toast({
          title: "MCP Connection Failed",
          description: `Failed to connect to Canva MCP server on port 3005. Error: ${error.message}`,
          variant: "destructive",
        });
      }
    } else {
      try {
        await canvaMCPClient.disconnect();
        setMcpStatus('disconnected');
        toast({
          title: "MCP Server Disconnected",
          description: "Canva MCP server has been disconnected.",
        });
      } catch (error) {
        console.error("Error disconnecting MCP:", error);
      }
    }
  };

  const getMcpStatusIcon = () => {
    switch (mcpStatus) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getMcpStatusText = () => {
    switch (mcpStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Palette className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-sm font-medium">Canva</CardTitle>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"}>
          {isConnected ? "Connected" : "Disconnected"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription>
          Create and edit designs with AI-powered tools through Canva's design platform.
        </CardDescription>

        {isConnected && userInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Account:</span>
              <span className="font-medium">{userInfo.display_name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{userInfo.email}</span>
            </div>
            {userInfo.team_id && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Team ID:</span>
                <span className="font-medium">{userInfo.team_id}</span>
              </div>
            )}
          </div>
        )}

        {isConnected && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">MCP Server</span>
                <div className="flex items-center space-x-1">
                  {getMcpStatusIcon()}
                  <span className="text-xs text-muted-foreground">
                    {getMcpStatusText()}
                  </span>
                </div>
              </div>
              <Switch
                checked={mcpEnabled}
                onCheckedChange={handleMcpToggle}
                disabled={isLoading || mcpStatus === 'connecting'}
              />
            </div>
            {mcpEnabled && mcpStatus === 'connected' && (
              <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded border">
                AI-powered design generation is enabled. You can now create designs through chat.
              </div>
            )}
            {mcpEnabled && mcpStatus === 'error' && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
                MCP server connection failed. Please ensure the Canva MCP server is running on localhost:3005.
              </div>
            )}
          </div>
        )}

        <div className="flex space-x-2">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Connecting..." : "Connect to Canva"}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Disconnecting..." : "Disconnect"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onConfigure}
                title="Configure Integration"
              >
                <Settings className="h-4 w-4" />
              </Button>
              {userInfo && (
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                  title="Open Canva Dashboard"
                >
                  <a
                    href="https://www.canva.com/folder/all-projects"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};