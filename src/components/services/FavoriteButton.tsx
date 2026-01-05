"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

interface FavoriteButtonProps {
  serviceProviderId: Id<"serviceProviders">;
  providerName: string;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "button";
  className?: string;
}

const SIZES = {
  sm: { icon: "w-4 h-4", button: "w-8 h-8" },
  md: { icon: "w-5 h-5", button: "w-10 h-10" },
  lg: { icon: "w-6 h-6", button: "w-12 h-12" },
};

export function FavoriteButton({
  serviceProviderId,
  providerName,
  size = "md",
  variant = "icon",
  className = "",
}: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticFavorited, setOptimisticFavorited] = useState<boolean | null>(null);

  const isFavorited = useQuery(
    api.services.favorites.isFavorited,
    isAuthenticated ? { serviceProviderId } : "skip"
  );
  const toggleFavorite = useMutation(api.services.favorites.toggle);

  // Use optimistic state if available, otherwise use query result
  const showFavorited = optimisticFavorited !== null ? optimisticFavorited : isFavorited;

  // Reset optimistic state when query updates
  useEffect(() => {
    if (isFavorited !== undefined && optimisticFavorited !== null) {
      if (isFavorited === optimisticFavorited) {
        setOptimisticFavorited(null);
      }
    }
  }, [isFavorited, optimisticFavorited]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please sign in to save favorites");
      router.push("/login");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    // Optimistic update
    setOptimisticFavorited(!showFavorited);

    try {
      const result = await toggleFavorite({ serviceProviderId });
      if (result.action === "added") {
        toast.success(`${providerName} added to favorites`);
      } else {
        toast.success(`${providerName} removed from favorites`);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorites");
      // Revert optimistic update
      setOptimisticFavorited(null);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeConfig = SIZES[size];

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg font-medium transition-colors ${
          showFavorited
            ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
            : "border-border bg-background hover:bg-muted text-foreground"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
        aria-label={showFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart
          className={`${sizeConfig.icon} ${showFavorited ? "fill-red-500 text-red-500" : ""}`}
        />
        {showFavorited ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`${sizeConfig.button} rounded-full flex items-center justify-center transition-all ${
        showFavorited
          ? "bg-red-50 dark:bg-red-900/30"
          : "bg-white/90 dark:bg-black/50 hover:bg-white dark:hover:bg-black"
      } ${isLoading ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      aria-label={showFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`${sizeConfig.icon} transition-colors ${
          showFavorited
            ? "fill-red-500 text-red-500"
            : "text-muted-foreground hover:text-red-500"
        }`}
      />
    </button>
  );
}
