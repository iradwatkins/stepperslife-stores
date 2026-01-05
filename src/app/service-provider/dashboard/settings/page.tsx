"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Loader2,
  Save,
  User,
  Building2,
  MapPin,
  Image as ImageIcon,
  Plus,
  X,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
  "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming"
];

export default function ProviderSettingsPage() {
  const provider = useQuery(api.services.getMyProvider);
  const updateProvider = useMutation(api.services.updateProvider);

  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    description: "",
    phone: "",
    email: "",
    website: "",
    city: "",
    state: "",
    zipCode: "",
    serviceArea: [] as string[],
    logoUrl: "",
    coverImageUrl: "",
  });
  const [newServiceArea, setNewServiceArea] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedUrl, setShowAdvancedUrl] = useState(false);

  // Load provider data into form
  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name || "",
        businessName: provider.businessName || "",
        description: provider.description || "",
        phone: provider.phone || "",
        email: provider.email || "",
        website: provider.website || "",
        city: provider.city || "",
        state: provider.state || "",
        zipCode: provider.zipCode || "",
        serviceArea: provider.serviceArea || [],
        logoUrl: provider.logoUrl || "",
        coverImageUrl: provider.coverImageUrl || "",
      });
    }
  }, [provider]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveSuccess(false);
  };

  const addServiceArea = () => {
    if (newServiceArea.trim() && !formData.serviceArea.includes(newServiceArea.trim())) {
      setFormData((prev) => ({
        ...prev,
        serviceArea: [...prev.serviceArea, newServiceArea.trim()],
      }));
      setNewServiceArea("");
      setSaveSuccess(false);
    }
  };

  const removeServiceArea = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceArea: prev.serviceArea.filter((a) => a !== area),
    }));
    setSaveSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await updateProvider({
        id: provider._id,
        name: formData.name || undefined,
        businessName: formData.businessName || undefined,
        description: formData.description || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        website: formData.website || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        serviceArea: formData.serviceArea.length > 0 ? formData.serviceArea : undefined,
        logoUrl: formData.logoUrl || undefined,
        coverImageUrl: formData.coverImageUrl || undefined,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (!provider) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">
          Update your business information and contact details
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Changes saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Contact Information */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://yourwebsite.com"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </section>

        {/* Business Information */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Business Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Business Name
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Tell customers about your services, experience, and what makes you stand out..."
              />
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Location & Service Area
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  State
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select State</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Service Areas */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Additional Service Areas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newServiceArea}
                  onChange={(e) => setNewServiceArea(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addServiceArea())}
                  placeholder="e.g., Oak Park, Evanston"
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={addServiceArea}
                  className="px-4 py-2.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {formData.serviceArea.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.serviceArea.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => removeServiceArea(area)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Images */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Images
          </h2>
          <div className="space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Logo
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Upload a square logo for your business. Max 5MB (JPG, PNG, WebP, GIF).
              </p>
              <ImageUpload
                currentImageUrl={formData.logoUrl}
                onImageUploaded={(url) => {
                  setFormData((prev) => ({ ...prev, logoUrl: url }));
                  setSaveSuccess(false);
                }}
                onImageRemoved={() => {
                  setFormData((prev) => ({ ...prev, logoUrl: "" }));
                  setSaveSuccess(false);
                }}
              />
            </div>

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Cover Image
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Upload a wide cover image for your profile page. Max 5MB (JPG, PNG, WebP, GIF).
              </p>
              <ImageUpload
                currentImageUrl={formData.coverImageUrl}
                onImageUploaded={(url) => {
                  setFormData((prev) => ({ ...prev, coverImageUrl: url }));
                  setSaveSuccess(false);
                }}
                onImageRemoved={() => {
                  setFormData((prev) => ({ ...prev, coverImageUrl: "" }));
                  setSaveSuccess(false);
                }}
                className="[&>button]:h-40 [&>div]:h-40"
              />
            </div>

            {/* Advanced URL Option */}
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvancedUrl ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Advanced: Use external image URLs
              </button>

              {showAdvancedUrl && (
                <div className="mt-4 space-y-4 pl-6 border-l-2 border-border">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Logo URL (external)
                    </label>
                    <input
                      type="url"
                      name="logoUrl"
                      value={formData.logoUrl}
                      onChange={handleChange}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Cover Image URL (external)
                    </label>
                    <input
                      type="url"
                      name="coverImageUrl"
                      value={formData.coverImageUrl}
                      onChange={handleChange}
                      placeholder="https://example.com/cover.png"
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use these fields if you prefer to host images externally. Uploaded images above take priority.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
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
