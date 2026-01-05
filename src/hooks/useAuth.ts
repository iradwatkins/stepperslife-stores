"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  _id: string;
  email: string;
  name?: string;
  role?: "admin" | "organizer" | "user";
  image?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include", // Include cookies in request
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        // Don't log expected 401 errors to console
        // This endpoint is supplementary - Convex auth is primary
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      // Only log unexpected errors (not 401/403)
      if (error instanceof Error && !error.message.includes("401") && !error.message.includes("403")) {
        console.error("Auth check failed:", error);
      }
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // Include cookies in request
      });
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return {
    user: authState.user,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    logout,
    refresh: checkAuth,
  };
}
