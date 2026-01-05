"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { WizardProgress } from "./components/WizardProgress";
import { RoleSelectionStep } from "./components/RoleSelectionStep";
import { AccountStep } from "./components/AccountStep";
import { ProfileSetupStep } from "./components/ProfileSetupStep";
import { SuccessStep } from "./components/SuccessStep";
import { WizardStep, SelectedRole } from "./types";

const WIZARD_STATE_KEY = "stepperslife_wizard_state";

interface SavedWizardState {
  selectedRole: SelectedRole | null;
  returnStep: WizardStep;
}

export function CreateWizardClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<WizardStep>("role");
  const [selectedRole, setSelectedRole] = useState<SelectedRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  /**
   * Check if the authenticated user has an existing instructor profile.
   * If yes, redirect to instructor dashboard instead of showing wizard profile step.
   */
  const checkInstructorProfileAndRedirect = useCallback(
    async (role: SelectedRole): Promise<boolean> => {
      if (role !== "instructor") {
        return false; // Only check for instructor role
      }

      try {
        const response = await fetch("/api/instructor/check-profile");
        if (response.ok) {
          const data = await response.json();
          if (data.hasProfile && data.profile) {
            // User already has an instructor profile - redirect to dashboard
            router.push("/instructor/dashboard");
            return true;
          }
        }
      } catch (error) {
        console.error("Failed to check instructor profile:", error);
      }
      return false;
    },
    [router]
  );

  // Check authentication status on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(!!data.user);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  // Handle OAuth callback and restore state
  useEffect(() => {
    if (isCheckingAuth) return;

    const oauthSuccess = searchParams.get("oauth") === "success";
    const roleParam = searchParams.get("role") as SelectedRole | null;

    async function handleOAuthCallback() {
      if (oauthSuccess && isAuthenticated) {
        // Restore wizard state from localStorage
        try {
          const savedState = localStorage.getItem(WIZARD_STATE_KEY);
          if (savedState) {
            const parsed: SavedWizardState = JSON.parse(savedState);
            if (parsed.selectedRole) {
              // Check if instructor with existing profile - redirect to dashboard
              const redirected = await checkInstructorProfileAndRedirect(
                parsed.selectedRole
              );
              if (redirected) {
                localStorage.removeItem(WIZARD_STATE_KEY);
                return;
              }

              setSelectedRole(parsed.selectedRole);
              setCurrentStep("profile");
              localStorage.removeItem(WIZARD_STATE_KEY);
              return;
            }
          }
        } catch {
          // Ignore parsing errors
        }
        // If no saved state but authenticated, go to role selection
        setCurrentStep("role");
      } else if (roleParam) {
        // Direct link with role parameter (e.g., /create?role=instructor)
        const validRoles: SelectedRole[] = [
          "organizer",
          "instructor",
          "service-provider",
          "restaurateur",
          "vendor",
        ];
        if (validRoles.includes(roleParam)) {
          // Check if instructor with existing profile - redirect to dashboard
          if (isAuthenticated) {
            const redirected = await checkInstructorProfileAndRedirect(roleParam);
            if (redirected) {
              return;
            }
          }

          setSelectedRole(roleParam);
          if (isAuthenticated) {
            setCurrentStep("profile");
          } else {
            setCurrentStep("account");
          }
        }
      }
    }

    handleOAuthCallback();
  }, [searchParams, isAuthenticated, isCheckingAuth, checkInstructorProfileAndRedirect]);

  // Save wizard state before OAuth redirect
  const handleSaveState = useCallback(() => {
    if (selectedRole) {
      const state: SavedWizardState = {
        selectedRole,
        returnStep: "profile",
      };
      localStorage.setItem(WIZARD_STATE_KEY, JSON.stringify(state));
    }
  }, [selectedRole]);

  // Handle role selection
  const handleRoleSelect = async (role: SelectedRole) => {
    setSelectedRole(role);
    if (isAuthenticated) {
      // Check if instructor with existing profile - redirect to dashboard
      const redirected = await checkInstructorProfileAndRedirect(role);
      if (redirected) {
        return;
      }
      // Skip account step if already authenticated
      setCurrentStep("profile");
    } else {
      setCurrentStep("account");
    }
  };

  // Handle account creation/login completion
  const handleAccountComplete = () => {
    setIsAuthenticated(true);
    setCurrentStep("profile");
  };

  // Handle profile completion
  const handleProfileComplete = () => {
    setCurrentStep("success");
  };

  // Handle back button
  const handleBack = () => {
    switch (currentStep) {
      case "account":
        setCurrentStep("role");
        break;
      case "profile":
        if (!isAuthenticated) {
          setCurrentStep("account");
        } else {
          setCurrentStep("role");
        }
        break;
      default:
        break;
    }
  };

  // Render loading state
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader showCreateButton={false} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  // Render wizard step
  const renderStep = () => {
    switch (currentStep) {
      case "role":
        return <RoleSelectionStep onSelectRole={handleRoleSelect} />;
      case "account":
        return (
          <AccountStep
            selectedRole={selectedRole!}
            onBack={handleBack}
            onComplete={handleAccountComplete}
            onSaveState={handleSaveState}
          />
        );
      case "profile":
        return (
          <ProfileSetupStep
            selectedRole={selectedRole!}
            onBack={handleBack}
            onComplete={handleProfileComplete}
          />
        );
      case "success":
        return <SuccessStep selectedRole={selectedRole!} />;
      default:
        return null;
    }
  };

  // Show back button for steps after role selection (except success)
  const showBackButton = currentStep !== "role" && currentStep !== "success";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader showCreateButton={false} />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-primary/5 to-background py-8 sm:py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            {/* Back Button */}
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                className="mb-4 -ml-2"
                onClick={handleBack}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}

            {/* Header */}
            {currentStep === "role" && (
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Get Started</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3">
                  Join the SteppersLife Community
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                  Create an account and choose your role to start connecting with the stepping community.
                </p>
              </div>
            )}

            {/* Progress Indicator */}
            {currentStep !== "success" && (
              <div className="max-w-2xl mx-auto mb-8">
                <WizardProgress
                  currentStep={currentStep}
                  skipAccountStep={isAuthenticated === true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Wizard Content */}
        <div className="container mx-auto max-w-6xl px-4 py-8 sm:py-12">
          {renderStep()}
        </div>

        {/* FAQ Section - Only on role selection step */}
        {currentStep === "role" && (
          <div className="bg-muted/50 py-12 sm:py-16 px-4">
            <div className="container mx-auto max-w-3xl">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center mb-6 sm:mb-8">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                <div className="bg-card border border-border rounded-lg p-5 sm:p-6">
                  <h3 className="font-semibold text-foreground mb-2">How much does it cost to get started?</h3>
                  <p className="text-muted-foreground text-sm">
                    Creating events is free to start - you get 1,000 ticket credits. Restaurant and marketplace applications are free to submit. We only charge fees when you make sales.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-5 sm:p-6">
                  <h3 className="font-semibold text-foreground mb-2">How do I get paid?</h3>
                  <p className="text-muted-foreground text-sm">
                    Payments are processed securely through Stripe. Funds are deposited directly to your bank account, typically within 2-7 business days after an event or sale.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-5 sm:p-6">
                  <h3 className="font-semibold text-foreground mb-2">Can I have multiple roles?</h3>
                  <p className="text-muted-foreground text-sm">
                    Yes! You can be an event organizer, instructor, vendor, and more all at once. Many organizers also sell merchandise related to their events.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
