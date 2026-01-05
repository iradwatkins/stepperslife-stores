"use client";

import { StarRating } from "./StarRating";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp, User } from "lucide-react";

interface ReviewCardProps {
  review: {
    _id: string;
    rating: number;
    title?: string;
    content?: string;
    userName: string;
    userAvatar?: string;
    createdAt: number;
    helpful?: number;
    verified?: boolean;
  };
  onVoteHelpful?: (reviewId: string) => void;
  isVoting?: boolean;
}

export function ReviewCard({ review, onVoteHelpful, isVoting }: ReviewCardProps) {
  const timeAgo = formatDistanceToNow(new Date(review.createdAt), { addSuffix: true });

  return (
    <div className="border-b border-border last:border-0 py-6 first:pt-0 last:pb-0">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {review.userAvatar ? (
            <img
              src={review.userAvatar}
              alt={review.userName}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-medium text-foreground">{review.userName}</span>
            {review.verified && (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                Verified
              </span>
            )}
            <span className="text-sm text-muted-foreground">{timeAgo}</span>
          </div>

          {/* Rating */}
          <StarRating rating={review.rating} size="sm" />

          {/* Title */}
          {review.title && (
            <h4 className="font-medium text-foreground mt-2">{review.title}</h4>
          )}

          {/* Content */}
          {review.content && (
            <p className="text-muted-foreground mt-2 whitespace-pre-wrap">
              {review.content}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={() => onVoteHelpful?.(review._id)}
              disabled={isVoting}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Helpful</span>
              {review.helpful !== undefined && review.helpful > 0 && (
                <span className="text-xs">({review.helpful})</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
