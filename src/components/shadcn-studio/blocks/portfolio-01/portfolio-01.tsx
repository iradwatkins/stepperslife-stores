"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface PortfolioProps {
  images: string[];
  className?: string;
}

// Simple Portfolio component for displaying images only
export function Portfolio({ images, className }: PortfolioProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className={cn("columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4", className)}>
      {images.map((image, index) => (
        <motion.div
          key={index}
          className="break-inside-avoid mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
        >
          <div className="relative overflow-hidden rounded-lg group">
            <Image
              src={image}
              alt={`Portfolio image ${index + 1}`}
              width={400}
              height={300}
              className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Generic Portfolio Grid component for any type of item
interface PortfolioGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T) => string;
  className?: string;
  emptyState?: React.ReactNode;
}

export function PortfolioGrid<T>({
  items,
  renderItem,
  getKey,
  className,
  emptyState
}: PortfolioGridProps<T>) {
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <motion.div
      className={cn("columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4", className)}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
    >
      {items.map((item, index) => (
        <motion.div
          key={getKey(item)}
          className="break-inside-avoid mb-4"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.4 }}
        >
          {renderItem(item, index)}
        </motion.div>
      ))}
    </motion.div>
  );
}

export default Portfolio;
