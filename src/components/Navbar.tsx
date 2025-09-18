import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Bot, Settings, MessageSquare, Home } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b border-border/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="w-full px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate("/")}
          >
            <Bot className="w-6 h-6 text-primary" />
            <span className="font-semibold text-lg">Knowledge Copilot</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </Button>
            
            <Button
              variant={isActive("/integrations") ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate("/integrations")}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Integrations
            </Button>
            
            <Button
              variant={isActive("/chat") ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate("/chat")}
              className="gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </Button>
          </div>

          {/* Mobile Menu - Simple version */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const currentIndex = ["/", "/integrations", "/chat"].indexOf(location.pathname);
                const nextPath = ["/", "/integrations", "/chat"][(currentIndex + 1) % 3];
                navigate(nextPath);
              }}
            >
              <Bot className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;