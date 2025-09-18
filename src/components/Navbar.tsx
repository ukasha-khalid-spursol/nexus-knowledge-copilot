import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Bot, Settings, MessageSquare, Home, User, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
            {user ? (
              <>
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

                <Button
                  variant={isActive("/profile") ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/profile")}
                  className="gap-2"
                >
                  <User className="w-4 h-4" />
                  Profile
                </Button>
              </>
            ) : (
              <Button
                variant={isActive("/auth") ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate("/auth")}
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu - Simple version */}
          <div className="md:hidden">
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const routes = ["/integrations", "/chat", "/profile"];
                  const currentIndex = routes.indexOf(location.pathname);
                  const nextPath = routes[(currentIndex + 1) % routes.length];
                  navigate(nextPath);
                }}
              >
                <Bot className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;