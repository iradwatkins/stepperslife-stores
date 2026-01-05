"use client";

import { Star } from "lucide-react";

interface RatingBreakdownProps {
  breakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  totalReviews: number;
}

export function RatingBreakdown({ breakdown, totalReviews }: RatingBreakdownProps) {
  const getPercentage = (count: number) => {
    if (totalReviews === 0) return 0;
    return Math.round((count / totalReviews) * 100);
  };

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((stars) => {
        const count = breakdown[stars as keyof typeof breakdown];
        const percentage = getPercentage(count);

        return (
          <div key={stars} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-4">{stars}</span>
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground w-12 text-right">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
