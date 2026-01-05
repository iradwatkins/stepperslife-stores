"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Store,
  MapPin,
  Package,
  ShoppingCart,
  Globe,
  Mail,
  Phone,
  DollarSign,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { MarketplaceSubNav } from "@/components/layout/MarketplaceSubNav";
import { VendorTierBadge } from "@/components/marketplace/VendorTierBadge";
import Image from "next/image";

export default function VendorStorefrontPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const vendor = useQuery(api.vendors.getBySlug, { slug });
  const products = useQuery(
    api.products.queries.getActiveProductsByVendor,
    vendor?._id ? { vendorId: vendor._id } : "skip"
  );

  // Timeout fallback - after 10 seconds, show error state
  const isLoading = vendor === undefined;

  useEffect(() => {
    if (!isLoading) {
      return;
    }
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Show timeout error state
  if (loadingTimeout && isLoading) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Connection Issue
              </h3>
              <p className="text-muted-foreground mb-4">
                Unable to load this store. Please check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  if (vendor === undefined) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading store...</p>
          </div>
        </div>
      </>
    );
  }

  if (vendor === null) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Store Not Found</h1>
              <p className="text-muted-foreground mb-6">
                The vendor store you&apos;re looking for doesn&apos;t exist or is no longer available.
              </p>
              <Link
                href="/marketplace/vendors"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Browse All Vendors
              </Link>
            </div>
          </main>
        </div>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <MarketplaceSubNav />
      <div className="min-h-screen bg-background">
        {/* Vendor Header Banner */}
        <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary to-sky-800">
          {vendor.bannerUrl && (
            <img
              src={vendor.bannerUrl}
              alt={`${vendor.name} banner`}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Vendor Profile Card */}
          <div className="bg-card rounded-xl border border-border shadow-lg -mt-20 relative z-10 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {vendor.logoUrl ? (
                  <img
                    src={vendor.logoUrl}
                    alt={vendor.name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-xl border-4 border-card object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl border-4 border-card bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center shadow-lg">
                    <Store className="w-12 h-12 text-primary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">{vendor.name}</h1>
                  <VendorTierBadge tier={vendor.tier || "BASIC"} size="md" showLabel />
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                  {(vendor.city || vendor.state) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>{[vendor.city, vendor.state].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  {vendor.website && (
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:text-primary/90"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Website</span>
                    </a>
                  )}
                </div>

                {vendor.description && (
                  <p className="text-muted-foreground mt-4">{vendor.description}</p>
                )}

                {/* Categories */}
                {vendor.categories && vendor.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {vendor.categories.map((category) => (
                      <span
                        key={category}
                        className="px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-primary/90 dark:text-sky-300 text-sm rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex md:flex-col gap-6 md:gap-4 md:text-right">
                <div>
                  <p className="text-2xl font-bold text-foreground">{products?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Products</p>
                </div>
              </div>
            </div>
          </div>

          {/* Back Link */}
          <Link
            href="/marketplace/vendors"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all vendors
          </Link>

          {/* Products Section */}
          <div className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-6">Products from {vendor.name}</h2>

            {products === undefined ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <div
                    key={product._id}
                    className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    {/* Product Image */}
                    <div className="aspect-square bg-muted relative">
                      {product.primaryImage ? (
                        <Image
                          src={product.primaryImage}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-16 h-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {product.description}
                      </p>

                      <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xl font-bold text-foreground">
                          ${(product.price / 100).toFixed(2)}
                        </span>
                        {product.compareAtPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            ${(product.compareAtPrice / 100).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {product.trackInventory && (
                        <div className="text-sm text-muted-foreground mb-4">
                          {product.inventoryQuantity > 0 ? (
                            <span className="text-success">
                              {product.inventoryQuantity} in stock
                            </span>
                          ) : (
                            <span className="text-destructive">Out of stock</span>
                          )}
                        </div>
                      )}

                      {product.category && (
                        <span className="inline-block px-2 py-1 bg-accent text-primary text-xs rounded mb-4">
                          {product.category}
                        </span>
                      )}

                      {/* View Product Button */}
                      <Link
                        href={`/marketplace/${product._id}`}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        View Product
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">No products yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  This vendor hasn&apos;t added any products yet. Check back soon!
                </p>
              </div>
            )}
          </div>

          {/* Contact Section */}
          {(vendor.contactEmail || vendor.contactPhone) && (
            <div className="bg-card rounded-xl border border-border p-6 mb-12">
              <h3 className="font-bold text-foreground mb-4">Contact Vendor</h3>
              <div className="flex flex-wrap gap-6">
                {vendor.contactEmail && (
                  <a
                    href={`mailto:${vendor.contactEmail}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    <span>{vendor.contactEmail}</span>
                  </a>
                )}
                {vendor.contactPhone && (
                  <a
                    href={`tel:${vendor.contactPhone}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    <span>{vendor.contactPhone}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </main>
        <PublicFooter />
      </div>
    </>
  );
}
