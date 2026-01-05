"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface WelcomePopupProps {
  open: boolean;
  onClose: () => void;
  creditsRemaining: number;
}

export function WelcomePopup({ open, onClose, creditsRemaining }: WelcomePopupProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 text-primary-foreground text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Welcome to SteppersLife!</h2>
          <div className="text-5xl md:text-6xl mb-3">🎉</div>
          <p className="text-lg md:text-xl">
            You've received <span className="font-bold">{creditsRemaining.toLocaleString()} FREE</span> tickets to get started!
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* What you can do */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Here's what you can do:</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-success" />
                </div>
                <span className="text-foreground">Create your first event</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-success" />
                </div>
                <span className="text-foreground">Use {creditsRemaining.toLocaleString()} free tickets - no charges!</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-success" />
                </div>
                <span className="text-foreground">After free tickets: <strong>$0.30 per ticket</strong></span>
              </li>
            </ul>
          </div>

          {/* CTA Button */}
          <Button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg"
          >
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
