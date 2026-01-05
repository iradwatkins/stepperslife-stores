"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Heart, Package, ShoppingCart, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { MarketplaceSubNav } from "@/components/layout/MarketplaceSubNav";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export default function WishlistPage() {
  const wishlistItems = useQuery(api.productWishlists.getByUser);
  const removeFromWishlist = useMutation(api.productWishlists.remove);
  const { addToCart } = useCart();
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [addingToCartIds, setAddingToCartIds] = useState<Set<string>>(new Set());

  const handleRemove = async (productId: Id<"products">) => {
    setRemovingIds((prev) => new Set(prev).add(productId));
    try {
      await removeFromWishlist({ productId });
    } catch (error) {
      console.error("Failed to remove from wishlist:", error);
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleAddToCart = (item: NonNullable<typeof wishlistItems>[number]) => {
    if (!item.product) return;

    setAddingToCartIds((prev) => new Set(prev).add(item.product._id));

    addToCart({
      productId: item.product._id,
      productName: item.product.name,
      productPrice: item.product.price,
      productImage: item.product.imageUrl,
      quantity: 1,
      vendorId: item.product.vendorId,
      vendorName: item.product.vendorName,
    });

    setTimeout(() => {
      setAddingToCartIds((prev) => {
        const next = new Set(prev);
        next.delete(item.product._id);
        return next;
      });
    }, 1000);
  };

  // Loading state
  if (wishlistItems === undefined || currentUser === undefined) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
        <PublicFooter />
      </>
    );
  }

  // Not logged in
  if (!currentUser) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto bg-card rounded-2xl shadow-lg p-8 text-center border border-border">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">Sign In to View Wishlist</h1>
              <p className="text-muted-foreground mb-8">
                Create an account or sign in to save products and access your wishlist.
              </p>
              <Link
                href={`/login?redirect=${encodeURIComponent("/marketplace/wishlist")}`}
                className="block w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Sign In
              </Link>
              <p className="text-sm text-muted-foreground mt-4">
                Don't have an account?{" "}
                <Link
                  href={`/register?redirect=${encodeURIComponent("/marketplace/wishlist")}`}
                  className="text-primary hover:underline"
                >
                  Create one
                </Link>
              </p>
            </div>
          </div>
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
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Shop
            </Link>
          </div>
        </div>

        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">My Wishlist</h1>
                <p className="text-sm text-muted-foreground">
                  {wishlistItems.length} {wishlistItems.length === 1 ? "item" : "items"} saved
                </p>
              </div>
            </div>
          </div>

          {wishlistItems.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Heart className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Save products you love by clicking the heart icon. They'll appear here for easy access later.
              </p>
              <Link href="/marketplace">
                <Button size="lg">
                  <Package className="w-5 h-5 mr-2" />
                  Browse Products
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {wishlistItems.map((item) => {
                if (!item.product) return null;

                const isRemoving = removingIds.has(item.product._id);
                const isAddingToCart = addingToCartIds.has(item.product._id);
                const isOutOfStock = (item.product.inventory ?? 0) <= 0;

                return (
                  <div
                    key={item._id}
                    className="bg-card rounded-xl border border-border overflow-hidden group hover:shadow-lg transition-shadow"
                  >
                    {/* Product Image */}
                    <Link href={`/marketplace/${item.product._id}`} className="block relative">
                      <div className="relative aspect-square overflow-hidden bg-muted">
                        {item.product.imageUrl ? (
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}

                        {/* Out of Stock Badge */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="bg-destructive text-white px-3 py-1 rounded-full text-sm font-medium">
                              Out of Stock
                            </span>
                          </div>
                        )}

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleRemove(item.product._id);
                          }}
                          disabled={isRemoving}
                          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 dark:bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all hover:scale-110 hover:bg-destructive hover:text-white"
                        >
                          {isRemoving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>

                        {/* Sale Badge */}
                        {item.product.compareAtPrice &&
                          item.product.compareAtPrice > item.product.price && (
                            <div className="absolute top-3 left-3 bg-destructive text-white px-2 py-1 rounded-full text-xs font-bold">
                              {Math.round(
                                ((item.product.compareAtPrice - item.product.price) /
                                  item.product.compareAtPrice) *
                                  100
                              )}
                              % OFF
                            </div>
                          )}
                      </div>
                    </Link>

                    {/* Product Info */}
                    <div className="p-4">
                      {/* Vendor */}
                      {item.product.vendorName && (
                        <Link
                          href={`/marketplace/vendors/${item.product.vendorSlug}`}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          {item.product.vendorName}
                        </Link>
                      )}

                      {/* Product Name */}
                      <Link href={`/marketplace/${item.product._id}`}>
                        <h3 className="font-semibold text-foreground line-clamp-2 mt-1 hover:text-primary transition-colors">
                          {item.product.name}
                        </h3>
                      </Link>

                      {/* Price */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">
                          ${(item.product.price / 100).toFixed(2)}
                        </span>
                        {item.product.compareAtPrice &&
                          item.product.compareAtPrice > item.product.price && (
                            <span className="text-sm text-muted-foreground line-through">
                              ${(item.product.compareAtPrice / 100).toFixed(2)}
                            </span>
                          )}
                      </div>

                      {/* Add to Cart Button */}
                      <Button
                        onClick={() => handleAddToCart(item)}
                        disabled={isOutOfStock || isAddingToCart}
                        className="w-full mt-4"
                        variant={isOutOfStock ? "outline" : "default"}
                      >
                        {isAddingToCart ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : isOutOfStock ? (
                          "Out of Stock"
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Add to Cart
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <PublicFooter />
    </>
  );
}
