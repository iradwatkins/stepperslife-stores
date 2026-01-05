"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface MasonryCardProps {
  href: string;
  imageUrl: string;
  alt: string;
  aspectRatio?: "portrait" | "square" | "landscape";
  badges?: {
    topLeft?: React.ReactNode;
    topRight?: React.ReactNode;
    bottomLeft?: React.ReactNode;
    bottomRight?: React.ReactNode;
  };
  className?: string;
  children?: React.ReactNode;
}

const aspectRatioClasses = {
  portrait: "aspect-[3/4]",
  square: "aspect-square",
  landscape: "aspect-[4/3]",
};

export function MasonryCard({
  href,
  imageUrl,
  alt,
  aspectRatio = "portrait",
  badges,
  className,
  children,
}: MasonryCardProps) {
  return (
    <Link href={href} className="group block cursor-pointer">
      <div
        className={cn(
          "relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer",
          className
        )}
      >
        {/* Image Container */}
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-lg",
            aspectRatioClasses[aspectRatio]
          )}
        >
          <Image
            src={imageUrl}
            alt={alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2UzZTNlMyIvPjwvc3ZnPg=="
          />
        </div>

        {/* Gradient overlay for better badge visibility */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-lg" />

        {/* Top Left Badge */}
        {badges?.topLeft && (
          <div className="absolute top-3 left-3">{badges.topLeft}</div>
        )}

        {/* Top Right Badge */}
        {badges?.topRight && (
          <div className="absolute top-3 right-3">{badges.topRight}</div>
        )}

        {/* Bottom Left Badge */}
        {badges?.bottomLeft && (
          <div className="absolute bottom-3 left-3">{badges.bottomLeft}</div>
        )}

        {/* Bottom Right Badge */}
        {badges?.bottomRight && (
          <div className="absolute bottom-3 right-3">{badges.bottomRight}</div>
        )}

        {/* Optional children for custom content */}
        {children}
      </div>
    </Link>
  );
}

// Badge Components for consistency
export function TypeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-3 py-1 text-xs font-semibold bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-foreground">
      {children}
    </span>
  );
}

export function StatusBadge({
  children,
  variant = "success",
}: {
  children: React.ReactNode;
  variant?: "success" | "warning" | "error" | "info";
}) {
  const variantClasses = {
    success: "bg-success text-white",
    warning: "bg-warning text-black",
    error: "bg-destructive text-white",
    info: "bg-info text-white",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full shadow-sm",
        variantClasses[variant]
      )}
    >
      {children}
    </div>
  );
}

export function DateBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
      {children}
    </div>
  );
}

export function PriceBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg shadow-sm">
      {children}
    </div>
  );
}

// Masonry Grid Container
interface MasonryGridProps<T> {
  items: T[];
  columns?: 3 | 4;
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function MasonryGrid<T>({
  items,
  columns = 4,
  getKey,
  renderItem,
  className,
}: MasonryGridProps<T>) {
  const columnIndices = columns === 4 ? [0, 1, 2, 3] : [0, 1, 2];
  const gridCols = columns === 4
    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
    : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className={cn("grid gap-3 sm:gap-4", gridCols, className)}>
      {columnIndices.map((columnIndex) => (
        <div key={columnIndex} className="grid gap-3 sm:gap-4">
          {items
            .filter((_, index) => index % columns === columnIndex)
            .map((item, index) => (
              <div key={getKey(item)}>{renderItem(item, index)}</div>
            ))}
        </div>
      ))}
    </div>
  );
}
