"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AdminFlyerUpload } from "./AdminFlyerUpload";

interface AdminFlyerUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: "EVENT" | "CLASS";
  onSuccess?: (eventId: string) => void;
}

/**
 * AdminFlyerUploadModal
 *
 * Modal wrapper for AdminFlyerUpload component.
 * Use this to open the flyer upload dialog from admin pages.
 *
 * @example
 * const [uploadOpen, setUploadOpen] = useState(false);
 *
 * <Button onClick={() => setUploadOpen(true)}>Upload Flyer</Button>
 * <AdminFlyerUploadModal
 *   open={uploadOpen}
 *   onOpenChange={setUploadOpen}
 *   defaultType="EVENT"
 *   onSuccess={(eventId) => {
 *     console.log("Event created:", eventId);
 *     setUploadOpen(false);
 *   }}
 * />
 */
export function AdminFlyerUploadModal({
  open,
  onOpenChange,
  defaultType = "EVENT",
  onSuccess,
}: AdminFlyerUploadModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Upload {defaultType === "CLASS" ? "Class" : "Event"} Flyer
          </DialogTitle>
          <DialogDescription>
            Upload a flyer image and our AI will extract the event details automatically.
            You can review and edit the information before creating the{" "}
            {defaultType === "CLASS" ? "class" : "event"}.
          </DialogDescription>
        </DialogHeader>
        <AdminFlyerUpload
          defaultType={defaultType}
          onSuccess={(eventId) => {
            onSuccess?.(eventId);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default AdminFlyerUploadModal;
