"use client";

import { Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminImageBadgeProps {
  /** Optional custom className */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show as compact (icon only) on small screens */
  responsive?: boolean;
}

/**
 * AdminImageBadge
 *
 * Displays "Uploaded by SteppersLife" badge for content uploaded by admins.
 * Use this component to indicate that an event, class, or restaurant photo
 * was uploaded by SteppersLife staff rather than the organizer themselves.
 *
 * @example
 * // On event card where event.isAdminUploaded === true
 * {event.isAdminUploaded && <AdminImageBadge />}
 *
 * @example
 * // Smaller size for compact displays
 * <AdminImageBadge size="sm" />
 *
 * @example
 * // Responsive: icon-only on mobile, full text on desktop
 * <AdminImageBadge responsive />
 */
export function AdminImageBadge({
  className,
  size = "md",
  responsive = false,
}: AdminImageBadgeProps) {
  const sizeClasses = {
    sm: "text-xs py-0.5 px-1.5",
    md: "text-xs py-1 px-2",
    lg: "text-sm py-1 px-2.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <Badge
      variant="secondary"
      className={cn(
        "flex items-center gap-1 font-medium",
        "bg-primary/10 text-primary border-primary/20",
        "hover:bg-primary/15",
        sizeClasses[size],
        className
      )}
    >
      <Upload className={iconSizes[size]} />
      <span className={cn(responsive && "hidden sm:inline")}>
        Uploaded by SteppersLife
      </span>
    </Badge>
  );
}

/**
 * AdminUploadIndicator
 *
 * A more subtle indicator variant for use in lists or tables.
 * Shows just an icon with tooltip behavior.
 */
export function AdminUploadIndicator({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "h-5 w-5 rounded-full",
        "bg-primary/10 text-primary",
        className
      )}
      title="Uploaded by SteppersLife"
    >
      <Upload className="h-3 w-3" />
    </span>
  );
}

/**
 * Type guard to check if content is admin-uploaded
 */
export function isAdminUploaded(item: {
  isAdminUploaded?: boolean;
  uploadedByAdminId?: string;
}): boolean {
  return item.isAdminUploaded === true || !!item.uploadedByAdminId;
}

export default AdminImageBadge;
