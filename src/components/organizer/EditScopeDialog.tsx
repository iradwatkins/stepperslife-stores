"use client";

import { Calendar, Link2 } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetBody,
} from "@/components/ui/bottom-sheet";
import { useEffect, useState } from "react";

export interface EditScopeDialogProps {
  open: boolean;
  onClose: () => void;
  onEditSingle: () => void;
  onEditSeries: () => void;
  eventTitle: string;
  eventDate: Date;
  seriesCount: number;
}

export function EditScopeDialog({
  open,
  onClose,
  onEditSingle,
  onEditSeries,
  eventTitle,
  eventDate,
  seriesCount,
}: EditScopeDialogProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on client side
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const DialogBody = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This class is part of a recurring series. What would you like to edit?
      </p>

      <div className="space-y-3">
        {/* Edit Single Class Option */}
        <button
          onClick={() => {
            onEditSingle();
            onClose();
          }}
          className="w-full flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground">
              Edit only this class
            </h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(eventDate, "EEEE, MMMM d, yyyy")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Changes will only apply to this specific date
            </p>
          </div>
        </button>

        {/* Edit Entire Series Option */}
        <button
          onClick={() => {
            onEditSeries();
            onClose();
          }}
          className="w-full flex items-start gap-4 p-4 border border-primary/30 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
            <Link2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground">
              Edit entire series
            </h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              {seriesCount} classes in this series
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Changes will apply to all classes in the series
            </p>
          </div>
        </button>
      </div>

      {/* Cancel Button */}
      <button
        onClick={onClose}
        className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Cancel
      </button>
    </div>
  );

  // Render mobile BottomSheet
  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <BottomSheetContent size="auto">
          <BottomSheetHeader>
            <BottomSheetTitle>Edit "{eventTitle}"</BottomSheetTitle>
          </BottomSheetHeader>
          <BottomSheetBody>
            <DialogBody />
          </BottomSheetBody>
        </BottomSheetContent>
      </BottomSheet>
    );
  }

  // Render desktop Dialog
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit "{eventTitle}"</DialogTitle>
          <DialogDescription className="sr-only">
            Choose whether to edit this single class or the entire series
          </DialogDescription>
        </DialogHeader>
        <DialogBody />
      </DialogContent>
    </Dialog>
  );
}
