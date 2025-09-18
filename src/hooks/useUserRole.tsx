import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "user" | null;

export const useUserRole = (user: User | null) => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // First, try to get role from database
        const { data: roleData, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          // Fallback to metadata
          const metadataRole = user.user_metadata?.role || "user";
          setRole(metadataRole as UserRole);
        } else if (roleData?.role) {
          // Found role in database
          setRole(roleData.role as UserRole);
        } else {
          // No role in database, check metadata and create if needed
          const metadataRole = user.user_metadata?.role;

          if (metadataRole && (metadataRole === "admin" || metadataRole === "user")) {
            // Try to create the missing role entry
            const { error: insertError } = await supabase
              .from("user_roles")
              .insert({ user_id: user.id, role: metadataRole });

            if (insertError) {
              console.error("Failed to create user role:", insertError);
            }

            setRole(metadataRole as UserRole);
          } else {
            // Default to user
            setRole("user");
          }
        }
      } catch (exception) {
        console.error("Error fetching user role:", exception);
        // Emergency fallback
        const fallbackRole = user.user_metadata?.role || "user";
        setRole(fallbackRole as UserRole);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user?.id]); // Only depend on user ID

  const isAdmin = role === "admin";

  return { role, loading, isAdmin };
};