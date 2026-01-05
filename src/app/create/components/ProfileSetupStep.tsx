"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  MapPin,
  Clock,
  Globe,
  Instagram,
  Facebook,
  Youtube,
  FileText,
  Loader2,
  CheckCircle,
  GraduationCap,
  Sparkles,
  Store,
  ChefHat,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { SelectedRole } from "../types";

interface ProfileSetupStepProps {
  selectedRole: SelectedRole;
  onBack: () => void;
  onComplete: () => void;
}

// Shared constants
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

const INSTRUCTOR_SPECIALTIES = [
  "Steppin", "Line Dance", "Walking", "Ballroom",
  "Two-Step", "Cha Cha Slide", "Urban Contemporary", "Other"
];

const EXPERIENCE_OPTIONS = [
  { value: "1-2", label: "1-2 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "6-10", label: "6-10 years" },
  { value: "10-15", label: "10-15 years" },
  { value: "15+", label: "15+ years" },
];

const VENDOR_CATEGORIES = [
  "Clothing", "Shoes", "Accessories", "Jewelry",
  "Dance Supplies", "Event Supplies", "Other"
];

const CUISINE_TYPES = [
  "Soul Food", "BBQ", "Caribbean", "American",
  "Mexican", "Italian", "Asian", "Other"
];

const SERVICE_CATEGORIES = [
  "DJ", "Photographer", "Videographer", "Hair Stylist",
  "Makeup Artist", "Transportation", "Decoration", "Other"
];

function experienceToYears(exp: string): number | undefined {
  switch (exp) {
    case "1-2": return 2;
    case "3-5": return 5;
    case "6-10": return 10;
    case "10-15": return 15;
    case "15+": return 20;
    default: return undefined;
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProfileSetupStep({
  selectedRole,
  onBack,
  onComplete,
}: ProfileSetupStepProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutations for different roles
  const createInstructor = useMutation(api.instructors.mutations.create);
  const applyVendor = useMutation(api.vendors.apply);
  const applyRestaurant = useMutation(api.restaurants.apply);
  const applyServiceProvider = useMutation(api.services.applyAsProvider);
  const upgradeToOrganizer = useMutation(api.users.mutations.upgradeToOrganizer);

  // Check for existing profiles
  const existingInstructor = useQuery(
    api.instructors.queries.getByUserId,
    selectedRole === "instructor" && user?._id
      ? { userId: user._id as Id<"users"> }
      : "skip"
  );

  // Upgrade to organizer and redirect to event creation
  useEffect(() => {
    if (selectedRole === "organizer") {
      // Upgrade user role to "organizer" before redirecting
      upgradeToOrganizer()
        .then(() => {
          console.log("[ProfileSetupStep] User upgraded to organizer, redirecting...");
          router.push("/organizer/events/create");
        })
        .catch((error) => {
          console.error("[ProfileSetupStep] Failed to upgrade to organizer:", error);
          // Still redirect - the layout will handle the auth check
          router.push("/organizer/events/create");
        });
    }
  }, [selectedRole, router, upgradeToOrganizer]);

  // Form state for all roles
  const [formData, setFormData] = useState({
    // Common fields
    displayName: "",
    contactEmail: "",
    contactPhone: "",
    city: "",
    state: "IL",
    // Instructor-specific
    title: "",
    bio: "",
    specialties: [] as string[],
    experienceYears: "",
    instagram: "",
    facebook: "",
    youtube: "",
    website: "",
    // Vendor-specific
    storeName: "",
    storeDescription: "",
    categories: [] as string[],
    businessType: "individual",
    address: "",
    zipCode: "",
    // Restaurateur-specific
    restaurantName: "",
    restaurantDescription: "",
    cuisineTypes: [] as string[],
    hoursOfOperation: "",
    estimatedPickupTime: "15-20 minutes",
    // Service Provider-specific
    businessName: "",
    serviceCategory: "",
    yearsInBusiness: "",
    isLicensed: false,
    licenseNumber: "",
    // Additional
    additionalNotes: "",
  });

  // Pre-fill user info
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        displayName: user.name || "",
        contactEmail: user.email || "",
        storeName: user.name || "",
        restaurantName: "",
        businessName: user.name || "",
      }));
    }
  }, [user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleMultiSelect = (field: string, value: string) => {
    setFormData((prev) => {
      const current = prev[field as keyof typeof prev] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) };
      }
      return { ...prev, [field]: [...current, value] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?._id) {
      toast.error("You must be signed in to complete your profile");
      return;
    }

    setIsSubmitting(true);

    try {
      switch (selectedRole) {
        case "instructor":
          if (!formData.displayName.trim()) {
            toast.error("Please enter your display name");
            return;
          }
          if (formData.specialties.length === 0) {
            toast.error("Please select at least one teaching specialty");
            return;
          }
          if (!formData.city.trim()) {
            toast.error("Please enter your city");
            return;
          }

          await createInstructor({
            name: formData.displayName.trim(),
            slug: generateSlug(formData.displayName),
            title: formData.title.trim() || undefined,
            bio: formData.bio.trim() || undefined,
            specialties: formData.specialties,
            experienceYears: experienceToYears(formData.experienceYears),
            location: `${formData.city.trim()}, ${formData.state}`,
            socialLinks: {
              instagram: formData.instagram.trim() || undefined,
              facebook: formData.facebook.trim() || undefined,
              youtube: formData.youtube.trim() || undefined,
              website: formData.website.trim() || undefined,
            },
          });
          break;

        case "vendor":
          if (!formData.storeName.trim()) {
            toast.error("Please enter your store name");
            return;
          }
          if (formData.categories.length === 0) {
            toast.error("Please select at least one category");
            return;
          }
          if (!formData.city.trim()) {
            toast.error("Please enter your city");
            return;
          }

          await applyVendor({
            name: formData.storeName.trim(),
            description: formData.storeDescription.trim() || undefined,
            contactName: formData.displayName.trim(),
            contactEmail: formData.contactEmail.trim(),
            contactPhone: formData.contactPhone.trim(),
            businessType: formData.businessType || undefined,
            address: formData.address.trim() || undefined,
            city: formData.city.trim(),
            state: formData.state,
            zipCode: formData.zipCode.trim(),
            categories: formData.categories,
            website: formData.website.trim() || undefined,
            additionalNotes: formData.additionalNotes.trim() || undefined,
          });
          break;

        case "restaurateur":
          if (!formData.restaurantName.trim()) {
            toast.error("Please enter your restaurant name");
            return;
          }
          if (formData.cuisineTypes.length === 0) {
            toast.error("Please select at least one cuisine type");
            return;
          }
          if (!formData.address.trim() || !formData.city.trim()) {
            toast.error("Please enter your address and city");
            return;
          }

          await applyRestaurant({
            name: formData.restaurantName.trim(),
            description: formData.restaurantDescription.trim() || undefined,
            address: formData.address.trim(),
            city: formData.city.trim(),
            state: formData.state,
            zipCode: formData.zipCode.trim(),
            phone: formData.contactPhone.trim(),
            cuisine: formData.cuisineTypes,
            contactName: formData.displayName.trim(),
            contactEmail: formData.contactEmail.trim(),
            website: formData.website.trim() || undefined,
            hoursOfOperation: formData.hoursOfOperation.trim() || undefined,
            estimatedPickupTime: parseInt(formData.estimatedPickupTime) || 20,
            additionalNotes: formData.additionalNotes.trim() || undefined,
            selectedPlan: "starter",
          });
          break;

        case "service-provider":
          if (!formData.displayName.trim()) {
            toast.error("Please enter your name");
            return;
          }
          if (!formData.serviceCategory) {
            toast.error("Please select a service category");
            return;
          }
          if (!formData.city.trim()) {
            toast.error("Please enter your city");
            return;
          }

          await applyServiceProvider({
            name: formData.displayName.trim(),
            businessName: formData.businessName.trim() || undefined,
            description: formData.bio.trim() || undefined,
            phone: formData.contactPhone.trim(),
            email: formData.contactEmail.trim(),
            website: formData.website.trim() || undefined,
            city: formData.city.trim(),
            state: formData.state,
            zipCode: formData.zipCode.trim() || undefined,
            serviceArea: [formData.city.trim()],
            category: formData.serviceCategory,
            subcategories: [],
            yearsInBusiness: parseInt(formData.yearsInBusiness) || undefined,
            isLicensed: formData.isLicensed,
            licenseNumber: formData.licenseNumber.trim() || undefined,
            isDJ: formData.serviceCategory === "DJ",
          });
          break;
      }

      toast.success("Profile created successfully!");
      onComplete();
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show existing profile message for instructors
  if (selectedRole === "instructor" && existingInstructor) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          You Already Have a Profile
        </h2>
        <p className="text-muted-foreground mb-6">
          You already have an instructor profile. Visit your dashboard to manage your classes.
        </p>
        <button
          onClick={() => router.push("/instructor/dashboard")}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // Show loading for organizer redirect
  if (selectedRole === "organizer") {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Redirecting to event creation...</p>
      </div>
    );
  }

  const roleConfig = {
    instructor: {
      icon: GraduationCap,
      color: "text-blue-600",
      title: "Complete Your Instructor Profile",
      description: "Set up your profile to start teaching dance classes",
    },
    vendor: {
      icon: Store,
      color: "text-green-600",
      title: "Set Up Your Store",
      description: "Create your marketplace vendor profile",
    },
    restaurateur: {
      icon: ChefHat,
      color: "text-orange-600",
      title: "Add Your Restaurant",
      description: "Partner with SteppersLife to reach event attendees",
    },
    "service-provider": {
      icon: Wrench,
      color: "text-teal-600",
      title: "List Your Services",
      description: "Offer your services to the stepping community",
    },
    organizer: {
      icon: Sparkles,
      color: "text-purple-600",
      title: "Create Events",
      description: "Start hosting events",
    },
  };

  const config = roleConfig[selectedRole];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className={`w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`w-8 h-8 ${config.color}`} />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{config.title}</h2>
        <p className="text-muted-foreground">{config.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Instructor Form */}
        {selectedRole === "instructor" && (
          <>
            {/* Contact Info */}
            <section className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Your Information
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    data-testid="instructor-name-input"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Master Instructor"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Tell students about yourself..."
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
                  />
                </div>
              </div>
            </section>

            {/* Teaching Specialties */}
            <section className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                Teaching Specialties <span className="text-red-500">*</span>
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {INSTRUCTOR_SPECIALTIES.map((specialty) => (
                  <button
                    key={specialty}
                    type="button"
                    onClick={() => handleMultiSelect("specialties", specialty)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formData.specialties.includes(specialty)
                        ? "bg-blue-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {specialty}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Experience Level
                </label>
                <select
                  name="experienceYears"
                  value={formData.experienceYears}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="">Select experience</option>
                  {EXPERIENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </section>

            {/* Location */}
            <section className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Location <span className="text-red-500">*</span>
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    data-testid="instructor-city-input"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    placeholder="Chicago"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">State</label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Social Links */}
            <section className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                Social Links (Optional)
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    <Instagram className="w-4 h-4 inline mr-1" /> Instagram
                  </label>
                  <input
                    type="text"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleInputChange}
                    placeholder="@username"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    <Facebook className="w-4 h-4 inline mr-1" /> Facebook
                  </label>
                  <input
                    type="text"
                    name="facebook"
                    value={formData.facebook}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    <Youtube className="w-4 h-4 inline mr-1" /> YouTube
                  </label>
                  <input
                    type="text"
                    name="youtube"
                    value={formData.youtube}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    <Globe className="w-4 h-4 inline mr-1" /> Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
              </div>
            </section>
          </>
        )}

        {/* Vendor Form */}
        {selectedRole === "vendor" && (
          <>
            <section className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Store className="w-4 h-4 text-green-600" />
                Store Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                  <textarea
                    name="storeDescription"
                    value={formData.storeDescription}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Categories <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {VENDOR_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleMultiSelect("categories", cat)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          formData.categories.includes(cat)
                            ? "bg-green-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                Location
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">State</label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Restaurateur Form */}
        {selectedRole === "restaurateur" && (
          <>
            <section className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-orange-600" />
                Restaurant Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Restaurant Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="restaurantName"
                    value={formData.restaurantName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                  <textarea
                    name="restaurantDescription"
                    value={formData.restaurantDescription}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Cuisine Types <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CUISINE_TYPES.map((cuisine) => (
                      <button
                        key={cuisine}
                        type="button"
                        onClick={() => handleMultiSelect("cuisineTypes", cuisine)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          formData.cuisineTypes.includes(cuisine)
                            ? "bg-orange-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {cuisine}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-600" />
                Location <span className="text-red-500">*</span>
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">State</label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Service Provider Form */}
        {selectedRole === "service-provider" && (
          <>
            <section className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-teal-600" />
                Service Information
              </h3>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Business Name</label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Service Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="serviceCategory"
                    value={formData.serviceCategory}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option value="">Select category</option>
                    {SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Describe your services..."
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
                  />
                </div>
              </div>
            </section>

            <section className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600" />
                Location <span className="text-red-500">*</span>
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">State</label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Additional Notes (all roles except organizer - which redirects) */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Additional Notes
          </h3>
          <textarea
            name="additionalNotes"
            value={formData.additionalNotes}
            onChange={handleInputChange}
            rows={3}
            placeholder="Anything else you'd like us to know?"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
          />
        </section>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="submit-profile-button"
          className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Profile...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Complete Profile
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
