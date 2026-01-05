"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { ServicesSubNav } from "@/components/layout/ServicesSubNav";
import { PublicFooter } from "@/components/layout/PublicFooter";
import Link from "next/link";
import {
  Scissors,
  Home,
  PartyPopper,
  Heart,
  GraduationCap,
  Car,
  Briefcase,
  Camera,
  Music,
  Search,
  MapPin,
  Star,
  ChevronRight,
  Users,
  Wrench,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { FavoriteButton } from "@/components/services/FavoriteButton";

// Default categories with icons and images
const SERVICE_CATEGORIES = [
  {
    slug: "beauty",
    name: "Beauty & Hair",
    icon: Scissors,
    color: "bg-pink-100 dark:bg-pink-900/30",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop&q=80",
  },
  {
    slug: "home",
    name: "Home Services",
    icon: Home,
    color: "bg-blue-100 dark:bg-blue-900/30",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop&q=80",
  },
  {
    slug: "events",
    name: "Event Services",
    icon: PartyPopper,
    color: "bg-purple-100 dark:bg-purple-900/30",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=300&fit=crop&q=80",
  },
  {
    slug: "health",
    name: "Health & Wellness",
    icon: Heart,
    color: "bg-red-100 dark:bg-red-900/30",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop&q=80",
  },
  {
    slug: "education",
    name: "Education",
    icon: GraduationCap,
    color: "bg-amber-100 dark:bg-amber-900/30",
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=300&fit=crop&q=80",
  },
  {
    slug: "automotive",
    name: "Automotive",
    icon: Car,
    color: "bg-slate-100 dark:bg-slate-900/30",
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=300&fit=crop&q=80",
  },
  {
    slug: "professional",
    name: "Professional",
    icon: Briefcase,
    color: "bg-emerald-100 dark:bg-emerald-900/30",
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=300&fit=crop&q=80",
  },
  {
    slug: "creative",
    name: "Creative & Media",
    icon: Camera,
    color: "bg-indigo-100 dark:bg-indigo-900/30",
    image: "https://images.unsplash.com/photo-1452802447250-470a88ac82bc?w=400&h=300&fit=crop&q=80",
  },
  {
    slug: "dj",
    name: "DJs & Entertainment",
    icon: Music,
    color: "bg-orange-100 dark:bg-orange-900/30",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop&q=80",
  },
];

export function ServicesPageClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch providers from Convex
  const providers = useQuery(api.services.getApprovedProviders, {
    category: selectedCategory ?? undefined,
    limit: 12,
  });

  const featuredProviders = useQuery(api.services.getFeaturedProviders, {
    limit: 4,
  });

  const isLoading = providers === undefined;

  // Filter providers by search
  const filteredProviders = providers?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <PublicHeader />
      <ServicesSubNav />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">People in Your Neighborhood</span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Find Trusted Local Services
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                From barbers to plumbers, photographers to DJs — discover professionals who serve your community.
              </p>

              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search for a service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-6">Browse by Category</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {SERVICE_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.slug;

                return (
                  <button
                    key={category.slug}
                    onClick={() =>
                      setSelectedCategory(isSelected ? null : category.slug)
                    }
                    className={`relative overflow-hidden rounded-xl border transition-all group ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/30 hover:shadow-lg"
                    }`}
                  >
                    {/* Background Image */}
                    <div className="aspect-[4/3] relative">
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Gradient Overlay */}
                      <div className={`absolute inset-0 transition-opacity ${
                        isSelected
                          ? "bg-gradient-to-t from-primary/90 via-primary/50 to-primary/20"
                          : "bg-gradient-to-t from-black/70 via-black/30 to-transparent"
                      }`} />

                      {/* Content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-end p-4">
                        <div className={`w-10 h-10 rounded-lg mb-2 flex items-center justify-center ${
                          isSelected
                            ? "bg-white/20"
                            : "bg-white/10"
                        }`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-white text-center drop-shadow-md">
                          {category.name}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* DJ Category Special Link */}
            {selectedCategory === "dj" && (
              <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Music className="w-5 h-5 text-primary" />
                    <p className="text-foreground">
                      Looking for DJs? Check out our <strong>Radio</strong> section for music, mixes, and booking!
                    </p>
                  </div>
                  <Link
                    href="/radio"
                    className="flex items-center gap-1 text-primary font-medium hover:underline"
                  >
                    Go to Radio
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Featured Providers */}
        {featuredProviders && featuredProviders.length > 0 && !selectedCategory && (
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Featured Providers</h2>
                <Link
                  href="/services/featured"
                  className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProviders.map((provider) => (
                  <Link
                    key={provider._id}
                    href={`/services/provider/${provider.slug}`}
                    className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow group"
                  >
                    {/* Cover Image */}
                    <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 relative">
                      {provider.coverImageUrl ? (
                        <img
                          src={provider.coverImageUrl}
                          alt={provider.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Wrench className="w-12 h-12 text-primary/30" />
                        </div>
                      )}
                      <FavoriteButton
                        serviceProviderId={provider._id}
                        providerName={provider.name}
                        size="sm"
                        className="absolute top-2 left-2"
                      />
                      {provider.tier === "PREMIUM" && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                          Premium
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {provider.name}
                      </h3>
                      <p className="text-sm text-muted-foreground capitalize">{provider.category}</p>

                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {provider.city}, {provider.state}
                        </div>
                        {provider.averageRating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            {provider.averageRating.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* All Providers List */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {selectedCategory
                  ? `${SERVICE_CATEGORIES.find((c) => c.slug === selectedCategory)?.name || "Services"}`
                  : "All Service Providers"}
              </h2>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm text-primary font-medium hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredProviders && filteredProviders.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProviders.map((provider) => (
                  <Link
                    key={provider._id}
                    href={`/services/provider/${provider.slug}`}
                    className="bg-card rounded-xl border border-border p-4 hover:shadow-lg hover:border-primary/30 transition-all group relative"
                  >
                    <FavoriteButton
                      serviceProviderId={provider._id}
                      providerName={provider.name}
                      size="sm"
                      className="absolute top-3 right-3"
                    />
                    <div className="flex items-start gap-4">
                      {/* Logo */}
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {provider.logoUrl ? (
                          <img
                            src={provider.logoUrl}
                            alt={provider.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Wrench className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 pr-8">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {provider.name}
                        </h3>
                        <p className="text-sm text-muted-foreground capitalize">{provider.category}</p>

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {provider.city}
                          </div>
                          {provider.averageRating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {provider.averageRating.toFixed(1)}
                              {provider.totalReviews && (
                                <span>({provider.totalReviews})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {provider.description && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {provider.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No providers found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery
                    ? `No results for "${searchQuery}"`
                    : "Be the first to offer services in your area!"}
                </p>
                <Link
                  href="/service-provider/apply"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Become a Provider
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Offer Your Services
              </h2>
              <p className="text-muted-foreground mb-8">
                Join our community of trusted professionals. List your services and connect with customers in your neighborhood.
              </p>
              <Link
                href="/service-provider/apply"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
