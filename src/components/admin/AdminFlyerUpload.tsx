"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Check,
  AlertCircle,
  Calendar,
  MapPin,
  Clock,
  User,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

interface ExtractedData {
  eventName: string;
  description: string;
  eventDate: string;
  eventEndDate?: string | null;
  eventTime: string;
  eventEndTime?: string | null;
  eventTimezone?: string | null;
  venueName: string;
  address?: string | null;
  city: string;
  state: string;
  zipCode?: string | null;
  hostOrganizer?: string | null;
  containsSaveTheDateText: boolean;
  eventType: "FREE_EVENT" | "TICKETED_EVENT" | "SAVE_THE_DATE";
  categories: string[];
}

interface AdminFlyerUploadProps {
  /** "EVENT" for events, "CLASS" for classes */
  defaultType?: "EVENT" | "CLASS";
  /** Called when event/class is created successfully */
  onSuccess?: (id: Id<"events">) => void;
  /** Called when user cancels/closes */
  onCancel?: () => void;
}

type UploadStage = "idle" | "uploading" | "extracting" | "review" | "creating" | "success" | "error";

export function AdminFlyerUpload({ defaultType = "EVENT", onSuccess, onCancel }: AdminFlyerUploadProps) {
  const [stage, setStage] = useState<UploadStage>("idle");
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Upload state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [flyerId, setFlyerId] = useState<Id<"uploadedFlyers"> | null>(null);

  // Extracted data state
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convex mutations
  const adminLogFlyer = useMutation(api.admin.eventUploads.adminLogUploadedFlyer);
  const adminCreateEvent = useMutation(api.admin.eventUploads.adminCreateEventFromFlyer);
  const adminCreateClass = useMutation(api.admin.eventUploads.adminCreateClassFromFlyer);

  // Upload the flyer image
  const uploadFlyer = useCallback(async (file: File): Promise<{ url: string; flyerId: Id<"uploadedFlyers"> }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/upload-flyer", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload flyer");
    }

    const data = await response.json();

    // Log to Convex
    const { flyerId } = await adminLogFlyer({
      filename: file.name,
      fileHash: data.hash,
      filepath: data.url,
      originalSize: data.originalSize,
      optimizedSize: data.optimizedSize,
      eventType: defaultType,
    });

    return { url: data.url, flyerId };
  }, [adminLogFlyer, defaultType]);

  // Extract data using AI
  const extractFlyerData = useCallback(async (filepath: string): Promise<ExtractedData> => {
    const response = await fetch("/api/ai/extract-flyer-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filepath }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || "Failed to extract flyer data");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Extraction failed");
    }

    return data.extractedData;
  }, []);

  // Process the uploaded file
  const processFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setErrorMessage(null);

    try {
      // Stage 1: Upload
      setStage("uploading");
      setProgress(20);

      const { url, flyerId: newFlyerId } = await uploadFlyer(file);
      setImageUrl(url);
      setFlyerId(newFlyerId);
      setProgress(50);

      // Stage 2: AI Extraction
      setStage("extracting");
      setProgress(60);

      const extracted = await extractFlyerData(url);
      setExtractedData(extracted);
      setEditedData(extracted);
      setProgress(100);

      // Stage 3: Review
      setStage("review");
      toast.success("Flyer analyzed successfully!");

    } catch (error) {
      console.error("Process error:", error);
      setStage("error");
      setErrorMessage(error instanceof Error ? error.message : "An error occurred");
      toast.error(error instanceof Error ? error.message : "Failed to process flyer");
    }
  }, [uploadFlyer, extractFlyerData]);

  // Create the event or class
  const handleCreate = useCallback(async () => {
    if (!flyerId || !editedData) return;

    setStage("creating");

    try {
      let result;

      if (defaultType === "CLASS") {
        result = await adminCreateClass({
          flyerId,
          classData: {
            name: editedData.eventName,
            description: editedData.description,
            classLevel: "All Levels", // Default, can be edited later
            eventDateLiteral: editedData.eventDate,
            eventTimeLiteral: editedData.eventTime,
            timezone: editedData.eventTimezone || "America/Chicago",
            location: editedData.city && editedData.state ? {
              venueName: editedData.venueName,
              address: editedData.address || undefined,
              city: editedData.city,
              state: editedData.state,
              zipCode: editedData.zipCode || undefined,
              country: "USA",
            } : undefined,
            instructorName: editedData.hostOrganizer || undefined,
            isClaimable: true,
          },
        });

        toast.success("Class created successfully!");
        onSuccess?.(result.classId);

      } else {
        result = await adminCreateEvent({
          flyerId,
          eventData: {
            name: editedData.eventName,
            description: editedData.description,
            eventType: editedData.eventType === "SAVE_THE_DATE"
              ? "SAVE_THE_DATE"
              : editedData.eventType === "TICKETED_EVENT"
                ? "TICKETED_EVENT"
                : "FREE_EVENT",
            eventDateLiteral: editedData.eventDate,
            eventTimeLiteral: editedData.eventTime,
            timezone: editedData.eventTimezone || "America/Chicago",
            location: editedData.city && editedData.state ? {
              venueName: editedData.venueName,
              address: editedData.address || undefined,
              city: editedData.city,
              state: editedData.state,
              zipCode: editedData.zipCode || undefined,
              country: "USA",
            } : undefined,
            categories: editedData.categories,
            organizerName: editedData.hostOrganizer || undefined,
            isClaimable: true,
          },
        });

        toast.success("Event created successfully!");
        onSuccess?.(result.eventId);
      }

      setStage("success");

    } catch (error) {
      console.error("Create error:", error);
      setStage("review"); // Go back to review on error
      toast.error(error instanceof Error ? error.message : "Failed to create");
    }
  }, [flyerId, editedData, defaultType, adminCreateEvent, adminCreateClass, onSuccess]);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }, [processFile]);

  // Reset to start over
  const handleReset = () => {
    setStage("idle");
    setProgress(0);
    setImageUrl(null);
    setFlyerId(null);
    setExtractedData(null);
    setEditedData(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Update edited field
  const updateField = (field: keyof ExtractedData, value: string) => {
    if (!editedData) return;
    setEditedData({ ...editedData, [field]: value });
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        id="admin-flyer-upload"
      />

      {/* Upload Stage: Idle */}
      {stage === "idle" && (
        <label
          htmlFor="admin-flyer-upload"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.02]"
              : "border-border bg-muted hover:bg-muted/80 hover:border-primary"
          }`}
        >
          <div className="flex flex-col items-center justify-center py-8">
            {isDragging ? (
              <>
                <Upload className="w-12 h-12 mb-4 text-primary animate-bounce" />
                <p className="text-sm font-medium text-primary">Drop flyer here</p>
              </>
            ) : (
              <>
                {defaultType === "CLASS" ? (
                  <GraduationCap className="w-12 h-12 mb-4 text-muted-foreground" />
                ) : (
                  <ImageIcon className="w-12 h-12 mb-4 text-muted-foreground" />
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="w-5 h-5 text-primary" />
                  <p className="text-sm font-medium text-foreground">
                    Upload {defaultType === "CLASS" ? "Class" : "Event"} Flyer
                  </p>
                </div>
                <p className="text-xs text-muted-foreground text-center px-4">
                  Drag & drop or click to upload. AI will extract event details.
                </p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
              </>
            )}
          </div>
        </label>
      )}

      {/* Upload Stage: Uploading or Extracting */}
      {(stage === "uploading" || stage === "extracting") && (
        <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-border rounded-lg bg-muted">
          <Loader2 className="w-12 h-12 mb-4 text-primary animate-spin" />
          <p className="text-sm font-medium text-foreground mb-2">
            {stage === "uploading" ? "Uploading flyer..." : "Extracting event details with AI..."}
          </p>
          <div className="w-48 h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            <span>Powered by Gemini AI</span>
          </div>
        </div>
      )}

      {/* Upload Stage: Error */}
      {stage === "error" && (
        <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-destructive rounded-lg bg-destructive/10">
          <AlertCircle className="w-12 h-12 mb-4 text-destructive" />
          <p className="text-sm font-medium text-destructive mb-2">Failed to process flyer</p>
          <p className="text-xs text-muted-foreground mb-4 px-8 text-center">{errorMessage}</p>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Upload Stage: Review */}
      {stage === "review" && editedData && imageUrl && (
        <div className="space-y-4">
          {/* Preview Image */}
          <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
            <Image src={imageUrl} alt="Flyer preview" fill className="object-contain" />
            <button
              onClick={handleReset}
              className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Extracted Data Form */}
          <div className="bg-card rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Extracted Data - Review & Edit
            </div>

            {/* Event Name */}
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {defaultType === "CLASS" ? "Class Name" : "Event Name"}
              </label>
              <input
                type="text"
                value={editedData.eventName}
                onChange={(e) => updateField("eventName", e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-border rounded-lg focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Date
                </label>
                <input
                  type="text"
                  value={editedData.eventDate}
                  onChange={(e) => updateField("eventDate", e.target.value)}
                  className="w-full px-3 py-2 mt-1 border border-border rounded-lg focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Time
                </label>
                <input
                  type="text"
                  value={editedData.eventTime || ""}
                  onChange={(e) => updateField("eventTime", e.target.value)}
                  className="w-full px-3 py-2 mt-1 border border-border rounded-lg focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
            </div>

            {/* Venue */}
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Venue
              </label>
              <input
                type="text"
                value={editedData.venueName || ""}
                onChange={(e) => updateField("venueName", e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-border rounded-lg focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            {/* City & State */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">City</label>
                <input
                  type="text"
                  value={editedData.city || ""}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="w-full px-3 py-2 mt-1 border border-border rounded-lg focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">State</label>
                <input
                  type="text"
                  value={editedData.state || ""}
                  onChange={(e) => updateField("state", e.target.value)}
                  className="w-full px-3 py-2 mt-1 border border-border rounded-lg focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
            </div>

            {/* Organizer */}
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                {defaultType === "CLASS" ? "Instructor" : "Organizer"}
              </label>
              <input
                type="text"
                value={editedData.hostOrganizer || ""}
                onChange={(e) => updateField("hostOrganizer", e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-border rounded-lg focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            {/* Event Type Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Type:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                editedData.eventType === "SAVE_THE_DATE"
                  ? "bg-warning/10 text-warning"
                  : editedData.eventType === "TICKETED_EVENT"
                    ? "bg-primary/10 text-primary"
                    : "bg-success/10 text-success"
              }`}>
                {editedData.eventType.replace(/_/g, " ")}
              </span>
              {editedData.containsSaveTheDateText && (
                <span className="px-2 py-1 bg-accent text-accent-foreground rounded text-xs">
                  Save the Date
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Create {defaultType === "CLASS" ? "Class" : "Event"}
            </button>
          </div>
        </div>
      )}

      {/* Upload Stage: Creating */}
      {stage === "creating" && (
        <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-border rounded-lg bg-muted">
          <Loader2 className="w-12 h-12 mb-4 text-primary animate-spin" />
          <p className="text-sm font-medium text-foreground">
            Creating {defaultType === "CLASS" ? "class" : "event"}...
          </p>
        </div>
      )}

      {/* Upload Stage: Success */}
      {stage === "success" && (
        <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-success rounded-lg bg-success/10">
          <Check className="w-12 h-12 mb-4 text-success" />
          <p className="text-sm font-medium text-success mb-2">
            {defaultType === "CLASS" ? "Class" : "Event"} Created Successfully!
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Marked as "Uploaded by SteppersLife"
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent"
            >
              Upload Another
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
