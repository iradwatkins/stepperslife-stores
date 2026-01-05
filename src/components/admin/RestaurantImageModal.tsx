"use client";

import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RestaurantImageManager } from "./RestaurantImageManager";

interface RestaurantImageModalProps {
  restaurantId: Id<"restaurants"> | null;
  restaurantName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * RestaurantImageModal
 *
 * Modal wrapper for RestaurantImageManager.
 * Use this to open the image manager in a dialog from admin pages.
 *
 * @example
 * const [selectedRestaurant, setSelectedRestaurant] = useState<Id<"restaurants"> | null>(null);
 *
 * <RestaurantImageModal
 *   restaurantId={selectedRestaurant}
 *   open={!!selectedRestaurant}
 *   onOpenChange={(open) => !open && setSelectedRestaurant(null)}
 * />
 */
export function RestaurantImageModal({
  restaurantId,
  restaurantName,
  open,
  onOpenChange,
}: RestaurantImageModalProps) {
  if (!restaurantId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Manage Images{restaurantName ? `: ${restaurantName}` : ""}
          </DialogTitle>
        </DialogHeader>
        <RestaurantImageManager
          restaurantId={restaurantId}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default RestaurantImageModal;
