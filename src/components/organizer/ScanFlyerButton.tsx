"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Scan, Loader2, Upload, Sparkles } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import imageCompression from "browser-image-compression";

interface ExtractedEventData {
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
  eventType: "FREE_EVENT" | "TICKETED_EVENT" | "SAVE_THE_DATE";
  imageStorageId?: Id<"_storage">;
}

interface ScanFlyerButtonProps {
  onDataExtracted: (data: ExtractedEventData) => void;
  onError?: (error: string) => void;
}

export function ScanFlyerButton({ onDataExtracted, onError }: ScanFlyerButtonProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.files.mutations.generateUploadUrl);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const processFlyer = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      onError?.("Please select an image file (JPG, PNG, etc.)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError?.("Image must be less than 10MB");
      return;
    }

    setIsScanning(true);
    setScanProgress("Compressing image...");

    try {
      // Compress image for faster upload
      const compressionOptions = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type,
        initialQuality: 0.85,
      };

      const compressedFile = await imageCompression(file, compressionOptions);

      setScanProgress("Uploading flyer...");

      // Generate upload URL and upload to Convex storage
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      });

      const { storageId } = await uploadResult.json();

      setScanProgress("Scanning with AI...");

      // Call the OCR API
      const extractResponse = await fetch("/api/ai/extract-flyer-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageId: storageId,
          filepath: `/api/storage/${storageId}`
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

      setScanProgress("Processing results...");

      // Map extracted data to form fields
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

      onDataExtracted(formData);
      setScanProgress("");
    } catch (error: any) {
      console.error("[ScanFlyer] Error:", error);
      onError?.(error.message || "Failed to scan flyer. Please try again.");
    } finally {
      setIsScanning(false);
      setScanProgress("");
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [generateUploadUrl, onDataExtracted, onError]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFlyer(file);
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={isScanning}
        className={`
          w-full flex items-center justify-center gap-3 px-6 py-4
          border-2 border-dashed rounded-xl
          transition-all duration-200
          ${isScanning
            ? "border-primary/50 bg-primary/5 cursor-wait"
            : "border-primary/30 hover:border-primary hover:bg-primary/5 cursor-pointer"
          }
        `}
      >
        {isScanning ? (
          <>
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <div className="text-left">
              <p className="font-medium text-foreground">Scanning Flyer...</p>
              <p className="text-sm text-muted-foreground">{scanProgress}</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">Scan Event Flyer</p>
              <p className="text-sm text-muted-foreground">
                Upload a flyer image and AI will auto-fill the form
              </p>
            </div>
          </>
        )}
      </button>
    </div>
  );
}
