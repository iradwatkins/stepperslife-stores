"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: Id<"products">;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function WishlistButton({
  productId,
  className,
  size = "md",
  showLabel = false,
}: WishlistButtonProps) {
  const [isToggling, setIsToggling] = useState(false);

  const isInWishlist = useQuery(api.productWishlists.isInWishlist, { productId });
  const toggleWishlist = useMutation(api.productWishlists.toggle);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isToggling) return;

    setIsToggling(true);
    try {
      await toggleWishlist({ productId });
    } catch (error) {
      console.error("Failed to toggle wishlist:", error);
    } finally {
      setIsToggling(false);
    }
  };

  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  // Loading state while checking wishlist status
  if (isInWishlist === undefined) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "rounded-full bg-white/90 dark:bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all",
          sizeClasses[size],
          className
        )}
      >
        <Loader2 className={cn("animate-spin text-muted-foreground", iconSizes[size])} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isToggling}
      className={cn(
        "rounded-full bg-white/90 dark:bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95",
        sizeClasses[size],
        isInWishlist
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
        className
      )}
      aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      {isToggling ? (
        <Loader2 className={cn("animate-spin", iconSizes[size])} />
      ) : (
        <Heart
          className={cn(
            iconSizes[size],
            isInWishlist && "fill-current"
          )}
        />
      )}
      {showLabel && (
        <span className="ml-1.5 text-sm font-medium">
          {isInWishlist ? "Saved" : "Save"}
        </span>
      )}
    </button>
  );
}

// Simple heart icon for unauthenticated users (redirects to login)
export function WishlistButtonGuest({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Redirect to login with return URL
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }}
      className={cn(
        "rounded-full bg-white/90 dark:bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
        sizeClasses[size],
        className
      )}
      aria-label="Sign in to save to wishlist"
    >
      <Heart className={iconSizes[size]} />
    </button>
  );
}
