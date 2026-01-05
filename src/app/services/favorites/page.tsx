"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { ServicesSubNav } from "@/components/layout/ServicesSubNav";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Link from "next/link";
import {
  Heart,
  MapPin,
  Star,
  Phone,
  Mail,
  ExternalLink,
  Briefcase,
  BadgeCheck,
  Crown,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type ProviderTier = "BASIC" | "VERIFIED" | "PREMIUM";

const TIER_CONFIG: Record<ProviderTier, { label: string; color: string; icon: typeof BadgeCheck }> = {
  BASIC: { label: "Basic", color: "bg-muted text-muted-foreground", icon: BadgeCheck },
  VERIFIED: { label: "Verified", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400", icon: BadgeCheck },
  PREMIUM: { label: "Premium", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400", icon: Crown },
};

export default function FavoritesPage() {
  const { isAuthenticated } = useAuth();
  const favorites = useQuery(api.services.favorites.getByUser, {});
  const toggleFavorite = useMutation(api.services.favorites.toggle);

  const handleRemoveFavorite = async (serviceProviderId: Id<"serviceProviders">, providerName: string) => {
    try {
      await toggleFavorite({ serviceProviderId });
      toast.success(`${providerName} removed from favorites`);
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove from favorites");
    }
  };

  return (
    <>
      <PublicHeader />
      <ServicesSubNav />

      <main className="min-h-screen bg-background">
        {/* Header */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
                <Heart className="w-4 h-4 text-primary fill-primary" />
                <span className="text-sm font-medium text-primary">My Saved Providers</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Your Favorites
              </h1>
              <p className="text-lg text-muted-foreground">
                Quick access to service providers you&apos;ve saved for later.
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {!isAuthenticated ? (
              <div className="max-w-md mx-auto text-center py-16">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Sign in to view favorites</h2>
                <p className="text-muted-foreground mb-6">
                  Create an account or sign in to save your favorite service providers.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            ) : favorites === undefined ? (
              <LoadingSpinner fullPage text="Loading favorites..." />
            ) : favorites.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {favorites.map((provider) => {
                  const tierConfig = TIER_CONFIG[(provider.tier as ProviderTier) || "BASIC"];
                  const TierIcon = tierConfig.icon;

                  return (
                    <div key={provider._id} className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
                      {/* Provider Image */}
                      <div className="relative h-40 bg-muted">
                        {provider.coverImageUrl ? (
                          <img
                            src={provider.coverImageUrl}
                            alt={provider.businessName || provider.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Briefcase className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        {/* Remove favorite button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFavorite(provider._id, provider.businessName || provider.name)}
                          className="absolute top-3 right-3 w-10 h-10 bg-white/90 dark:bg-black/50 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-black transition-colors"
                          aria-label="Remove from favorites"
                        >
                          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                        </button>
                        {/* Tier badge */}
                        {provider.tier && provider.tier !== "BASIC" && (
                          <div className="absolute top-3 left-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tierConfig.color}`}>
                              <TierIcon className="w-3 h-3" />
                              {tierConfig.label}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Provider Info */}
                      <div className="p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {provider.logoUrl ? (
                              <img src={provider.logoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Briefcase className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground truncate">
                              {provider.businessName || provider.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{provider.category}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                          <MapPin className="w-4 h-4" />
                          <span>{provider.city}, {provider.state}</span>
                        </div>

                        {provider.averageRating && (
                          <div className="flex items-center gap-1 mb-4">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium text-foreground">{provider.averageRating.toFixed(1)}</span>
                            <span className="text-muted-foreground">({provider.totalReviews || 0} reviews)</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-4 border-t border-border">
                          <Link
                            href={`/services/provider/${provider.slug}`}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
                          >
                            View Profile
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          {provider.phone && (
                            <a
                              href={`tel:${provider.phone}`}
                              className="w-10 h-10 border border-border rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                              aria-label="Call"
                            >
                              <Phone className="w-4 h-4 text-muted-foreground" />
                            </a>
                          )}
                          {provider.email && (
                            <a
                              href={`mailto:${provider.email}`}
                              className="w-10 h-10 border border-border rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                              aria-label="Email"
                            >
                              <Mail className="w-4 h-4 text-muted-foreground" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="max-w-md mx-auto text-center py-16">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">No favorites yet</h2>
                <p className="text-muted-foreground mb-6">
                  Browse our directory and save providers you want to remember.
                </p>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <Search className="w-5 h-5" />
                  Browse Services
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
