import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, Circle, ExternalLink, Settings, Plus } from "lucide-react";

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  enabled?: boolean;
  onConnect: () => void;
  onDisconnect?: () => void;
  onToggleEnabled?: (enabled: boolean) => void;
}

export const IntegrationCard = ({ name, description, icon, connected, enabled = true, onConnect, onDisconnect, onToggleEnabled }: IntegrationCardProps) => {
  return (
    <Card className="bg-gradient-card border-border/50 p-6 hover:border-primary/30 transition-all duration-300 group relative">
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{name}</h3>
            <div className="flex items-center gap-2">
              <Badge 
                variant={connected ? "default" : "secondary"}
                className={connected ? "bg-success/20 text-success-foreground border-success/30" : ""}
              >
                {connected ? (
                  <><CheckCircle className="w-3 h-3 mr-1" /> Added</>
                ) : (
                  <><Circle className="w-3 h-3 mr-1" /> Not Added</>
                )}
              </Badge>
              {connected && (
                <Badge 
                  variant={enabled ? "default" : "secondary"}
                  className={enabled ? "bg-primary/20 text-primary-foreground border-primary/30" : "bg-muted text-muted-foreground"}
                >
                  {enabled ? "Enabled" : "Disabled"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      
      {connected && onToggleEnabled && (
        <div className="flex items-center justify-between mb-4 p-3 bg-background/50 rounded-lg border border-border/30">
          <Label htmlFor={`${name}-toggle`} className="text-sm font-medium">
            Enable Integration
          </Label>
          <Switch
            id={`${name}-toggle`}
            checked={enabled}
            onCheckedChange={onToggleEnabled}
          />
        </div>
      )}
      
      {connected ? (
        <div className="flex gap-2">
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConnect();
            }}
            variant="outline"
            className="flex-1"
          >
            <Settings className="w-4 h-4 mr-2" />
            Edit
          </Button>
          {onDisconnect && (
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDisconnect();
              }}
              variant="destructive"
              size="sm"
            >
              Remove
            </Button>
          )}
        </div>
      ) : (
        <Button 
          onClick={(e) => {
            console.log('Button clicked for:', name);
            e.preventDefault();
            e.stopPropagation();
            onConnect();
          }}
          variant="default"
          className="w-full relative z-10 cursor-pointer hover:cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Integration
        </Button>
      )}
    </Card>
  );
};