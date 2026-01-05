"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import {
  Store,
  MapPin,
  Mail,
  Phone,
  Globe,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { VendorBrandingUpload } from "@/components/marketplace/VendorBrandingUpload";

const STORE_CATEGORIES = [
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
  contactEmail: string;
  contactPhone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  categories: string[];
  businessType: string;
  logoUrl: string | null;
  bannerUrl: string | null;
}

export default function VendorSettingsPage() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Get vendor
  const vendor = useQuery(
    api.vendors.getByOwner,
    user?._id ? { ownerId: user._id as Id<"users"> } : "skip"
  );

  const updateVendor = useMutation(api.vendors.update);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
    categories: [],
    businessType: "",
    logoUrl: null,
    bannerUrl: null,
  });

  // Populate form when vendor loads
  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name || "",
        description: vendor.description || "",
        contactEmail: vendor.contactEmail || "",
        contactPhone: vendor.contactPhone || "",
        website: vendor.website || "",
        address: vendor.address || "",
        city: (vendor as { city?: string }).city || "",
        state: (vendor as { state?: string }).state || "",
        zipCode: (vendor as { zipCode?: string }).zipCode || "",
        country: (vendor as { country?: string }).country || "USA",
        categories: (vendor as { categories?: string[] }).categories || [],
        businessType: (vendor as { businessType?: string }).businessType || "",
        logoUrl: (vendor as { logoUrl?: string }).logoUrl || null,
        bannerUrl: (vendor as { bannerUrl?: string }).bannerUrl || null,
      });
    }
  }, [vendor]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };

  const handleCategoryToggle = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
    setHasChanges(true);
  };

  const handleLogoChange = (logoUrl: string | null) => {
    setFormData((prev) => ({ ...prev, logoUrl }));
    setHasChanges(true);
  };

  const handleBannerChange = (bannerUrl: string | null) => {
    setFormData((prev) => ({ ...prev, bannerUrl }));
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendor?._id) {
      toast.error("Vendor not found");
      return;
    }

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error("Store name is required");
      return;
    }

    if (!formData.contactEmail.trim()) {
      toast.error("Contact email is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateVendor({
        vendorId: vendor._id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim() || undefined,
        website: formData.website.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        zipCode: formData.zipCode.trim() || undefined,
        country: formData.country || undefined,
        categories: formData.categories.length > 0 ? formData.categories : undefined,
        businessType: formData.businessType || undefined,
        logoUrl: formData.logoUrl || undefined,
        bannerUrl: formData.bannerUrl || undefined,
      } as {
        vendorId: Id<"vendors">;
        name: string;
        description?: string;
        contactEmail: string;
        contactPhone?: string;
        website?: string;
        address?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
        categories?: string[];
        businessType?: string;
        logoUrl?: string;
        bannerUrl?: string;
      });

      toast.success("Settings saved successfully!");
      setHasChanges(false);
    } catch (error) {
      console.error("Update settings error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save settings";
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Store Settings</h1>
          <p className="text-muted-foreground">Manage your store information and preferences</p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2 text-warning">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Unsaved changes</span>
          </div>
        )}
      </div>

      {/* Vendor Status */}
      <div className={`rounded-xl p-4 mb-8 ${
        vendor.status === "APPROVED"
          ? "bg-success/10 dark:bg-success/15 border border-success/30 dark:border-success/30"
          : vendor.status === "PENDING"
          ? "bg-warning/10 dark:bg-warning/15 border border-warning/30 dark:border-warning/30"
          : "bg-destructive/10 dark:bg-destructive/15 border border-destructive/30 dark:border-destructive/30"
      }`}>
        <div className="flex items-center gap-3">
          <CheckCircle className={`w-5 h-5 ${
            vendor.status === "APPROVED"
              ? "text-success"
              : vendor.status === "PENDING"
              ? "text-warning"
              : "text-destructive"
          }`} />
          <div>
            <p className="font-medium text-foreground">
              Store Status: {vendor.status}
            </p>
            <p className="text-sm text-muted-foreground">
              {vendor.status === "APPROVED"
                ? "Your store is active and visible to customers"
                : vendor.status === "PENDING"
                ? "Your application is under review"
                : "Your store has been suspended or rejected"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
        {/* Store Information */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Store Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Store Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Your store name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Store URL
              </label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">stepperslife.com/vendor/</span>
                <input
                  type="text"
                  value={vendor.slug}
                  disabled
                  className="flex-1 px-4 py-2 border border-input rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Store URL cannot be changed after creation
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Store Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                placeholder="Describe your store and what you sell..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Business Type
              </label>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="">Select business type</option>
                <option value="Individual">Individual / Sole Proprietor</option>
                <option value="LLC">LLC</option>
                <option value="Corporation">Corporation</option>
                <option value="Partnership">Partnership</option>
                <option value="Non-Profit">Non-Profit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Product Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {STORE_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryToggle(category)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formData.categories.includes(category)
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Store Branding */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Store Branding</h2>
              <p className="text-sm text-muted-foreground">Upload your logo and banner to personalize your store</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VendorBrandingUpload
              label="Store Logo"
              description="Square image, recommended 400x400px"
              currentImage={formData.logoUrl}
              onImageChange={handleLogoChange}
              aspectRatio="square"
            />

            <VendorBrandingUpload
              label="Store Banner"
              description="Wide image, recommended 1200x300px"
              currentImage={formData.bannerUrl}
              onImageChange={handleBannerChange}
              aspectRatio="banner"
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Contact Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Contact Email *
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="contact@yourstore.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Business Location</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Street Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">ZIP Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="USA"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Commission Info */}
        <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-6">
          <h3 className="font-bold text-sky-900 dark:text-sky-100 mb-2">
            Commission Rate: {vendor.commissionPercent || 15}%
          </h3>
          <p className="text-sm text-sky-800 dark:text-sky-200">
            SteppersLife takes a {vendor.commissionPercent || 15}% commission on each sale.
            You keep {100 - (vendor.commissionPercent || 15)}% of each sale.
            Commission rates are set by platform administrators.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !hasChanges}
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
