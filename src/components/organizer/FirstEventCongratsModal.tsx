"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, Ticket } from "lucide-react";

interface FirstEventCongratsModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditsRemaining: number;
}

export function FirstEventCongratsModal({
  isOpen,
  onClose,
  creditsRemaining,
}: FirstEventCongratsModalProps) {
  const valueInDollars = (creditsRemaining * 0.3).toFixed(2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Gift className="h-16 w-16 text-primary" />
              <Sparkles className="h-6 w-6 text-warning absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">🎉 Congratulations!</DialogTitle>
          <DialogDescription className="text-center space-y-4 pt-4">
            <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 p-6 rounded-lg border-2 border-primary/20">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Ticket className="h-8 w-8 text-primary" />
                <span className="text-4xl font-bold text-foreground">
                  {creditsRemaining.toLocaleString()}
                </span>
              </div>
              <p className="text-lg font-semibold text-foreground">FREE Tickets!</p>
              <p className="text-sm text-muted-foreground mt-1">(Worth ${valueInDollars})</p>
            </div>

            <div className="text-left space-y-3 text-sm">
              <p className="font-medium text-foreground">Welcome to SteppersLife Events! 🎊</p>

              <div className="bg-info/10 dark:bg-primary/20 p-4 rounded-lg border border-info/30 dark:border-primary/40">
                <p className="font-semibold text-foreground mb-2">✨ How it works:</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Create ticket tiers for your first event</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>
                      Use up to <strong className="text-foreground">1,000 FREE tickets</strong>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Start selling immediately!</span>
                  </li>
                </ul>
              </div>

              <div className="bg-warning/10 p-4 rounded-lg border border-warning">
                <p className="font-semibold text-warning mb-1">
                  ⚠️ Important:
                </p>
                <p className="text-warning text-xs">
                  These free tickets are <strong>for your first event only</strong>. Any unused
                  tickets will expire when this event ends. For additional events, tickets are just
                  $0.30 each.
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center mt-4">
          <Button onClick={onClose} size="lg" className="w-full sm:w-auto">
            <Ticket className="mr-2 h-4 w-4" />
            Create My Tickets
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
