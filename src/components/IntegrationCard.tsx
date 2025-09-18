import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, ExternalLink } from "lucide-react";

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  onConnect: () => void;
}

export const IntegrationCard = ({ name, description, icon, connected, onConnect }: IntegrationCardProps) => {
  return (
    <Card className="bg-gradient-card border-border/50 p-6 hover:border-primary/30 transition-all duration-300 group relative">
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{name}</h3>
            <Badge 
              variant={connected ? "default" : "secondary"}
              className={connected ? "bg-success/20 text-success-foreground border-success/30" : ""}
            >
              {connected ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> Connected</>
              ) : (
                <><Circle className="w-3 h-3 mr-1" /> Not Connected</>
              )}
            </Badge>
          </div>
        </div>
      </div>
      
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      
      <Button 
        onClick={(e) => {
          console.log('Button clicked for:', name);
          e.preventDefault();
          e.stopPropagation();
          onConnect();
        }}
        variant={connected ? "secondary" : "default"}
        className="w-full relative z-10 cursor-pointer hover:cursor-pointer"
        disabled={connected}
      >
        {connected ? "Connected" : "Connect"}
        <ExternalLink className="w-4 h-4 ml-2" />
      </Button>
    </Card>
  );
};