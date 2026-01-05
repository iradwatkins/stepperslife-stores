"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Sparkles, Loader2, ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import imageCompression from "browser-image-compression";
import { cn } from "@/lib/utils";

export interface ExtractedEventData {
  eventName: string;
  description: string;
  eventDate: string;
  eventEndDate?: string | null;
  eventTime: string;
  eventEndTime?: string | null;
  venueName: string;
  address?: string | null;
  city: string;
  state: string;
  zipCode?: string | null;
  categories: string[];
  eventType: "FREE_EVENT" | "TICKETED_EVENT" | "SAVE_THE_DATE" | "SEATED_EVENT";
  imageStorageId?: Id<"_storage">;
}

type UploadPhase = "idle" | "compressing" | "uploading" | "extracting" | "success" | "error";

interface FlyerUploadHeroProps {
  onDataExtracted: (data: ExtractedEventData) => void;
  onSkip: () => void;
  onError?: (error: string) => void;
}

const phaseMessages: Record<UploadPhase, string> = {
  idle: "",
  compressing: "Optimizing image...",
  uploading: "Uploading flyer...",
  extracting: "AI is reading your flyer...",
  success: "Event details extracted!",
  error: "Something went wrong",
};

export function FlyerUploadHero({ onDataExtracted, onSkip, onError }: FlyerUploadHeroProps) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const generateUploadUrl = useMutation(api.files.mutations.generateUploadUrl);

  const processFlyer = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setPhase("error");
      setErrorMessage("Please select an image file (JPG, PNG, etc.)");
      onError?.("Please select an image file (JPG, PNG, etc.)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setPhase("error");
      setErrorMessage("Image must be less than 10MB");
      onError?.("Image must be less than 10MB");
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    try {
      // Phase 1: Compress
      setPhase("compressing");
      const compressionOptions = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type,
        initialQuality: 0.85,
      };
      const compressedFile = await imageCompression(file, compressionOptions);

      // Phase 2: Upload
      setPhase("uploading");
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload image");
      }

      const { storageId } = await uploadResult.json();

      // Phase 3: Extract with AI
      setPhase("extracting");
      const extractResponse = await fetch("/api/ai/extract-flyer-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageId: storageId,
          filepath: `/api/storage/${storageId}`,
        }),
      });

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        throw new Error(errorData.message || "Failed to scan flyer");
      }

      const result = await extractResponse.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to extract data from flyer");
      }

      // Success!
      setPhase("success");

      // Map extracted data
      const extractedData = result.extractedData || result.data;
      const formData: ExtractedEventData = {
        eventName: extractedData.eventName || "",
        description: extractedData.description || "",
        eventDate: extractedData.eventDate || "",
        eventEndDate: extractedData.eventEndDate,
        eventTime: extractedData.eventTime || "",
        eventEndTime: extractedData.eventEndTime,
        venueName: extractedData.venueName || "",
        address: extractedData.address,
        city: extractedData.city || "",
        state: extractedData.state || "",
        zipCode: extractedData.zipCode,
        categories: extractedData.categories || [],
        eventType: extractedData.eventType || "TICKETED_EVENT",
        imageStorageId: storageId,
      };

      // Small delay to show success state
      setTimeout(() => {
        onDataExtracted(formData);
      }, 800);
    } catch (error: any) {
      console.error("[FlyerUploadHero] Error:", error);
      setPhase("error");
      setErrorMessage(error.message || "Failed to scan flyer. Please try again.");
      onError?.(error.message || "Failed to scan flyer. Please try again.");
    }
  }, [generateUploadUrl, onDataExtracted, onError]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setPhase("idle");
      setErrorMessage("");
      processFlyer(file);
    }
  }, [processFlyer]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
    },
    maxFiles: 1,
    disabled: phase !== "idle" && phase !== "error",
  });

  const handleRetry = () => {
    setPhase("idle");
    setErrorMessage("");
    setPreviewUrl(null);
  };

  const isProcessing = phase !== "idle" && phase !== "error";

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">Create Your Event</h1>
        <p className="text-muted-foreground text-lg">
          Upload your event flyer and AI will fill in the details
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div
          {...getRootProps()}
          className={cn(
            "relative border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden",
            "min-h-[320px] flex flex-col items-center justify-center",
            isDragActive
              ? "border-primary bg-primary/10 scale-[1.02]"
              : phase === "error"
                ? "border-destructive/50 bg-destructive/5"
                : phase === "success"
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50",
            isProcessing && "pointer-events-none"
          )}
        >
          <input {...getInputProps()} />

          {/* Background Preview */}
          <AnimatePresence>
            {previewUrl && phase !== "idle" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${previewUrl})` }}
              />
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="relative z-10 p-8 flex flex-col items-center">
            <AnimatePresence mode="wait">
              {phase === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center text-center"
                >
                  <motion.div
                    animate={isDragActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className={cn(
                      "w-20 h-20 rounded-2xl flex items-center justify-center mb-6",
                      isDragActive ? "bg-primary text-primary-foreground" : "bg-primary/10"
                    )}
                  >
                    {isDragActive ? (
                      <Upload className="w-10 h-10" />
                    ) : (
                      <Sparkles className="w-10 h-10 text-primary" />
                    )}
                  </motion.div>
                  <h2 className="text-xl font-semibold mb-2">
                    {isDragActive ? "Drop your flyer here" : "Upload Your Event Flyer"}
                  </h2>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    {isDragActive
                      ? "Release to start scanning"
                      : "Drag & drop your flyer image here, or click to browse"}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                    <span>JPG, PNG, GIF, WebP (max 10MB)</span>
                  </div>
                </motion.div>
              )}

              {(phase === "compressing" || phase === "uploading" || phase === "extracting") && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center text-center"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
                  >
                    <Loader2 className="w-10 h-10 text-primary" />
                  </motion.div>
                  <h2 className="text-xl font-semibold mb-2">{phaseMessages[phase]}</h2>
                  <div className="flex gap-2 mt-4">
                    {["compressing", "uploading", "extracting"].map((step, index) => {
                      const currentIndex = ["compressing", "uploading", "extracting"].indexOf(phase);
                      const isComplete = index < currentIndex;
                      const isCurrent = index === currentIndex;
                      return (
                        <motion.div
                          key={step}
                          className={cn(
                            "w-3 h-3 rounded-full",
                            isComplete
                              ? "bg-primary"
                              : isCurrent
                                ? "bg-primary animate-pulse"
                                : "bg-muted"
                          )}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {phase === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6"
                  >
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </motion.div>
                  <h2 className="text-xl font-semibold mb-2 text-green-600">
                    {phaseMessages.success}
                  </h2>
                  <p className="text-muted-foreground">Preparing your event details...</p>
                </motion.div>
              )}

              {phase === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2 text-destructive">
                    {phaseMessages.error}
                  </h2>
                  <p className="text-muted-foreground mb-4 max-w-sm">{errorMessage}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRetry();
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Try Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Skip Link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center mt-6"
      >
        <button
          onClick={onSkip}
          disabled={isProcessing}
          className={cn(
            "text-muted-foreground hover:text-foreground transition-colors",
            "text-sm underline-offset-4 hover:underline",
            isProcessing && "opacity-50 cursor-not-allowed"
          )}
        >
          I don&apos;t have a flyer yet — enter details manually
        </button>
      </motion.div>
    </div>
  );
}
