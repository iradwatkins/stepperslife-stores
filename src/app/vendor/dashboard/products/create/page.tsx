"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  DollarSign,
  Layers,
  Truck,
  Save,
  Loader2,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import { ProductImageUpload } from "@/components/marketplace/ProductImageUpload";

const PRODUCT_CATEGORIES = [
  "Apparel & Fashion",
  "Accessories & Jewelry",
  "Art & Prints",
  "Home & Living",
  "Health & Beauty",
  "Digital Products",
  "Books & Media",
  "Handmade & Crafts",
  "Dance Supplies",
  "Event Merchandise",
  "Other",
];

interface FormData {
  name: string;
  description: string;
  price: string;
  compareAtPrice: string;
  sku: string;
  inventoryQuantity: string;
  trackInventory: boolean;
  category: string;
  tags: string;
  requiresShipping: boolean;
  weight: string;
  shippingPrice: string;
  status: "ACTIVE" | "DRAFT";
  images: string[];
  primaryImage: string;
}

export default function CreateProductPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get vendor
  const vendor = useQuery(
    api.vendors.getByOwner,
    user?._id ? { ownerId: user._id as Id<"users"> } : "skip"
  );

  const createProduct = useMutation(api.products.mutations.createVendorProduct);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    price: "",
    compareAtPrice: "",
    sku: "",
    inventoryQuantity: "0",
    trackInventory: true,
    category: "",
    tags: "",
    requiresShipping: true,
    weight: "",
    shippingPrice: "",
    status: "DRAFT",
    images: [],
    primaryImage: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleImagesChange = (images: string[], primaryImage: string) => {
    setFormData((prev) => ({
      ...prev,
      images,
      primaryImage,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendor?._id) {
      toast.error("Vendor not found");
      return;
    }

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Product description is required");
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Valid price is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert price to cents
      const priceInCents = Math.round(parseFloat(formData.price) * 100);
      const compareAtPriceInCents = formData.compareAtPrice
        ? Math.round(parseFloat(formData.compareAtPrice) * 100)
        : undefined;
      const shippingPriceInCents = formData.shippingPrice
        ? Math.round(parseFloat(formData.shippingPrice) * 100)
        : undefined;

      await createProduct({
        vendorId: vendor._id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: priceInCents,
        compareAtPrice: compareAtPriceInCents,
        sku: formData.sku || undefined,
        inventoryQuantity: parseInt(formData.inventoryQuantity) || 0,
        trackInventory: formData.trackInventory,
        category: formData.category || undefined,
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : undefined,
        images: formData.images.length > 0 ? formData.images : undefined,
        primaryImage: formData.primaryImage || undefined,
        hasVariants: false,
        requiresShipping: formData.requiresShipping,
        weight: formData.weight ? parseInt(formData.weight) : undefined,
        shippingPrice: shippingPriceInCents,
        status: formData.status,
      } as {
        vendorId: Id<"vendors">;
        name: string;
        description: string;
        price: number;
        compareAtPrice?: number;
        sku?: string;
        inventoryQuantity: number;
        trackInventory: boolean;
        category?: string;
        tags?: string[];
        images?: string[];
        primaryImage?: string;
        hasVariants: boolean;
        requiresShipping: boolean;
        weight?: number;
        shippingPrice?: number;
        status: "ACTIVE" | "DRAFT";
      });

      toast.success("Product created successfully!");
      router.push("/vendor/dashboard/products");
    } catch (error) {
      console.error("Create product error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create product";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!vendor) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/vendor/dashboard/products"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Add New Product</h1>
        <p className="text-muted-foreground">Create a new product for your store</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
        {/* Basic Info */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Basic Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                placeholder="Describe your product..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="steppers, dance, apparel"
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <ImagePlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Product Images</h2>
              <p className="text-sm text-muted-foreground">Upload up to 8 images. First image will be the primary.</p>
            </div>
          </div>

          <ProductImageUpload
            images={formData.images}
            primaryImage={formData.primaryImage}
            onImagesChange={handleImagesChange}
            maxImages={8}
          />
        </div>

        {/* Pricing */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Pricing</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Price *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Compare at Price (original)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  name="compareAtPrice"
                  value={formData.compareAtPrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
            <p className="text-sm text-sky-900 dark:text-sky-100">
              <strong>Commission:</strong> SteppersLife takes a 15% commission on each sale.
              {formData.price && (
                <>
                  {" "}You'll earn ${((parseFloat(formData.price) || 0) * 0.85).toFixed(2)} per sale.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Inventory</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                SKU (Stock Keeping Unit)
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Quantity
              </label>
              <input
                type="number"
                name="inventoryQuantity"
                value={formData.inventoryQuantity}
                onChange={handleInputChange}
                min="0"
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="trackInventory"
                checked={formData.trackInventory}
                onChange={handleInputChange}
                className="w-5 h-5 rounded border-input text-primary focus:ring-sky-500"
              />
              <span className="text-sm text-foreground">Track inventory for this product</span>
            </label>
          </div>
        </div>

        {/* Shipping */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Shipping</h2>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="requiresShipping"
                checked={formData.requiresShipping}
                onChange={handleInputChange}
                className="w-5 h-5 rounded border-input text-primary focus:ring-sky-500"
              />
              <span className="text-sm text-foreground">This product requires shipping</span>
            </label>
          </div>

          {formData.requiresShipping && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Weight (grams)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Shipping Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    name="shippingPrice"
                    value={formData.shippingPrice}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status & Submit */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="DRAFT">Draft - Not visible to customers</option>
                <option value="ACTIVE">Active - Visible in marketplace</option>
              </select>
            </div>

            <div className="flex gap-3">
              <Link
                href="/vendor/dashboard/products"
                className="px-6 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Create Product
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
