"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";
import { Check, Circle, ChevronRight, X, PartyPopper, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  restaurantId: Id<"restaurants">;
  dismissible?: boolean;
  compact?: boolean;
}

export function OnboardingProgress({
  restaurantId,
  dismissible = true,
  compact = false,
}: OnboardingProgressProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const progress = useQuery(api.restaurants.getOnboardingProgress, { restaurantId });

  // Don't render if loading, dismissed, or complete
  if (!progress) {
    if (compact) return null;
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isDismissed) return null;

  // Celebration state when complete
  if (progress.isComplete) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
              <PartyPopper className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-700 dark:text-green-300">
                You're All Set!
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                Your restaurant setup is complete. You're ready to start receiving orders!
              </p>
            </div>
            {dismissible && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDismissed(true)}
                className="text-green-600 hover:text-green-700 hover:bg-green-100"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact version for sidebar
  if (compact) {
    return (
      <div className="px-4 py-3 border-t">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Setup Progress</span>
          <span className="text-sm text-muted-foreground">{progress.percentComplete}%</span>
        </div>
        <Progress value={progress.percentComplete} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {progress.completedCount} of {progress.totalSteps} steps complete
        </p>
      </div>
    );
  }

  // Full progress tracker
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Complete Your Setup</CardTitle>
            <CardDescription>
              Finish these steps to start receiving orders
            </CardDescription>
          </div>
          {dismissible && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDismissed(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{progress.percentComplete}% Complete</span>
            <span className="text-sm text-muted-foreground">
              {progress.completedCount} of {progress.totalSteps} steps
            </span>
          </div>
          <Progress value={progress.percentComplete} className="h-3" />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {progress.steps.map((step, index) => (
            <Link
              key={step.id}
              href={step.href}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                step.completed
                  ? "bg-green-50 dark:bg-green-950/20"
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              {/* Step Number / Check */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  step.completed
                    ? "bg-green-100 dark:bg-green-900/50"
                    : "bg-muted"
                )}
              >
                {step.completed ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "flex-1 text-sm font-medium",
                  step.completed
                    ? "text-green-700 dark:text-green-300"
                    : "text-foreground"
                )}
              >
                {step.label}
              </span>

              {/* Arrow */}
              {!step.completed && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </Link>
          ))}
        </div>

        {/* Stats */}
        {(progress.menuItemCount > 0 || progress.locationCount > 0) && (
          <div className="flex gap-4 pt-2 border-t">
            {progress.locationCount > 0 && (
              <div className="text-sm">
                <span className="font-medium">{progress.locationCount}</span>{" "}
                <span className="text-muted-foreground">
                  {progress.locationCount === 1 ? "Location" : "Locations"}
                </span>
              </div>
            )}
            {progress.menuItemCount > 0 && (
              <div className="text-sm">
                <span className="font-medium">{progress.menuItemCount}</span>{" "}
                <span className="text-muted-foreground">
                  Menu {progress.menuItemCount === 1 ? "Item" : "Items"}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Circular progress ring for sidebar
export function OnboardingProgressRing({
  restaurantId,
  size = 40,
}: {
  restaurantId: Id<"restaurants">;
  size?: number;
}) {
  const progress = useQuery(api.restaurants.getOnboardingProgress, { restaurantId });

  if (!progress || progress.isComplete) return null;

  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress.percentComplete / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          className="text-muted"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className="text-primary transition-all duration-300"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
        {progress.percentComplete}%
      </span>
    </div>
  );
}
