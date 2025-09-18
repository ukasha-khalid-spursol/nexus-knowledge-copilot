import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "user" | null;

export const useUserRole = (user: User | null) => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      // If no user, reset everything
      if (!user) {
        setRole(null);
        setLoading(false);
        setCurrentUserId(null);
        return;
      }

      // If it's the same user and we already have their ID tracked, skip fetching
      if (currentUserId === user.id) {
        setLoading(false);
        return;
      }

      // Set the new user ID and start loading
      setCurrentUserId(user.id);
      setLoading(true);

      console.log("useUserRole: Fetching role for user:", user.id);
      
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        console.log("useUserRole: Database response:", { data, error });

        if (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
        } else {
          const userRole = data?.role || null;
          console.log("useUserRole: Setting role to:", userRole);
          setRole(userRole);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user?.id, currentUserId]); // Include currentUserId in dependencies

  console.log("useUserRole: Current state:", { role, loading, isAdmin: role === "admin" });

  return { role, loading, isAdmin: role === "admin" };
};