"use client";

import {
  Wrench,
  Star,
  MapPin,
  Shield,
  Clock,
} from "lucide-react";
import { FavoriteButton } from "./FavoriteButton";
import { Id } from "@/convex/_generated/dataModel";

interface ProviderHeroProps {
  providerId: Id<"serviceProviders">;
  name: string;
  businessName?: string;
  category: string;
  city: string;
  state: string;
  tier: string;
  averageRating?: number;
  totalReviews?: number;
  yearsInBusiness?: number;
  isLicensed?: boolean;
  logoUrl?: string;
  coverImageUrl?: string;
}

export function ProviderHero({
  providerId,
  name,
  businessName,
  category,
  city,
  state,
  tier,
  averageRating,
  totalReviews,
  yearsInBusiness,
  isLicensed,
  logoUrl,
  coverImageUrl,
}: ProviderHeroProps) {
  return (
    <div className="relative">
      {/* Cover Image */}
      <div className="h-48 md:h-64 bg-gradient-to-br from-primary/20 to-primary/5 relative">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Wrench className="w-12 h-12 text-primary/30" />
            </div>
          </div>
        )}
        {/* Favorite Button */}
        <FavoriteButton
          serviceProviderId={providerId}
          providerName={businessName || name}
          size="md"
          className="absolute top-4 right-4"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
      </div>

      {/* Profile Content */}
      <div className="container mx-auto px-4">
        <div className="relative -mt-16 md:-mt-20 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {/* Logo */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl border-4 border-background bg-card shadow-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Wrench className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {/* Tier Badge */}
                {tier && tier !== "BASIC" && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tier === "PREMIUM"
                        ? "bg-primary text-primary-foreground"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {tier}
                  </span>
                )}
                {/* Licensed Badge */}
                {isLicensed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    <Shield className="w-3 h-3" />
                    Licensed
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">
                {businessName || name}
              </h1>
              {businessName && (
                <p className="text-muted-foreground">{name}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
                <span className="capitalize">{category}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {city}, {state}
                </span>
                {averageRating !== undefined && averageRating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {averageRating.toFixed(1)}
                    {totalReviews !== undefined && totalReviews > 0 && (
                      <span className="text-muted-foreground">
                        ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
                      </span>
                    )}
                  </span>
                )}
                {yearsInBusiness !== undefined && yearsInBusiness > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {yearsInBusiness}+ years
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
