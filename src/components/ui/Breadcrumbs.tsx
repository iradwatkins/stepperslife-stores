import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string; // Optional - if no href, it's the current page
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  showHomeIcon?: boolean;
}

/**
 * Breadcrumbs component for navigation hierarchy.
 *
 * Usage:
 * ```tsx
 * <Breadcrumbs items={[
 *   { label: "Home", href: "/" },
 *   { label: "Marketplace", href: "/marketplace" },
 *   { label: "Product Name" } // Current page - no href
 * ]} />
 * ```
 */
export function Breadcrumbs({ items, className, showHomeIcon = true }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("", className)}>
      <ol className="flex items-center gap-1.5 text-sm flex-wrap">
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;
          const isCurrentPage = !item.href;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {/* Separator (not on first item) */}
              {!isFirst && (
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
              )}

              {/* Breadcrumb item */}
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isFirst && showHomeIcon && (
                    <Home className="w-4 h-4" />
                  )}
                  {item.icon && !isFirst && item.icon}
                  <span className="hover:underline">{item.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    "text-foreground font-medium",
                    isLast && "truncate max-w-[200px] sm:max-w-[300px]"
                  )}
                  aria-current={isCurrentPage ? "page" : undefined}
                  title={item.label}
                >
                  {item.icon && item.icon}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Generate structured data for SEO (schema.org BreadcrumbList)
 *
 * Usage:
 * ```tsx
 * <script type="application/ld+json">
 *   {JSON.stringify(generateBreadcrumbSchema(items, "https://stepperslife.com"))}
 * </script>
 * ```
 */
export function generateBreadcrumbSchema(
  items: BreadcrumbItem[],
  baseUrl: string = "https://stepperslife.com"
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href && { item: `${baseUrl}${item.href}` }),
    })),
  };
}
