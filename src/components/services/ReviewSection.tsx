"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { StarRating } from "./StarRating";
import { RatingBreakdown } from "./RatingBreakdown";
import { ReviewCard } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";
import { useState } from "react";
import { Loader2, Star, MessageSquare } from "lucide-react";

interface ReviewSectionProps {
  providerId: Id<"serviceProviders">;
  providerName: string;
}

export function ReviewSection({ providerId, providerName }: ReviewSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [votingReviewId, setVotingReviewId] = useState<string | null>(null);

  // Queries
  const reviewsData = useQuery(api.services.reviews.getByProvider, {
    providerId,
    limit: 10,
  });
  const statsData = useQuery(api.services.reviews.getProviderStats, { providerId });
  const canReviewData = useQuery(api.services.reviews.canReview, { providerId });

  // Mutations
  const voteHelpful = useMutation(api.services.reviews.voteHelpful);

  const isLoading = reviewsData === undefined || statsData === undefined;

  const handleVoteHelpful = async (reviewId: string) => {
    setVotingReviewId(reviewId);
    try {
      await voteHelpful({ reviewId: reviewId as Id<"serviceReviews"> });
    } catch (err) {
      console.error("Failed to vote:", err);
    } finally {
      setVotingReviewId(null);
    }
  };

  const handleReviewSubmitted = () => {
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const { reviews, total } = reviewsData;
  const { averageRating, totalReviews, breakdown } = statsData;

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Average Rating */}
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <span className="text-4xl font-bold text-foreground">
              {averageRating > 0 ? averageRating.toFixed(1) : "—"}
            </span>
            <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
          </div>
          <p className="text-muted-foreground">
            {totalReviews} review{totalReviews !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Breakdown */}
        <div className="flex-1 max-w-xs">
          <RatingBreakdown breakdown={breakdown} totalReviews={totalReviews} />
        </div>

        {/* Write Review Button */}
        {canReviewData?.canReview && !showForm && (
          <div className="md:ml-auto">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Write a Review
            </button>
          </div>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="border-t border-border pt-6">
          <ReviewForm
            providerId={providerId}
            providerName={providerName}
            onCancel={() => setShowForm(false)}
            onSuccess={handleReviewSubmitted}
          />
        </div>
      )}

      {/* Cannot Review Messages */}
      {canReviewData && !canReviewData.canReview && (
        <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          {canReviewData.reason === "not_authenticated" && (
            <span>Sign in to leave a review.</span>
          )}
          {canReviewData.reason === "own_listing" && (
            <span>You cannot review your own listing.</span>
          )}
          {canReviewData.reason === "already_reviewed" && (
            <span>You have already reviewed this provider.</span>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="border-t border-border pt-6">
        {reviews.length > 0 ? (
          <div className="space-y-0">
            {reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                onVoteHelpful={handleVoteHelpful}
                isVoting={votingReviewId === review._id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No reviews yet. Be the first to review!
            </p>
          </div>
        )}
      </div>

      {/* Load More */}
      {reviewsData.hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={() => {
              // Would implement pagination here
            }}
            className="text-primary font-medium hover:underline"
          >
            Load more reviews
          </button>
        </div>
      )}
    </div>
  );
}
