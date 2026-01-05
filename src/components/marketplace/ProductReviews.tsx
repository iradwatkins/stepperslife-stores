"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Star, ThumbsUp, CheckCircle, MessageSquare, ChevronDown, LogIn } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ReviewForm } from "./ReviewForm";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ProductReviewsProps {
  productId: Id<"products">;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<"recent" | "helpful" | "highest" | "lowest">("recent");
  const [showReviewForm, setShowReviewForm] = useState(false);

  const stats = useQuery(api.productReviews.getProductStats, { productId });
  const reviews = useQuery(api.productReviews.getByProduct, { productId, limit: 20, sortBy });
  const canReview = useQuery(api.productReviews.canUserReview, { productId });
  const voteHelpful = useMutation(api.productReviews.voteHelpful);

  const handleWriteReviewClick = () => {
    if (!canReview?.canReview) {
      if (canReview?.reason === "not_logged_in") {
        toast("Sign in required", {
          description: "Please sign in to write a review",
          action: {
            label: "Sign In",
            onClick: () => {
              router.push("/login?redirect=" + window.location.pathname);
            },
          },
          icon: <LogIn className="w-4 h-4" />,
        });
      } else if (canReview?.reason === "already_reviewed") {
        toast.info("You've already reviewed this product");
      }
      return;
    }
    setShowReviewForm(true);
  };

  if (stats === undefined || reviews === undefined) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const handleVote = async (reviewId: Id<"productReviews">) => {
    try {
      await voteHelpful({ reviewId });
    } catch (error) {
      console.error("Failed to vote:", error);
    }
  };

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "w-3 h-3",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    };
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header with Stats */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Customer Reviews</h2>
            {stats.totalReviews > 0 ? (
              <div className="flex items-center gap-3">
                {renderStars(stats.averageRating, "lg")}
                <span className="text-lg font-semibold">{stats.averageRating}</span>
                <span className="text-muted-foreground">
                  ({stats.totalReviews} {stats.totalReviews === 1 ? "review" : "reviews"})
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground">No reviews yet</p>
            )}
          </div>

          {/* Show Write Review button - it handles auth and permission checks via toast */}
          <Button
            onClick={handleWriteReviewClick}
            variant={canReview?.canReview ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Write a Review
          </Button>
        </div>

        {/* Rating Distribution */}
        {stats.totalReviews > 0 && (
          <div className="mt-4 grid grid-cols-5 gap-2">
            {([5, 4, 3, 2, 1] as const).map((rating) => {
              const count = stats.ratingDistribution[rating];
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <div key={rating} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <ReviewForm
              productId={productId}
              isVerifiedPurchase={canReview?.hasPurchased ?? false}
              onSuccess={() => setShowReviewForm(false)}
              onCancel={() => setShowReviewForm(false)}
            />
          </div>
        </div>
      )}

      {/* Sort Options */}
      {reviews.length > 0 && (
        <div className="px-6 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none bg-background border border-input rounded-lg px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="recent">Most Recent</option>
                <option value="helpful">Most Helpful</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="divide-y divide-border">
        {reviews.length === 0 ? (
          <div className="p-8 text-center">
            <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No Reviews Yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Be the first to share your thoughts on this product
            </p>
            {canReview?.canReview && (
              <Button onClick={() => setShowReviewForm(true)} variant="outline">
                Write the First Review
              </Button>
            )}
          </div>
        ) : (
          reviews.map((review: {
            _id: Id<"productReviews">;
            rating: number;
            title?: string;
            content?: string;
            images?: string[];
            isVerifiedPurchase: boolean;
            helpfulVotes: number;
            vendorResponse?: string;
            createdAt: number;
            userName: string;
          }) => (
            <div key={review._id} className="p-6">
              {/* Review Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {renderStars(review.rating)}
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  {review.title && (
                    <h3 className="font-semibold text-foreground">{review.title}</h3>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(review.createdAt, { addSuffix: true })}
                </span>
              </div>

              {/* Review Content */}
              {review.content && (
                <p className="text-foreground mb-3">{review.content}</p>
              )}

              {/* Review Images */}
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {review.images.map((image: string, idx: number) => (
                    <img
                      key={idx}
                      src={image}
                      alt={`Review image ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-border"
                    />
                  ))}
                </div>
              )}

              {/* Reviewer Info & Helpful */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  By {review.userName}
                </span>
                <button
                  onClick={() => handleVote(review._id)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Helpful ({review.helpfulVotes})
                </button>
              </div>

              {/* Vendor Response */}
              {review.vendorResponse && (
                <div className="mt-4 pl-4 border-l-2 border-primary bg-muted/30 rounded-r-lg p-3">
                  <p className="text-sm font-medium text-foreground mb-1">Seller Response:</p>
                  <p className="text-sm text-muted-foreground">{review.vendorResponse}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
