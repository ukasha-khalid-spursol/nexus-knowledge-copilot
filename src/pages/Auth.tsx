import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Mail, Lock, User } from "lucide-react";
import Navbar from "@/components/Navbar";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/integrations");
      }
    };
    checkUser();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName || email.split("@")[0]
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Account exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link to complete your registration.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
        navigate("/integrations");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">Welcome to Knowledge Copilot</h1>
            <p className="text-muted-foreground">Sign in to access your integrations</p>
          </div>

          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-primary hover:opacity-90"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Display Name (Optional)</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Your display name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Choose a password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-primary hover:opacity-90"
                      disabled={loading}
                    >
                      {loading ? "Creating account..." : "Sign Up"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;