"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Info, Loader2 } from "lucide-react";
import { useState } from "react";

type ConfirmDialogVariant = "default" | "destructive" | "warning";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void | Promise<void>;
  /** If true, shows a loading spinner during async onConfirm */
  showLoadingState?: boolean;
}

const variantStyles: Record<ConfirmDialogVariant, {
  icon: React.ReactNode;
  buttonVariant: "default" | "destructive" | "outline";
}> = {
  default: {
    icon: <Info className="h-5 w-5 text-primary" />,
    buttonVariant: "default",
  },
  destructive: {
    icon: <Trash2 className="h-5 w-5 text-destructive" />,
    buttonVariant: "destructive",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-warning" />,
    buttonVariant: "default",
  },
};

/**
 * A reusable confirmation dialog that replaces native confirm() calls.
 * Provides a modern, accessible, and consistent UI for confirmation prompts.
 *
 * @example
 * // Basic usage
 * const [showConfirm, setShowConfirm] = useState(false);
 *
 * <ConfirmDialog
 *   open={showConfirm}
 *   onOpenChange={setShowConfirm}
 *   title="Delete Item"
 *   description="Are you sure you want to delete this item? This action cannot be undone."
 *   variant="destructive"
 *   onConfirm={() => deleteItem()}
 * />
 *
 * @example
 * // With async handler and loading state
 * <ConfirmDialog
 *   open={showConfirm}
 *   onOpenChange={setShowConfirm}
 *   title="Submit Changes"
 *   description="This will save all your changes."
 *   showLoadingState
 *   onConfirm={async () => {
 *     await saveChanges();
 *   }}
 * />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  showLoadingState = true,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { icon, buttonVariant } = variantStyles[variant];

  const handleConfirm = async () => {
    if (showLoadingState) {
      setIsLoading(true);
    }
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("ConfirmDialog: onConfirm threw an error:", error);
      // Keep dialog open on error so user can retry
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              {icon}
            </div>
            <div className="flex-1 space-y-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Helper hook to manage confirmation dialog state.
 * Makes it easy to use ConfirmDialog in components.
 *
 * @example
 * const { showConfirm, confirmDialog, props } = useConfirmDialog();
 *
 * // Trigger the dialog
 * <Button onClick={() => showConfirm({
 *   title: "Delete?",
 *   description: "This cannot be undone.",
 *   onConfirm: () => deleteItem(),
 * })}>
 *   Delete
 * </Button>
 *
 * // Render the dialog
 * <ConfirmDialog {...props} />
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmDialogVariant;
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const showConfirm = (options: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmDialogVariant;
    onConfirm: () => void | Promise<void>;
  }) => {
    setDialogState({
      ...options,
      open: true,
    });
  };

  const props = {
    ...dialogState,
    onOpenChange: (open: boolean) => setDialogState((s) => ({ ...s, open })),
  };

  return { showConfirm, props };
}
