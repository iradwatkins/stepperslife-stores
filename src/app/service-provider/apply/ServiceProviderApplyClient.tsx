"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PublicHeader } from "@/components/layout/PublicHeader";
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
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Building2,
  Award,
  Clock,
  Plus,
  X,
  ArrowRight,
  LogIn,
} from "lucide-react";

// Service categories with icons
const SERVICE_CATEGORIES = [
  { slug: "beauty", name: "Beauty & Hair", icon: Scissors },
  { slug: "home", name: "Home Services", icon: Home },
  { slug: "events", name: "Event Services", icon: PartyPopper },
  { slug: "health", name: "Health & Wellness", icon: Heart },
  { slug: "education", name: "Education", icon: GraduationCap },
  { slug: "automotive", name: "Automotive", icon: Car },
  { slug: "professional", name: "Professional", icon: Briefcase },
  { slug: "creative", name: "Creative & Media", icon: Camera },
  { slug: "dj", name: "DJs & Entertainment", icon: Music },
];

// US States
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

// Years in business options
const YEARS_OPTIONS = [
  { value: "0", label: "Less than 1 year" },
  { value: "1", label: "1-2 years" },
  { value: "3", label: "3-5 years" },
  { value: "6", label: "6-10 years" },
  { value: "11", label: "10+ years" },
];

interface FormData {
  // Contact Info
  name: string;
  email: string;
  phone: string;
  // Business Info
  businessName: string;
  description: string;
  category: string;
  subcategories: string[];
  website: string;
  // Experience
  yearsInBusiness: string;
  isLicensed: boolean;
  licenseNumber: string;
  // Location
  city: string;
  state: string;
  zipCode: string;
  serviceArea: string[];
  // Special
  isDJ: boolean;
}

const initialFormData: FormData = {
  name: "",
  email: "",
  phone: "",
  businessName: "",
  description: "",
  category: "",
  subcategories: [],
  website: "",
  yearsInBusiness: "",
  isLicensed: false,
  licenseNumber: "",
  city: "",
  state: "",
  zipCode: "",
  serviceArea: [],
  isDJ: false,
};

export default function ServiceProviderApplyClient() {
  const { user, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newServiceArea, setNewServiceArea] = useState("");

  const applyAsProvider = useMutation(api.services.applyAsProvider);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle category selection
  const handleCategorySelect = (categorySlug: string) => {
    setFormData((prev) => ({
      ...prev,
      category: categorySlug,
      isDJ: categorySlug === "dj",
    }));
  };

  // Add service area
  const addServiceArea = () => {
    if (newServiceArea.trim() && !formData.serviceArea.includes(newServiceArea.trim())) {
      setFormData((prev) => ({
        ...prev,
        serviceArea: [...prev.serviceArea, newServiceArea.trim()],
      }));
      setNewServiceArea("");
    }
  };

  // Remove service area
  const removeServiceArea = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceArea: prev.serviceArea.filter((a) => a !== area),
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.email || !formData.phone) {
        throw new Error("Please fill in all contact information.");
      }
      if (!formData.category) {
        throw new Error("Please select a service category.");
      }
      if (!formData.city || !formData.state) {
        throw new Error("Please enter your city and state.");
      }

      // Submit to Convex
      await applyAsProvider({
        name: formData.name,
        businessName: formData.businessName || undefined,
        description: formData.description || undefined,
        phone: formData.phone,
        email: formData.email,
        website: formData.website || undefined,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode || undefined,
        serviceArea: formData.serviceArea.length > 0 ? formData.serviceArea : [],
        category: formData.category,
        subcategories: formData.subcategories.length > 0 ? formData.subcategories : [],
        yearsInBusiness: formData.yearsInBusiness ? parseInt(formData.yearsInBusiness) : undefined,
        isLicensed: formData.isLicensed || undefined,
        licenseNumber: formData.licenseNumber || undefined,
        isDJ: formData.isDJ || undefined,
      });

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <>
        <PublicHeader />
        <main className="min-h-screen bg-background py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <LogIn className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Sign In Required
              </h1>
              <p className="text-muted-foreground mb-8">
                Please sign in to apply as a service provider on SteppersLife.
              </p>
              <Link
                href={`/login?redirect=${encodeURIComponent("/service-provider/apply")}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Sign In to Continue
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  // Success state
  if (submitted) {
    return (
      <>
        <PublicHeader />
        <main className="min-h-screen bg-background py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Application Submitted!
              </h1>
              <p className="text-muted-foreground mb-8">
                Thank you for applying to be a service provider on SteppersLife.
                We&apos;ll review your application and get back to you within 2-3 business days.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/service-provider/status"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Check Application Status
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  Browse Services
                </Link>
              </div>
            </div>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  // Application form
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-background py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                List Your Services
              </h1>
              <p className="text-muted-foreground">
                Join our directory and connect with customers in your area.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Contact Information */}
              <section className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Contact Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="(555) 123-4567"
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
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="https://yourwebsite.com"
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
                      placeholder="Your Business Name (optional)"
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

              {/* Service Category */}
              <section className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Service Category <span className="text-red-500">*</span>
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Select the category that best describes your services.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SERVICE_CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    const isSelected = formData.category === category.slug;

                    return (
                      <button
                        key={category.slug}
                        type="button"
                        onClick={() => handleCategorySelect(category.slug)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            isSelected ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium text-center ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {category.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Experience & Credentials */}
              <section className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Experience & Credentials
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Years in Business
                    </label>
                    <select
                      name="yearsInBusiness"
                      value={formData.yearsInBusiness}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Select...</option>
                      {YEARS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="isLicensed"
                      name="isLicensed"
                      checked={formData.isLicensed}
                      onChange={handleChange}
                      className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="isLicensed" className="text-sm text-foreground">
                      I have a professional license/certification for my services
                    </label>
                  </div>

                  {formData.isLicensed && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        License/Certification Number
                      </label>
                      <input
                        type="text"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Enter your license number"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Location & Service Area */}
              <section className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Location & Service Area
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Chicago"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        required
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
                        placeholder="60601"
                      />
                    </div>
                  </div>

                  {/* Service Areas */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Additional Service Areas
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add other cities or neighborhoods you serve.
                    </p>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newServiceArea}
                        onChange={(e) => setNewServiceArea(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addServiceArea())}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="e.g., Oak Park, Evanston"
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

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </Link>
              </div>

              {/* Terms note */}
              <p className="text-xs text-muted-foreground text-center">
                By submitting this application, you agree to our{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
