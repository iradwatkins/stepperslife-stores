"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import {
  ShoppingCart as ShoppingCartIcon,
  ArrowLeft,
  Package,
  Star,
  Truck,
  Shield,
  CreditCard,
  Plus,
  Minus,
  Store,
  Users,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useCart } from "@/contexts/CartContext";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { MarketplaceSubNav } from "@/components/layout/MarketplaceSubNav";
import ProductOptionInput, {
  type ProductOption,
  type SelectedOption,
} from "@/components/marketplace/ProductOptionInput";
import { VendorTierBadge } from "@/components/marketplace/VendorTierBadge";
import { VariationSelector } from "@/components/products/VariationSelector";
import { ProductReviews } from "@/components/marketplace/ProductReviews";
import { Breadcrumbs, generateBreadcrumbSchema, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";

// Type definitions
interface ProductVariant {
  id: string;
  name: string;
  options: {
    size?: string;
    color?: string;
  };
  price?: number;
  sku?: string;
  inventoryQuantity: number;
  image?: string;
}

interface ExtendedProductOption {
  id: string;
  name: string;
  description?: string;
  type: string;
  required: boolean;
  displayOrder: number;
  choices?: Array<{
    id: string;
    label: string;
    priceModifier: number;
    image?: string;
    default?: boolean;
  }>;
  priceModifier?: number;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
}

// Helper to check if a string looks like a valid Convex ID
function isValidConvexId(id: string): boolean {
  // Convex IDs are typically alphanumeric strings of specific length (20+ chars)
  return typeof id === 'string' && id.length >= 20 && /^[a-z0-9]+$/i.test(id);
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productIdParam = params.productId as string;

  // Check if this looks like a Convex ID or a slug
  const isValidId = productIdParam && isValidConvexId(productIdParam);
  const productId = isValidId ? (productIdParam as Id<"products">) : null;

  // Query by ID if valid ID, otherwise query by slug
  const productById = useQuery(
    api.products.queries.getProductById,
    productId ? { productId } : "skip"
  );

  const productBySlug = useQuery(
    api.products.queries.getProductBySlug,
    !isValidId && productIdParam ? { slug: productIdParam } : "skip"
  );

  // Use whichever query returned a result
  const product = isValidId ? productById : productBySlug;
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const { addToCart } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ size?: string; color?: string }>({});
  const [selectedProductOptions, setSelectedProductOptions] = useState<
    Record<string, SelectedOption>
  >({});

  // New variation system - track selected variation directly from VariationSelector callback
  const [newSelectedVariation, setNewSelectedVariation] = useState<{
    _id: Id<"productVariations">;
    attributes: Record<string, string>;
    price: number;
    compareAtPrice?: number;
    inventoryQuantity: number;
    trackInventory: boolean;
    sku?: string;
    imageUrl?: string;
    allowBackorder?: boolean;
  } | null>(null);

  // Check if this is a new-style variable product
  const isNewVariableProduct = product?.productType === "VARIABLE";

  // Variation is complete when a variation is selected
  const variationIsComplete = newSelectedVariation !== null;

  // When a new variation is selected, update the image
  useEffect(() => {
    if (newSelectedVariation?.imageUrl) {
      setSelectedImage(0);
    }
  }, [newSelectedVariation]);

  // Show loading state while fetching (either by ID or slug)
  const isLoading = isValidId
    ? productById === undefined
    : productBySlug === undefined;

  if (isLoading) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </>
    );
  }

  // Show "not found" if product doesn't exist (query returned null or undefined)
  if (!product) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Shop
            </Link>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  // Get current variant if selections are complete
  const currentVariant =
    product.hasVariants && product.variants && selectedOptions.size && selectedOptions.color
      ? (product.variants as ProductVariant[]).find(
          (v) =>
            v.options.size === selectedOptions.size && v.options.color === selectedOptions.color
        )
      : null;

  // Use variant image if available, otherwise use product images
  // Priority: new variation image > old variant image > product images
  const allImages = (() => {
    if (isNewVariableProduct && newSelectedVariation?.imageUrl) {
      return [newSelectedVariation.imageUrl, product.primaryImage, ...(product.images || [])].filter(Boolean) as string[];
    }
    if (currentVariant?.image) {
      return [currentVariant.image, product.primaryImage, ...(product.images || [])].filter(Boolean) as string[];
    }
    return [product.primaryImage, ...(product.images || [])].filter(Boolean) as string[];
  })();

  // Calculate stock status - consider new variations if applicable
  const getStockInfo = () => {
    if (isNewVariableProduct) {
      if (!variationIsComplete || !newSelectedVariation) {
        // No variation selected yet, show base product status
        return {
          isOutOfStock: false,
          maxQuantity: 99,
          showSelectVariation: true
        };
      }
      // Use variation inventory
      const varInStock = newSelectedVariation.trackInventory
        ? newSelectedVariation.inventoryQuantity > 0
        : true;
      return {
        isOutOfStock: !varInStock,
        maxQuantity: newSelectedVariation.trackInventory
          ? newSelectedVariation.inventoryQuantity
          : 99,
        showSelectVariation: false
      };
    }
    // Legacy behavior
    return {
      isOutOfStock: product.trackInventory && product.inventoryQuantity === 0,
      maxQuantity: product.trackInventory ? product.inventoryQuantity : 99,
      showSelectVariation: false
    };
  };

  const stockInfo = getStockInfo();
  const isOutOfStock = stockInfo.isOutOfStock;
  const maxQuantity = stockInfo.maxQuantity;

  // Calculate total options price modifier
  const totalOptionsPriceModifier = Object.values(selectedProductOptions).reduce(
    (sum, option) => sum + option.priceModifier,
    0
  );

  // Calculate final price (base/variant/new variation + options)
  const basePrice = (() => {
    if (isNewVariableProduct && newSelectedVariation) {
      return newSelectedVariation.price;
    }
    return currentVariant?.price ?? product.price;
  })();
  const finalPrice = basePrice + totalOptionsPriceModifier;

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleOptionChange = (optionId: string, selectedOption: SelectedOption | undefined) => {
    if (selectedOption) {
      setSelectedProductOptions((prev) => ({
        ...prev,
        [optionId]: selectedOption,
      }));
    } else {
      setSelectedProductOptions((prev) => {
        const newOptions = { ...prev };
        delete newOptions[optionId];
        return newOptions;
      });
    }
  };

  const handleAddToCart = () => {
    // For new variable products, use the new variation system
    if (isNewVariableProduct) {
      if (!variationIsComplete || !newSelectedVariation) {
        // Don't add to cart without selecting variation
        return;
      }

      const productOptionsArray = Object.values(selectedProductOptions);

      addToCart({
        productId: product._id,
        productName: product.name,
        productPrice: finalPrice,
        productImage: newSelectedVariation.imageUrl || product.primaryImage,
        quantity,
        vendorId: product.vendorId,
        vendorName: product.vendor?.storeName,
        variationId: newSelectedVariation._id,
        variationAttributes: newSelectedVariation.attributes,
        variationSku: newSelectedVariation.sku,
        ...(productOptionsArray.length > 0 && {
          productOptions: productOptionsArray,
          optionsPriceModifier: totalOptionsPriceModifier,
        }),
      });
      return;
    }

    // Legacy: If product has old-style variants
    let variant: ProductVariant | undefined = undefined;
    let productImage = product.primaryImage;

    if (product.hasVariants && product.variants && selectedOptions.size && selectedOptions.color) {
      variant = (product.variants as ProductVariant[]).find(
        (v) =>
          v.options.size === selectedOptions.size && v.options.color === selectedOptions.color
      );
      if (variant) {
        productImage = variant.image || product.primaryImage;
      }
    }

    // Convert selectedProductOptions to array
    const productOptionsArray = Object.values(selectedProductOptions);

    addToCart({
      productId: product._id,
      productName: product.name,
      productPrice: finalPrice, // Includes base price + options
      productImage,
      quantity,
      vendorId: product.vendorId,
      vendorName: product.vendor?.storeName,
      ...(variant && {
        variantId: variant.id,
        variantName: variant.name,
        variantOptions: variant.options,
      }),
      ...(productOptionsArray.length > 0 && {
        productOptions: productOptionsArray,
        optionsPriceModifier: totalOptionsPriceModifier,
      }),
    });
  };

  const handleBuyNow = () => {
    // Check if user is logged in - "Buy Now" requires auth since it goes directly to checkout
    if (!currentUser) {
      const productSlug = product?.slug || productIdParam;
      toast("Sign in required", {
        description: "Please sign in to complete your purchase",
        action: {
          label: "Sign In",
          onClick: () => {
            router.push(`/login?redirect=/marketplace/${productSlug}`);
          },
        },
        icon: <LogIn className="w-4 h-4" />,
      });
      return;
    }

    // For new variable products, use the new variation system
    if (isNewVariableProduct) {
      if (!variationIsComplete || !newSelectedVariation) {
        // Don't proceed without selecting variation
        return;
      }

      const productOptionsArray = Object.values(selectedProductOptions);

      addToCart({
        productId: product._id,
        productName: product.name,
        productPrice: finalPrice,
        productImage: newSelectedVariation.imageUrl || product.primaryImage,
        quantity,
        vendorId: product.vendorId,
        vendorName: product.vendor?.storeName,
        variationId: newSelectedVariation._id,
        variationAttributes: newSelectedVariation.attributes,
        variationSku: newSelectedVariation.sku,
        ...(productOptionsArray.length > 0 && {
          productOptions: productOptionsArray,
          optionsPriceModifier: totalOptionsPriceModifier,
        }),
      });
      router.push("/marketplace/checkout");
      return;
    }

    // Legacy: If product has old-style variants
    let variant: ProductVariant | undefined = undefined;
    let productImage = product.primaryImage;

    if (product.hasVariants && product.variants && selectedOptions.size && selectedOptions.color) {
      variant = (product.variants as ProductVariant[]).find(
        (v) =>
          v.options.size === selectedOptions.size && v.options.color === selectedOptions.color
      );
      if (variant) {
        productImage = variant.image || product.primaryImage;
      }
    }

    // Convert selectedProductOptions to array
    const productOptionsArray = Object.values(selectedProductOptions);

    addToCart({
      productId: product._id,
      productName: product.name,
      productPrice: finalPrice, // Includes base price + options
      productImage,
      quantity,
      vendorId: product.vendorId,
      vendorName: product.vendor?.storeName,
      ...(variant && {
        variantId: variant.id,
        variantName: variant.name,
        variantOptions: variant.options,
      }),
      ...(productOptionsArray.length > 0 && {
        productOptions: productOptionsArray,
        optionsPriceModifier: totalOptionsPriceModifier,
      }),
    });
    router.push("/marketplace/checkout");
  };

  return (
    <>
      <PublicHeader />
      <MarketplaceSubNav />
      {/* Breadcrumb SEO Schema */}
      {(() => {
        const breadcrumbItems: BreadcrumbItem[] = [
          { label: "Home", href: "/" },
          { label: "Marketplace", href: "/marketplace" },
          ...(product.category
            ? [{ label: product.category, href: `/marketplace?category=${encodeURIComponent(product.category)}` }]
            : []),
          { label: product.name },
        ];
        return (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(generateBreadcrumbSchema(breadcrumbItems)),
            }}
          />
        );
      })()}

      <div className="min-h-screen bg-background">
        {/* Breadcrumbs Navigation */}
        <div className="bg-card shadow-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Marketplace", href: "/marketplace" },
                ...(product.category
                  ? [{ label: product.category, href: `/marketplace?category=${encodeURIComponent(product.category)}` }]
                  : []),
                { label: product.name },
              ]}
            />
          </div>
        </div>

        {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-card rounded-xl shadow-md overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
            {/* Product Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                {allImages[selectedImage] ? (
                  <Image
                    src={allImages[selectedImage]}
                    alt={product.name}
                    width={600}
                    height={600}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-24 h-24 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {allImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {allImages.map((image, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === index
                          ? "border-primary"
                          : "border-transparent hover:border-input"
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`${product.name} - ${index + 1}`}
                        width={150}
                        height={150}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              {/* Product Name & Category */}
              <div>
                {product.category && (
                  <span className="inline-block px-3 py-1 bg-accent text-primary text-sm rounded-full mb-3">
                    {product.category}
                  </span>
                )}
                <h1 className="text-3xl font-bold text-foreground mb-2">{product.name}</h1>

                {/* Vendor Badge */}
                {product.vendor ? (
                  <Link
                    href={`/marketplace/vendors/${product.vendor.slug}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-100 dark:bg-sky-900/30 rounded-lg text-primary/90 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-colors mb-3"
                  >
                    {product.vendor.logo ? (
                      <div className="relative w-5 h-5">
                        <Image
                          src={product.vendor.logo}
                          alt={product.vendor.storeName}
                          fill
                          className="rounded-full object-cover"
                          sizes="20px"
                        />
                      </div>
                    ) : (
                      <Store className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">Sold by {product.vendor.storeName}</span>
                    <VendorTierBadge tier={product.vendor.tier || "BASIC"} size="sm" />
                  </Link>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg text-primary mb-3">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">SteppersLife Official</span>
                  </div>
                )}

                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Price */}
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-primary">
                    ${(finalPrice / 100).toFixed(2)}
                  </span>
                  {product.compareAtPrice &&
                    product.compareAtPrice > (currentVariant?.price ?? product.price) && (
                      <>
                        <span className="text-2xl text-muted-foreground line-through">
                          ${(product.compareAtPrice / 100).toFixed(2)}
                        </span>
                        <span className="px-2 py-1 bg-destructive text-white text-sm rounded-full font-semibold">
                          {Math.round(
                            (1 -
                              (currentVariant?.price ?? product.price) / product.compareAtPrice) *
                              100
                          )}
                          % OFF
                        </span>
                      </>
                    )}
                </div>
                {currentVariant && currentVariant.price !== product.price && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Base price: ${(product.price / 100).toFixed(2)}
                  </p>
                )}
                {totalOptionsPriceModifier !== 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Options: {totalOptionsPriceModifier >= 0 ? "+" : ""}$
                    {(totalOptionsPriceModifier / 100).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="border-t border-b border-border py-4">
                <p className="text-foreground leading-relaxed">{product.description}</p>
              </div>

              {/* Stock Status (for non-variable products) */}
              {!isNewVariableProduct && product.trackInventory && (
                <div>
                  {isOutOfStock ? (
                    <div className="flex items-center gap-2 text-destructive">
                      <Package className="w-5 h-5" />
                      <span className="font-semibold">Out of Stock</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-success">
                      <Package className="w-5 h-5" />
                      <span className="font-semibold">{product.inventoryQuantity} in stock</span>
                    </div>
                  )}
                </div>
              )}

              {/* SKU - show variation SKU if available */}
              {(newSelectedVariation?.sku || product.sku) && (
                <div className="text-sm text-muted-foreground">
                  SKU: <span className="font-mono">{newSelectedVariation?.sku || product.sku}</span>
                </div>
              )}

              {/* New Variable Products System */}
              {isNewVariableProduct && product._id && (
                <div className="space-y-4">
                  <VariationSelector
                    productId={product._id}
                    onVariationChange={(variation) => {
                      setNewSelectedVariation(variation);
                    }}
                    showPriceRange={!variationIsComplete}
                  />

                  {/* Stock status for selected variation */}
                  {variationIsComplete && newSelectedVariation && (
                    <div>
                      {newSelectedVariation.trackInventory && newSelectedVariation.inventoryQuantity === 0 ? (
                        <div className="flex items-center gap-2 text-destructive">
                          <Package className="w-5 h-5" />
                          <span className="font-semibold">Out of Stock</span>
                        </div>
                      ) : newSelectedVariation.trackInventory ? (
                        <div className="flex items-center gap-2 text-success">
                          <Package className="w-5 h-5" />
                          <span className="font-semibold">{newSelectedVariation.inventoryQuantity} in stock</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-success">
                          <Package className="w-5 h-5" />
                          <span className="font-semibold">In Stock</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Legacy Product Variants (old system) */}
              {!isNewVariableProduct && product.hasVariants && product.variants && product.variants.length > 0 && (
                <div className="space-y-4">
                  {/* Extract unique sizes and colors */}
                  {(() => {
                    const variants = product.variants as ProductVariant[];
                    const sizes = Array.from(
                      new Set(variants.map((v) => v.options.size).filter(Boolean))
                    );
                    const colors = Array.from(
                      new Set(variants.map((v) => v.options.color).filter(Boolean))
                    );

                    return (
                      <>
                        {/* Size Selection */}
                        {sizes.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Size{" "}
                              {selectedOptions.size && (
                                <span className="text-primary">({selectedOptions.size})</span>
                              )}
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {sizes.map((size) => (
                                <button
                                  type="button"
                                  key={size}
                                  onClick={() => setSelectedOptions({ ...selectedOptions, size: size as string })}
                                  className={`px-4 py-2 border-2 rounded-lg font-medium transition-all ${
                                    selectedOptions.size === size
                                      ? "border-primary bg-primary text-white"
                                      : "border-input hover:border-primary"
                                  }`}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Color Selection */}
                        {colors.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Color{" "}
                              {selectedOptions.color && (
                                <span className="text-primary">({selectedOptions.color})</span>
                              )}
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {colors.map((color) => (
                                <button
                                  type="button"
                                  key={color}
                                  onClick={() => setSelectedOptions({ ...selectedOptions, color: color as string })}
                                  className={`px-4 py-2 border-2 rounded-lg font-medium transition-all ${
                                    selectedOptions.color === color
                                      ? "border-primary bg-primary text-white"
                                      : "border-input hover:border-primary"
                                  }`}
                                >
                                  {color}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Selected Variant Info */}
                        {selectedOptions.size &&
                          selectedOptions.color &&
                          (() => {
                            const variant = variants.find(
                              (v) =>
                                v.options.size === selectedOptions.size &&
                                v.options.color === selectedOptions.color
                            );
                            if (variant) {
                              return (
                                <div className="bg-accent/50 border border-border rounded-lg p-3">
                                  <p className="text-sm text-foreground">
                                    <strong>{variant.name}</strong>
                                    {variant.inventoryQuantity > 0 ? (
                                      <span className="text-success ml-2">
                                        ({variant.inventoryQuantity} available)
                                      </span>
                                    ) : (
                                      <span className="text-destructive ml-2">(Out of stock)</span>
                                    )}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          })()}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Product Options */}
              {(product as { options?: ExtendedProductOption[] }).options &&
               (product as { options?: ExtendedProductOption[] }).options!.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Customization Options</h3>
                  {(product as { options?: ExtendedProductOption[] }).options!
                    .sort((a: ExtendedProductOption, b: ExtendedProductOption) => a.displayOrder - b.displayOrder)
                    .map((option: ExtendedProductOption) => (
                      <ProductOptionInput
                        key={option.id}
                        option={option as ProductOption}
                        value={selectedProductOptions[option.id]}
                        onChange={(selectedOption) => handleOptionChange(option.id, selectedOption)}
                      />
                    ))}
                </div>
              )}

              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Quantity</label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-input rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                        className="p-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed rounded-l-lg"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-6 py-2 font-semibold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= maxQuantity}
                        className="p-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed rounded-r-lg"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Total:{" "}
                      <span className="font-bold text-primary text-lg">
                        ${((finalPrice * quantity) / 100).toFixed(2)}
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Show message if variation needs to be selected */}
                {isNewVariableProduct && !variationIsComplete && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                    <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                      Please select all options above to continue
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock || (isNewVariableProduct && !variationIsComplete)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white text-lg font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard className="w-5 h-5" />
                  {isNewVariableProduct && !variationIsComplete ? "Select Options" : "Buy Now"}
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || (isNewVariableProduct && !variationIsComplete)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-primary text-primary text-lg font-semibold rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                  Add to Cart
                </button>
              </div>

              {/* Product Features */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
                <div className="text-center">
                  <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Secure Payment</p>
                </div>
                {product.requiresShipping && (
                  <div className="text-center">
                    <Truck className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Fast Shipping</p>
                  </div>
                )}
                <div className="text-center">
                  <Star className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Quality Assured</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Reviews Section */}
        {product._id && (
          <div className="mt-12">
            <ProductReviews productId={product._id} />
          </div>
        )}
      </main>
      </div>
      <PublicFooter />
    </>
  );
}
