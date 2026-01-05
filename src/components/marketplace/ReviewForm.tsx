"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Star, X, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ReviewFormProps {
  productId: Id<"products">;
  isVerifiedPurchase: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReviewForm({ productId, isVerifiedPurchase, onSuccess, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReview = useMutation(api.productReviews.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createReview({
        productId,
        rating,
        title: title.trim() || undefined,
        content: content.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Write a Review</h2>
        <button
          onClick={onCancel}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Verified Purchase Badge */}
      {isVerifiedPurchase && (
        <div className="flex items-center gap-2 text-sm text-success bg-success/10 px-3 py-2 rounded-lg mb-4">
          <CheckCircle className="w-4 h-4" />
          Your purchase is verified - your review will be marked as trusted
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Overall Rating <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= displayRating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-muted text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <span className="text-sm text-muted-foreground ml-2">
                {displayRating === 1 && "Poor"}
                {displayRating === 2 && "Fair"}
                {displayRating === 3 && "Good"}
                {displayRating === 4 && "Very Good"}
                {displayRating === 5 && "Excellent"}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="review-title" className="block text-sm font-medium text-foreground mb-2">
            Review Title (optional)
          </label>
          <input
            id="review-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarize your experience"
            maxLength={100}
            className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Content */}
        <div>
          <label htmlFor="review-content" className="block text-sm font-medium text-foreground mb-2">
            Your Review (optional)
          </label>
          <textarea
            id="review-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your experience with this product. What did you like or dislike?"
            rows={4}
            maxLength={2000}
            className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {content.length}/2000 characters
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Review"
            )}
          </Button>
        </div>

        {/* Note about moderation */}
        {!isVerifiedPurchase && (
          <p className="text-xs text-muted-foreground text-center">
            Reviews from non-purchasers are subject to moderation before appearing.
          </p>
        )}
      </form>
    </div>
  );
}
