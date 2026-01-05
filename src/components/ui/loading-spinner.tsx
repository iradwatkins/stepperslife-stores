import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** If true, centers the spinner in a full-height container */
  fullPage?: boolean;
  /** Optional text to show below the spinner */
  text?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

/**
 * Unified loading spinner component for consistent loading states across the app.
 * Use this instead of custom spinner implementations.
 *
 * @example
 * // Simple spinner
 * <LoadingSpinner />
 *
 * @example
 * // Full page loading
 * <LoadingSpinner fullPage size="lg" text="Loading..." />
 *
 * @example
 * // Small inline spinner
 * <LoadingSpinner size="sm" />
 */
export function LoadingSpinner({
  size = "md",
  className,
  fullPage = false,
  text,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Card skeleton for loading states in card layouts.
 * Provides a consistent loading placeholder for card content.
 */
export function LoadingCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse space-y-4 p-6", className)}>
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="h-4 bg-muted rounded w-1/2"></div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded"></div>
        <div className="h-3 bg-muted rounded w-5/6"></div>
      </div>
    </div>
  );
}

/**
 * Table skeleton for loading states in table layouts.
 * Provides consistent loading placeholder for table rows.
 */
export function LoadingTable({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("animate-pulse space-y-3", className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-muted rounded flex-1"
              style={{ width: `${100 / cols}%` }}
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}
