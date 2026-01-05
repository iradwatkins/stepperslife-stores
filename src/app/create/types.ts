/**
 * Types for the Create Wizard
 * Unified role onboarding flow
 */

export type WizardStep = "role" | "account" | "profile" | "success";

export type SelectedRole =
  | "organizer"
  | "instructor"
  | "service-provider"
  | "restaurateur"
  | "vendor";

export interface RoleOption {
  id: SelectedRole;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  buttonColor: string;
  image: string;
  features: string[];
}

export interface WizardState {
  currentStep: WizardStep;
  selectedRole: SelectedRole | null;
  isAuthenticated: boolean;
}

// Role-specific form data types
export interface InstructorFormData {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  displayName: string;
  title: string;
  bio: string;
  specialties: string[];
  experienceYears: string;
  city: string;
  state: string;
  instagram: string;
  facebook: string;
  youtube: string;
  website: string;
  additionalNotes: string;
}

export interface VendorFormData {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  storeName: string;
  description: string;
  categories: string[];
  businessType: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  additionalNotes: string;
}

export interface RestaurateurFormData {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  restaurantName: string;
  description: string;
  cuisineTypes: string[];
  website: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  hoursOfOperation: string;
  estimatedPickupTime: string;
  additionalNotes: string;
}

export interface ServiceProviderFormData {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  description: string;
  category: string;
  yearsInBusiness: string;
  isLicensed: boolean;
  licenseNumber: string;
  city: string;
  state: string;
  zipCode: string;
  website: string;
  serviceArea: string[];
}

export type ProfileFormData =
  | InstructorFormData
  | VendorFormData
  | RestaurateurFormData
  | ServiceProviderFormData;

// Step configuration for progress indicator
export interface StepConfig {
  key: WizardStep;
  label: string;
  description?: string;
}

export const WIZARD_STEPS: StepConfig[] = [
  { key: "role", label: "Choose Role", description: "Select your role" },
  { key: "account", label: "Account", description: "Create or sign in" },
  { key: "profile", label: "Profile", description: "Complete your profile" },
  { key: "success", label: "Done", description: "You're all set!" },
];
