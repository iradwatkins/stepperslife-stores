/**
 * Unified Checkout Layout Component
 *
 * Provides consistent checkout container with:
 * - Responsive grid layout (desktop: 2-column, mobile: stacked)
 * - Progress indicator
 * - Breadcrumb navigation
 * - Security badges and trust indicators
 */

import { ReactNode } from "react";
import { Shield, Lock, CheckCircle2 } from "lucide-react";

export type CheckoutStep = "contact" | "payment" | "confirmation";

export interface CheckoutLayoutProps {
  /** Current step in checkout flow */
  currentStep: CheckoutStep;
  /** Left column content (typically order summary) */
  leftColumn: ReactNode;
  /** Right column content (contact form / payment / success) */
  rightColumn: ReactNode;
  /** Optional breadcrumb path */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Show security badges */
  showSecurityBadges?: boolean;
}

const STEPS: Array<{ key: CheckoutStep; label: string }> = [
  { key: "contact", label: "Contact Info" },
  { key: "payment", label: "Payment" },
  { key: "confirmation", label: "Confirmation" },
];

/**
 * Get step index for progress calculation
 */
function getStepIndex(step: CheckoutStep): number {
  return STEPS.findIndex((s) => s.key === step);
}

export function CheckoutLayout({
  currentStep,
  leftColumn,
  rightColumn,
  breadcrumbs,
  showSecurityBadges = true,
}: CheckoutLayoutProps) {
  const currentStepIndex = getStepIndex(currentStep);
  const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-muted">
      {/* Header with Progress */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-3">
              <ol className="flex items-center space-x-2 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center">
                    {index > 0 && <span className="mx-2 text-muted-foreground">/</span>}
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="text-primary hover:text-primary transition-colors"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between items-center mb-2">
              {STEPS.map((step, index) => {
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;

                return (
                  <div
                    key={step.key}
                    className={`flex items-center ${index < STEPS.length - 1 ? "flex-1" : ""}`}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                          transition-colors
                          ${isActive ? "bg-primary text-white" : ""}
                          ${isCompleted ? "bg-success text-white" : ""}
                          ${!isActive && !isCompleted ? "bg-muted text-muted-foreground" : ""}
                        `}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                      </div>
                      <span
                        className={`
                          mt-1 text-xs font-medium hidden sm:block
                          ${isActive ? "text-primary" : ""}
                          ${isCompleted ? "text-success" : ""}
                          ${!isActive && !isCompleted ? "text-muted-foreground" : ""}
                        `}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className="flex-1 h-1 bg-muted mx-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isCompleted ? "bg-success w-full" : "bg-muted w-0"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Order Summary (Sticky on desktop) */}
          <div className="order-2 lg:order-1">
            <div className="lg:sticky lg:top-24">{leftColumn}</div>
          </div>

          {/* Right Column: Form/Payment/Success */}
          <div className="order-1 lg:order-2">{rightColumn}</div>
        </div>
      </div>

      {/* Security Badges Footer */}
      {showSecurityBadges && (
        <div className="bg-card border-t border-border py-6 mt-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-success" />
                <span>Secure Checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <span>256-bit SSL Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span>PCI Compliant</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
