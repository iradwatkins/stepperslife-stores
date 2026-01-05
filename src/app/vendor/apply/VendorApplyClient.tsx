"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  Store,
  MapPin,
  Phone,
  Building2,
  Mail,
  User,
  FileText,
  CheckCircle,
  Loader2,
  LogIn,
  Globe,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

interface FormData {
  // Contact Info
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  // Store Info
  storeName: string;
  description: string;
  categories: string[];
  // Business Info
  businessType: string;
  // Location
  address: string;
  city: string;
  state: string;
  zipCode: string;
  // Additional
  website: string;
  additionalNotes: string;
}

const CATEGORY_OPTIONS = [
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

const BUSINESS_TYPES = [
  { value: "individual", label: "Individual / Sole Proprietor" },
  { value: "llc", label: "LLC (Limited Liability Company)" },
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "nonprofit", label: "Non-Profit Organization" },
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

export default function VendorApplyClient() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const applyMutation = useMutation(api.vendors.apply);

  const [formData, setFormData] = useState<FormData>({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    storeName: "",
    description: "",
    categories: [],
    businessType: "individual",
    address: "",
    city: "",
    state: "IL",
    zipCode: "",
    website: "",
    additionalNotes: "",
  });

  // Pre-fill user info when authenticated
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        contactName: user.name || prev.contactName,
        contactEmail: user.email || prev.contactEmail,
      }));
    }
  }, [user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryToggle = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const required = [
      "contactName",
      "contactEmail",
      "contactPhone",
      "storeName",
      "city",
      "state",
      "zipCode",
    ];
    const missing = required.filter((field) => !formData[field as keyof FormData]);

    if (missing.length > 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.categories.length === 0) {
      toast.error("Please select at least one product category");
      return;
    }

    if (!user?._id) {
      toast.error("You must be signed in to submit an application");
      return;
    }

    setIsSubmitting(true);

    try {
      await applyMutation({
        name: formData.storeName,
        description: formData.description || undefined,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        businessType: formData.businessType || undefined,
        address: formData.address || undefined,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        categories: formData.categories,
        website: formData.website || undefined,
        additionalNotes: formData.additionalNotes || undefined,
      });

      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (error) {
      console.error("Submission error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit application";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <PublicHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </>
    );
  }

  // Not signed in - show sign in prompt
  if (!isAuthenticated) {
    return (
      <>
        <PublicHeader />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto bg-card rounded-2xl shadow-lg p-8 text-center border border-border">
              <div className="w-16 h-16 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <LogIn className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Sign In to Apply
              </h1>
              <p className="text-muted-foreground mb-8">
                Create an account or sign in to submit your vendor application and start
                selling on the SteppersLife marketplace.
              </p>
              <Link
                href={`/login?redirect=${encodeURIComponent("/vendor/apply")}`}
                className="block w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Sign In to Continue
              </Link>
              <p className="text-sm text-muted-foreground mt-4">
                Don't have an account? You can create one when you sign in.
              </p>
            </div>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  // Application submitted successfully
  if (submitted) {
    return (
      <>
        <PublicHeader />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto bg-card rounded-2xl shadow-lg p-8 text-center border border-border">
              <div className="w-16 h-16 bg-success/20 dark:bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Your Store is Ready!
              </h1>
              <p className="text-muted-foreground mb-6">
                Welcome to SteppersLife! Your vendor account is all set up. You can
                start adding products to your store right away.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-foreground">
                  <strong>What's Next?</strong>
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 text-left">
                  <li>Go to your Vendor Dashboard</li>
                  <li>Add your first products</li>
                  <li>Set up your store profile</li>
                  <li>Start selling to our community!</li>
                </ul>
              </div>
              <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-4 mb-6 border border-sky-200 dark:border-sky-800">
                <p className="text-sm text-sky-900 dark:text-sky-100">
                  <strong>Your Tier:</strong> Basic Vendor (15% commission). Higher tiers
                  with lower fees are available - contact us to learn more about becoming
                  a Verified (10%) or Premium (5%) vendor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/vendor/dashboard")}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Go to Vendor Dashboard
              </button>
            </div>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  // Application form
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary to-indigo-700 py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4">
                <Store className="h-4 w-4" />
                Vendor Application
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Apply to Sell on SteppersLife
              </h1>
              <p className="text-white/90">
                Join our marketplace and reach thousands of customers in the stepping
                community.
              </p>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div className="container mx-auto px-4 py-12">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
            {/* Contact Information */}
            <div className="bg-card rounded-2xl shadow-md border border-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Contact Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-background"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-background"
                    placeholder="john@example.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-background"
                    placeholder="(312) 555-0123"
                  />
                </div>
              </div>
            </div>

            {/* Store Information */}
            <div className="bg-card rounded-2xl shadow-md border border-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Store Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-background"
                    placeholder="My Awesome Store"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Store Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-background resize-none"
                    placeholder="Tell us about your store, what you sell, and what makes your products special..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Product Categories * (select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map((category) => (
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

            {/* Business Information */}
            <div className="bg-card rounded-2xl shadow-md border border-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Business Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Business Type
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-background"
                  >
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Website (optional)
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-background"
                    placeholder="https://www.yourstore.com"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-card rounded-2xl shadow-md border border-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Location</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Street Address (optional)
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-background"
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-background"
                      placeholder="Chicago"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      State *
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-background"
                    >
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-background"
                      placeholder="60601"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="bg-card rounded-2xl shadow-md border border-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Additional Notes</h2>
              </div>

              <textarea
                name="additionalNotes"
                value={formData.additionalNotes}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-background resize-none"
                placeholder="Anything else you'd like us to know about your store or products..."
              />
            </div>

            {/* Commission Notice */}
            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-4 border border-sky-200 dark:border-sky-800">
              <p className="text-sm text-sky-900 dark:text-sky-100">
                <strong>Commission Info:</strong> SteppersLife takes a 15% commission on each
                sale. There are no monthly fees or setup costs. You only pay when you sell!
              </p>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Store className="w-5 h-5" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
