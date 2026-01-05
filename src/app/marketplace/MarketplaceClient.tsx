"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Package, ShoppingCart, DollarSign, AlertCircle, Store, Users, ShoppingBag, Tag, Sparkles, TrendingUp, Search, ChevronDown, X, Heart, ArrowUpDown } from "lucide-react";
import { WishlistButton } from "@/components/marketplace/WishlistButton";
import { VendorTierBadge } from "@/components/marketplace/VendorTierBadge";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { MarketplaceSubNav } from "@/components/layout/MarketplaceSubNav";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ViewToggle, ViewMode } from "@/components/ui/ViewToggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Product categories
const PRODUCT_CATEGORIES = [
  "Apparel & Fashion",
  "Accessories",
  "Dance Supplies",
  "Music & Media",
  "Art & Collectibles",
  "Books & Education",
  "Health & Wellness",
  "Other",
];

// Props for server-side initial data (hybrid SSR + CSR pattern)
interface MarketplaceClientProps {
  initialProducts?: any[];
}

export default function MarketplaceClient({
  initialProducts,
}: MarketplaceClientProps = {}) {
  // Query products - use initial data as fallback for SSR hydration
  const productsQuery = useQuery(api.products.queries.getActiveProducts, {});
  const products = productsQuery ?? initialProducts ?? [];

  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("masonry");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "name">("newest");

  // Get available categories from products with counts
  const { availableCategories, categoryCounts } = useMemo(() => {
    if (!products || products.length === 0) return { availableCategories: [], categoryCounts: {} as Record<string, number> };
    const counts: Record<string, number> = {};
    products.forEach((p: any) => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    const categories = PRODUCT_CATEGORIES.filter(c => counts[c] > 0);
    return { availableCategories: categories, categoryCounts: counts };
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    let filtered = [...products];

    // Search by name or description
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p: any) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((p: any) =>
        p.category && selectedCategories.includes(p.category)
      );
    }

    return filtered;
  }, [products, searchQuery, selectedCategories]);

  // Sort filtered products
  const sortedProducts = useMemo(() => {
    if (!filteredProducts.length) return [];
    return [...filteredProducts].sort((a: any, b: any) => {
      switch (sortBy) {
        case "newest":
          return (b._creationTime || 0) - (a._creationTime || 0);
        case "price_asc":
          return (a.price || 0) - (b.price || 0);
        case "price_desc":
          return (b.price || 0) - (a.price || 0);
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        default:
          return 0;
      }
    });
  }, [filteredProducts, sortBy]);

  // Toggle category filter
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategories([]);
  };

  const hasActiveFilters = searchQuery || selectedCategories.length > 0;

  // Timeout fallback - after 10 seconds, show error state
  // Only show if no data from either client query or server-side initial data
  const hasNoDataAtAll = productsQuery === undefined && (!initialProducts || initialProducts.length === 0);
  useEffect(() => {
    if (hasNoDataAtAll) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000);
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [hasNoDataAtAll]);

  // Show timeout error state
  if (loadingTimeout && hasNoDataAtAll) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-12">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              </motion.div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Connection Issue
              </h3>
              <p className="text-muted-foreground mb-4">
                Unable to load products. Please check your connection and try again.
              </p>
              <motion.button
                type="button"
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Retry
              </motion.button>
            </motion.div>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  // Loading state - show spinner only if no data from either source
  if (hasNoDataAtAll && !loadingTimeout) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <motion.div
              className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.p
              className="mt-4 text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Loading products...
            </motion.p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <MarketplaceSubNav />
      <div className="min-h-screen bg-background">
        {/* Epic Hero Section */}
        <section className="relative min-h-[500px] md:min-h-[600px] w-full overflow-hidden">
          {/* Animated Gradient Background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-teal-900 via-emerald-900 to-cyan-900"
            animate={{
              background: [
                "linear-gradient(135deg, #134e4a 0%, #065f46 50%, #164e63 100%)",
                "linear-gradient(135deg, #065f46 0%, #164e63 50%, #134e4a 100%)",
                "linear-gradient(135deg, #164e63 0%, #134e4a 50%, #065f46 100%)",
                "linear-gradient(135deg, #134e4a 0%, #065f46 50%, #164e63 100%)",
              ],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />

          {/* Background Pattern */}
          <motion.div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5 }}
          />

          {/* Floating Shopping Icons */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Shopping Bag */}
            <motion.div
              className="absolute top-24 left-[8%] text-white/20"
              animate={{ y: [0, -25, 0], rotate: [0, 8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ShoppingBag className="w-16 h-16 md:w-20 md:h-20" />
            </motion.div>

            {/* Tag Icon */}
            <motion.div
              className="absolute top-36 right-[12%] text-white/15"
              animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              <Tag className="w-12 h-12 md:w-16 md:h-16" />
            </motion.div>

            {/* Package Icon */}
            <motion.div
              className="absolute bottom-36 left-[15%] text-white/15"
              animate={{ y: [0, -18, 0], rotate: [0, 12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <Package className="w-14 h-14 md:w-18 md:h-18" />
            </motion.div>

            {/* Store Icon */}
            <motion.div
              className="absolute bottom-28 right-[8%] text-white/20"
              animate={{ y: [0, 15, 0], rotate: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            >
              <Store className="w-12 h-12 md:w-16 md:h-16" />
            </motion.div>

            {/* Sparkles */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${5 + Math.random() * 90}%`,
                  top: `${5 + Math.random() * 90}%`,
                }}
                animate={{
                  opacity: [0.2, 0.6, 0.2],
                  scale: [1, 1.3, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              >
                <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-warning/40" />
              </motion.div>
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 container mx-auto px-4 h-full flex items-center py-16 md:py-24">
            <div className="max-w-3xl">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  {products.length} Products Available
                </span>
              </motion.div>

              {/* Main Title */}
              <motion.h1
                className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                Shop the{" "}
                <motion.span
                  className="inline-block bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent"
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: "200% 200%" }}
                >
                  Stepping Life
                </motion.span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                Discover exclusive merchandise, apparel, and accessories from the Chicago Steppin community.
                Support local vendors and wear your passion.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    className="text-lg px-8 py-6 bg-white !text-info900 hover:bg-white/90 shadow-xl shadow-teal-900/30"
                    onClick={() => document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <ShoppingBag className="w-5 h-5 mr-2 text-info900" />
                    Browse Products
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 py-6 bg-white/10 border-white/30 !text-white hover:bg-white/20 backdrop-blur-sm"
                  >
                    <Link href="/vendor/apply">
                      <Store className="w-5 h-5 mr-2 text-white" />
                      Create a Store
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>

              {/* Features */}
              <motion.div
                className="mt-12 grid grid-cols-3 gap-6 max-w-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.5 }}
              >
                <div className="text-center">
                  <motion.div
                    className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/10 flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Package className="w-6 h-6 text-white" />
                  </motion.div>
                  <div className="text-xs text-white/60">Fast Shipping</div>
                </div>
                <div className="text-center">
                  <motion.div
                    className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/10 flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Store className="w-6 h-6 text-white" />
                  </motion.div>
                  <div className="text-xs text-white/60">Local Vendors</div>
                </div>
                <div className="text-center">
                  <motion.div
                    className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/10 flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Sparkles className="w-6 h-6 text-white" />
                  </motion.div>
                  <div className="text-xs text-white/60">Exclusive Items</div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Bottom Gradient Fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </section>

        {/* Compact Filter Bar */}
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {/* Search - flexible width */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <label htmlFor="products-search" className="sr-only">Search products</label>
                <input
                  id="products-search"
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                />
              </div>

              {/* Category Filter - Inline Pills (Desktop) */}
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  {availableCategories.slice(0, 4).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedCategories.includes(category)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {category.split(" ")[0]} ({categoryCounts[category] || 0})
                    </button>
                  ))}
                  {availableCategories.length > 4 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 gap-1 px-2">
                          <span className="text-xs">+{availableCategories.length - 4}</span>
                          <ChevronDown className="w-3 h-3 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" align="start">
                        <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                          {availableCategories.slice(4).map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => toggleCategory(category)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                selectedCategories.includes(category)
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-accent"
                              }`}
                            >
                              {category} ({categoryCounts[category] || 0})
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {/* Category Filter - Mobile Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-9 gap-1 md:hidden ${selectedCategories.length > 0 ? "border-primary text-primary" : ""}`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      {selectedCategories.length > 0 && (
                        <span className="rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs font-medium">
                          {selectedCategories.length}
                        </span>
                      )}
                      <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                      {availableCategories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            selectedCategories.includes(category)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {category} ({categoryCounts[category] || 0})
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Divider */}
                <div className="hidden sm:block w-px h-6 bg-border" />

                {/* View Toggle */}
                <ViewToggle view={viewMode} onViewChange={setViewMode} />

                {/* Divider */}
                <div className="hidden sm:block w-px h-6 bg-border" />

                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price_asc">Price: Low-High</SelectItem>
                    <SelectItem value="price_desc">Price: High-Low</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                  </SelectContent>
                </Select>

                {/* Divider */}
                <div className="hidden sm:block w-px h-6 bg-border" />

                {/* Browse Vendors Link */}
                <Link
                  href="/marketplace/vendors"
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary hover:text-primary/80"
                >
                  <Store className="w-3.5 h-3.5" />
                  Vendors
                </Link>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main id="products-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `Showing ${sortedProducts.length} of ${products.length} products`
                : `${products.length} ${products.length === 1 ? "product" : "products"} available`}
            </p>
          </div>

          {sortedProducts.length === 0 ? (
            <motion.div
              className="bg-card rounded-lg shadow-md p-12 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {hasActiveFilters ? "No Products Found" : "Coming Soon!"}
              </h2>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? "Try adjusting your search or filters to find what you're looking for."
                  : "Our shop is currently being stocked with amazing products. Check back soon!"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </motion.div>
          ) : viewMode === "masonry" ? (
            /* Masonry View - 4-column stacked grid with portrait cards */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {[0, 1, 2, 3].map((columnIndex) => (
                <div key={columnIndex} className="grid gap-3 sm:gap-4">
                  {sortedProducts
                    .filter((_: any, index: number) => index % 4 === columnIndex)
                    .map((product: any) => (
                      <motion.div
                        key={product._id}
                        whileHover={{ y: -4 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <Link href={`/marketplace/${product._id}`} className="group block cursor-pointer">
                          <div className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300">
                            {/* Portrait Image */}
                            <div className="relative w-full aspect-[3/4] overflow-hidden rounded-lg">
                              {product.primaryImage ? (
                                <Image
                                  src={product.primaryImage}
                                  alt={product.name}
                                  fill
                                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  loading="lazy"
                                  placeholder="blur"
                                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2UzZTNlMyIvPjwvc3ZnPg=="
                                />
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                  <Package className="h-12 w-12 text-white opacity-50" />
                                </div>
                              )}
                            </div>

                            {/* Gradient overlay for badge visibility */}
                            <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-lg" />

                            {/* Category Badge - Top Left */}
                            {product.category && (
                              <div className="absolute top-3 left-3">
                                <span className="px-3 py-1 text-xs font-semibold bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-foreground">
                                  {product.category.split(" ")[0]}
                                </span>
                              </div>
                            )}

                            {/* Stock/Sale Badge - Top Right */}
                            <div className="absolute top-3 right-3">
                              {product.compareAtPrice && product.compareAtPrice > product.price ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-destructive text-white text-xs font-semibold rounded-full shadow-sm">
                                  <span>SALE</span>
                                </div>
                              ) : product.trackInventory && product.inventoryQuantity > 0 ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-success text-white text-xs font-semibold rounded-full shadow-sm">
                                  <span>In Stock</span>
                                </div>
                              ) : product.trackInventory && product.inventoryQuantity === 0 ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground text-xs font-semibold rounded-full shadow-sm">
                                  <span>Sold Out</span>
                                </div>
                              ) : null}
                            </div>

                            {/* Price Badge - Bottom Left */}
                            <div className="absolute bottom-3 left-3">
                              <div className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg shadow-sm">
                                ${(product.price / 100).toFixed(2)}
                                {product.compareAtPrice && (
                                  <span className="ml-1.5 text-xs opacity-75 line-through">
                                    ${(product.compareAtPrice / 100).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Wishlist Button - Bottom Right */}
                            <div className="absolute bottom-3 right-3">
                              <WishlistButton productId={product._id} size="sm" />
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                </div>
              ))}
            </div>
          ) : viewMode === "list" ? (
            /* List View - Horizontal cards */
            <div className="space-y-4">
              {sortedProducts.map((product: any) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Link href={`/marketplace/${product._id}`} className="group block">
                    <div className="flex gap-4 bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 p-3">
                      {/* Left: Image */}
                      <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 rounded-lg overflow-hidden">
                        {product.primaryImage ? (
                          <Image
                            src={product.primaryImage}
                            alt={product.name}
                            fill
                            sizes="160px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <Package className="h-8 w-8 text-white opacity-50" />
                          </div>
                        )}
                        {/* Sale badge */}
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold bg-destructive text-white rounded-full">
                            SALE
                          </div>
                        )}
                      </div>

                      {/* Right: Content */}
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {product.name}
                          </h3>
                          <WishlistButton productId={product._id} size="sm" />
                        </div>

                        {/* Vendor Info */}
                        {product.vendor ? (
                          <p className="text-xs text-primary mt-1 flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            {product.vendor.storeName}
                            <VendorTierBadge tier={product.vendor.tier || "BASIC"} size="sm" />
                          </p>
                        ) : (
                          <p className="text-xs text-primary mt-1 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            SteppersLife Official
                          </p>
                        )}

                        {product.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {product.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span className="text-lg font-bold text-foreground">
                            ${(product.price / 100).toFixed(2)}
                          </span>
                          {product.compareAtPrice && (
                            <span className="text-sm text-muted-foreground line-through">
                              ${(product.compareAtPrice / 100).toFixed(2)}
                            </span>
                          )}
                          {product.category && (
                            <span className="px-2 py-0.5 bg-muted text-foreground rounded-full text-xs">
                              {product.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Grid View - 2x3 columns with card details */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              {sortedProducts.map((product: any) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Link href={`/marketplace/${product._id}`} className="group block">
                    <div className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                      <div className="relative aspect-[4/5] overflow-hidden">
                        {product.primaryImage ? (
                          <Image
                            src={product.primaryImage}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 50vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iI2UzZTNlMyIvPjwvc3ZnPg=="
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <Package className="h-12 w-12 text-white opacity-50" />
                          </div>
                        )}

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-black/20 pointer-events-none" />

                        {/* Category Badge - Top Left */}
                        {product.category && (
                          <div className="absolute top-3 left-3">
                            <span className="px-3 py-1 text-xs font-semibold bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-foreground">
                              {product.category.split(" ")[0]}
                            </span>
                          </div>
                        )}

                        {/* Sale Badge - Top Right */}
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <div className="absolute top-3 right-3">
                            <span className="px-2 py-1 text-xs font-semibold bg-destructive text-white rounded-full shadow-sm">
                              SALE
                            </span>
                          </div>
                        )}

                        {/* Wishlist Button - Bottom Right */}
                        <div className="absolute bottom-3 right-3">
                          <WishlistButton productId={product._id} size="sm" />
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>

                        {/* Vendor Info */}
                        {product.vendor ? (
                          <p className="text-xs text-primary flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            {product.vendor.storeName}
                          </p>
                        ) : (
                          <p className="text-xs text-primary flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            SteppersLife Official
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-foreground">
                            ${(product.price / 100).toFixed(2)}
                          </span>
                          {product.compareAtPrice && (
                            <span className="text-sm text-muted-foreground line-through">
                              ${(product.compareAtPrice / 100).toFixed(2)}
                            </span>
                          )}
                        </div>

                        {product.trackInventory && (
                          <p className="text-xs text-muted-foreground">
                            {product.inventoryQuantity > 0 ? (
                              <span className="text-success">{product.inventoryQuantity} in stock</span>
                            ) : (
                              <span className="text-destructive">Out of stock</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
