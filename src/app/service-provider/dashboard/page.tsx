"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Star,
  Eye,
  TrendingUp,
  User,
  Settings,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageCircle,
  Phone,
  Mail,
  Globe,
} from "lucide-react";
import { StarRating } from "@/components/services/StarRating";

export default function ProviderDashboardPage() {
  const provider = useQuery(api.services.getMyProvider);
  const recentReviews = useQuery(api.services.reviews.getMyProviderReviews, {
    limit: 5,
  });

  if (!provider) {
    return null; // Layout handles loading/auth states
  }

  // Calculate profile completeness
  const profileFields = [
    provider.name,
    provider.email,
    provider.phone,
    provider.category,
    provider.city,
    provider.state,
    provider.description,
    provider.businessName,
    provider.website,
    provider.logoUrl,
    provider.coverImageUrl,
  ];
  const completedFields = profileFields.filter(Boolean).length;
  const completenessPercent = Math.round((completedFields / profileFields.length) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {provider.name.split(" ")[0]}!
          </p>
        </div>
        <Link
          href={`/services/provider/${provider.slug}`}
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium hover:bg-primary/20 transition-colors"
        >
          View Public Listing
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Profile Completeness */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Profile</span>
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{completenessPercent}%</p>
          <p className="text-sm text-muted-foreground">Complete</p>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${completenessPercent}%` }}
            />
          </div>
        </div>

        {/* Rating */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Rating</span>
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {provider.averageRating ? provider.averageRating.toFixed(1) : "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {provider.totalReviews || 0} reviews
          </p>
        </div>

        {/* Views - Placeholder */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Views</span>
            <Eye className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">—</p>
          <p className="text-sm text-muted-foreground">This month</p>
        </div>

        {/* Tier */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Tier</span>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{provider.tier || "BASIC"}</p>
          <Link href="/services/pricing" className="text-sm text-primary hover:underline">
            Upgrade
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Checklist */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Complete Your Profile
          </h2>
          <div className="space-y-3">
            {[
              { label: "Add business name", done: !!provider.businessName },
              { label: "Write a description", done: !!provider.description },
              { label: "Upload a logo", done: !!provider.logoUrl },
              { label: "Upload a cover image", done: !!provider.coverImageUrl },
              { label: "Add your website", done: !!provider.website },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-muted" />
                )}
                <span
                  className={
                    item.done ? "text-muted-foreground line-through" : "text-foreground"
                  }
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          {completenessPercent < 100 && (
            <Link
              href="/service-provider/dashboard/settings"
              className="inline-flex items-center gap-2 mt-4 text-sm text-primary font-medium hover:underline"
            >
              <Settings className="w-4 h-4" />
              Edit Profile
            </Link>
          )}
        </div>

        {/* Recent Reviews */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Reviews</h2>
            <Link
              href="/service-provider/dashboard/reviews"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>

          {recentReviews === undefined ? (
            <div className="text-center py-6">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : recentReviews.reviews.length > 0 ? (
            <div className="space-y-4">
              {recentReviews.reviews.map((review) => (
                <div
                  key={review._id}
                  className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {review.userAvatar ? (
                      <img
                        src={review.userAvatar}
                        alt={review.userName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground truncate">
                        {review.userName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(review.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <StarRating rating={review.rating} size="xs" />
                    {review.content && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {review.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                Reviews will appear here once customers leave feedback.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notifications/Alerts */}
      {completenessPercent < 50 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              Complete your profile to get more visibility
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Profiles with more information appear higher in search results and attract more customers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
