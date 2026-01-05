"use client";

import { CheckCircle2 } from "lucide-react";
import { WizardStep, WIZARD_STEPS } from "../types";

interface WizardProgressProps {
  currentStep: WizardStep;
  /** Skip the account step (when user is already authenticated) */
  skipAccountStep?: boolean;
}

function getStepIndex(step: WizardStep, skipAccount: boolean): number {
  const steps = skipAccount
    ? WIZARD_STEPS.filter((s) => s.key !== "account")
    : WIZARD_STEPS;
  return steps.findIndex((s) => s.key === step);
}

export function WizardProgress({
  currentStep,
  skipAccountStep = false,
}: WizardProgressProps) {
  const steps = skipAccountStep
    ? WIZARD_STEPS.filter((s) => s.key !== "account")
    : WIZARD_STEPS;

  const currentStepIndex = getStepIndex(currentStep, skipAccountStep);
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="w-full">
      {/* Step Indicators */}
      <div className="flex justify-between items-center mb-3">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;

          return (
            <div
              key={step.key}
              className={`flex items-center ${index < steps.length - 1 ? "flex-1" : ""}`}
            >
              <div className="flex flex-col items-center">
                {/* Circle with number or checkmark */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                    transition-all duration-300
                    ${isActive ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : ""}
                    ${isCompleted ? "bg-green-500 text-white" : ""}
                    ${!isActive && !isCompleted ? "bg-muted text-muted-foreground border-2 border-border" : ""}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                {/* Label */}
                <span
                  className={`
                    mt-2 text-xs font-medium text-center hidden sm:block
                    ${isActive ? "text-primary" : ""}
                    ${isCompleted ? "text-green-600" : ""}
                    ${!isActive && !isCompleted ? "text-muted-foreground" : ""}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 bg-muted mx-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isCompleted ? "bg-green-500 w-full" : "bg-muted w-0"
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
          className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
