"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { StarRating } from "@/components/services/StarRating";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Star,
  User,
  Filter,
  MessageCircle,
  Loader2,
  ChevronDown,
  Reply,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type FilterStatus = "all" | "APPROVED" | "PENDING" | "FLAGGED";

export default function ProviderReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<Id<"serviceReviews"> | null>(null);
  const [responseText, setResponseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reviewsData = useQuery(api.services.reviews.getMyProviderReviews, {
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });

  const respondToReview = useMutation(api.services.reviews.respondToReview);

  const isLoading = reviewsData === undefined;

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: "all", label: "All Reviews" },
    { value: "APPROVED", label: "Approved" },
    { value: "PENDING", label: "Pending" },
    { value: "FLAGGED", label: "Flagged" },
  ];

  const handleOpenResponseDialog = (reviewId: Id<"serviceReviews">) => {
    setSelectedReviewId(reviewId);
    setResponseText("");
    setResponseDialogOpen(true);
  };

  const handleCloseResponseDialog = () => {
    setResponseDialogOpen(false);
    setSelectedReviewId(null);
    setResponseText("");
  };

  const handleSubmitResponse = async () => {
    if (!selectedReviewId || !responseText.trim()) return;

    setIsSubmitting(true);
    try {
      await respondToReview({
        reviewId: selectedReviewId,
        response: responseText.trim(),
      });
      toast.success("Response submitted successfully");
      handleCloseResponseDialog();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit response";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = responseText.length;
  const maxCharacters = 500;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reviews</h1>
          <p className="text-muted-foreground">
            Manage and respond to customer reviews
          </p>
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>{filterOptions.find((o) => o.value === statusFilter)?.label}</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showFilterMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg border border-border shadow-lg z-10">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setStatusFilter(option.value);
                    setShowFilterMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${
                    statusFilter === option.value
                      ? "text-primary font-medium"
                      : "text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      {reviewsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {reviewsData.total}
            </p>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : reviewsData.reviews.length > 0 ? (
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {reviewsData.reviews.map((review) => (
            <div key={review._id} className="p-6">
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
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-medium text-foreground">
                      {review.userName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        review.status === "APPROVED"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : review.status === "PENDING"
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {review.status}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(review.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  <StarRating rating={review.rating} size="sm" />

                  {review.title && (
                    <h4 className="font-medium text-foreground mt-2">
                      {review.title}
                    </h4>
                  )}

                  {review.content && (
                    <p className="text-muted-foreground mt-2 whitespace-pre-wrap">
                      {review.content}
                    </p>
                  )}

                  {/* Provider Response Display */}
                  {review.providerResponse ? (
                    <div className="mt-4 pl-4 border-l-2 border-primary bg-muted/30 rounded-r-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Reply className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Your Response</span>
                        {review.providerResponseAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(review.providerResponseAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {review.providerResponse}
                      </p>
                    </div>
                  ) : (
                    /* Response Button - Only show if no response yet */
                    <div className="mt-4 pt-4 border-t border-border">
                      <button
                        onClick={() => handleOpenResponseDialog(review._id)}
                        className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Respond to Review
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No reviews yet
          </h3>
          <p className="text-muted-foreground">
            When customers leave reviews, they will appear here.
          </p>
        </div>
      )}

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
            <DialogDescription>
              Write a professional response to this customer review. Your response will be visible to everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Thank you for your feedback..."
                className="w-full min-h-[120px] px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                disabled={isSubmitting}
              />
              <div className="flex justify-end mt-1">
                <span
                  className={`text-xs ${
                    isOverLimit ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {characterCount}/{maxCharacters}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseResponseDialog}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitResponse}
              disabled={isSubmitting || !responseText.trim() || isOverLimit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Response"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
