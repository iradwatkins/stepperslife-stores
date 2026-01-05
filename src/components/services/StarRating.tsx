"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  size?: "xs" | "sm" | "md" | "lg";
  showValue?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

const SIZES = {
  xs: "w-3 h-3",
  sm: "w-3.5 h-3.5",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export function StarRating({
  rating,
  size = "md",
  showValue = false,
  interactive = false,
  onChange,
}: StarRatingProps) {
  const sizeClass = SIZES[size];

  const handleClick = (starIndex: number) => {
    if (interactive && onChange) {
      onChange(starIndex);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const isFilled = starIndex <= rating;
        const isHalf = !isFilled && starIndex - 0.5 <= rating;

        return (
          <button
            key={starIndex}
            type="button"
            onClick={() => handleClick(starIndex)}
            disabled={!interactive}
            className={`${
              interactive
                ? "cursor-pointer hover:scale-110 transition-transform"
                : "cursor-default"
            }`}
          >
            <Star
              className={`${sizeClass} ${
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : isHalf
                  ? "fill-yellow-400/50 text-yellow-400"
                  : "fill-muted text-muted"
              }`}
            />
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-foreground">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
