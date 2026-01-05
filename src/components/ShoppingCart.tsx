"use client";

import { useCart } from "@/contexts/CartContext";
import { X, Trash2, Plus, Minus, ShoppingBag, Package, Store, Building2, LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

export function ShoppingCart() {
  const { items, removeItemByIndex, updateQuantityByIndex, getSubtotal, getItemsByVendor, getVendorCount, isCartOpen, setIsCartOpen } =
    useCart();

  const router = useRouter();
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  const handleCheckout = () => {
    // Show toast if not logged in
    if (!currentUser) {
      toast("Sign in required", {
        description: "Please sign in to complete your purchase",
        action: {
          label: "Sign In",
          onClick: () => {
            setIsCartOpen(false);
            router.push("/login?redirect=/marketplace/checkout");
          },
        },
        icon: <LogIn className="w-4 h-4" />,
      });
      return;
    }
    setIsCartOpen(false);
    router.push("/marketplace/checkout");
  };

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/50 z-40 transition-opacity"
        onClick={() => setIsCartOpen(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsCartOpen(false);
          }
        }}
        aria-label="Close cart"
      />

      {/* Cart Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Shopping Cart</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close shopping cart"
          >
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Package className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Your cart is empty
              </h3>
              <p className="text-muted-foreground mb-6">
                Add some products to get started
              </p>
              <Link
                href="/marketplace"
                onClick={() => setIsCartOpen(false)}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Multi-vendor notice */}
              {getVendorCount() > 1 && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-sm text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                    Items from <strong>{getVendorCount()} vendors</strong>
                  </p>
                </div>
              )}

              {/* Items grouped by vendor */}
              {getItemsByVendor().map((vendorGroup) => (
                <div key={vendorGroup.vendorId} className="space-y-3">
                  {/* Vendor header (only show if multiple vendors) */}
                  {getVendorCount() > 1 && (
                    <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-lg">
                      <Store className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{vendorGroup.vendorName}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        ${(vendorGroup.subtotal / 100).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Vendor items */}
                  {vendorGroup.items.map((item) => {
                    // Find the actual index in the flat items array for update/remove operations
                    const actualIndex = items.findIndex(
                      (i) =>
                        i.productId === item.productId &&
                        i.variantId === item.variantId &&
                        JSON.stringify(i.productOptions) === JSON.stringify(item.productOptions)
                    );

                    return (
                      <div
                        key={`${item.productId}-${item.variantId || 'default'}-${actualIndex}`}
                        className="flex gap-4 p-4 bg-muted rounded-lg"
                      >
                        {/* Product Image */}
                        <div className="relative w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {item.productImage ? (
                            <Image
                              src={item.productImage}
                              alt={item.productName}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
                            {item.productName}
                          </h3>
                          {item.variantName && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {item.variantName}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mb-2">
                            ${(item.productPrice / 100).toFixed(2)} each
                          </p>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center border border-input rounded-lg">
                              <button
                                type="button"
                                onClick={() => updateQuantityByIndex(actualIndex, item.quantity - 1)}
                                className="p-1 hover:bg-muted rounded-l-lg"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="px-3 py-1 font-semibold min-w-[2rem] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantityByIndex(actualIndex, item.quantity + 1)}
                                className="p-1 hover:bg-muted rounded-r-lg"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItemByIndex(actualIndex)}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              aria-label="Remove from cart"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Item Total */}
                        <div className="text-right">
                          <p className="font-bold text-foreground">
                            ${((item.productPrice * item.quantity) / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border p-6 space-y-4">
            {/* Subtotal */}
            <div className="flex items-center justify-between text-lg">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold text-foreground">
                ${(getSubtotal() / 100).toFixed(2)}
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              Shipping and taxes calculated at checkout
            </p>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleCheckout}
              className="w-full px-6 py-4 bg-primary text-primary-foreground text-lg font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Proceed to Checkout
            </button>

            {/* Continue Shopping */}
            <Link
              href="/marketplace"
              onClick={() => setIsCartOpen(false)}
              className="block text-center text-primary hover:underline font-medium"
            >
              Continue Shopping
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
