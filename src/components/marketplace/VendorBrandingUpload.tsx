"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";

interface VendorBrandingUploadProps {
  label: string;
  description?: string;
  currentImage: string | null;
  onImageChange: (imageUrl: string | null) => void;
  aspectRatio?: "square" | "banner";
}

export function VendorBrandingUpload({
  label,
  description,
  currentImage,
  onImageChange,
  aspectRatio = "square",
}: VendorBrandingUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.files.mutations.generateUploadUrl);
  const getImageUrl = useMutation(api.upload.getImageUrl);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setIsUploading(true);
    setCompressionProgress(0);

    try {
      // Compress image
      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: aspectRatio === "banner" ? 1920 : 800,
        useWebWorker: true,
        fileType: file.type as string,
        initialQuality: 0.85,
        onProgress: (progress: number) => {
          setCompressionProgress(progress);
        },
      };

      const compressedFile = await imageCompression(file, compressionOptions);

      // Generate upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload the compressed file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      });

      const { storageId } = await result.json();

      // Get the public URL for the uploaded image
      const imageUrl = await getImageUrl({ storageId });

      if (imageUrl) {
        onImageChange(imageUrl);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      setCompressionProgress(0);
    }
  }, [generateUploadUrl, getImageUrl, onImageChange, aspectRatio]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  }, [processFile]);

  const removeImage = () => {
    onImageChange(null);
  };

  const containerHeight = aspectRatio === "banner" ? "h-32" : "h-40";
  const imageContainerClass = aspectRatio === "banner"
    ? "relative w-full h-32 rounded-lg overflow-hidden"
    : "relative w-40 h-40 rounded-lg overflow-hidden";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        id={`vendor-branding-upload-${label.toLowerCase().replace(/\s/g, "-")}`}
      />

      {currentImage ? (
        <div className={`${imageContainerClass} group border-2 border-border`}>
          <Image
            src={currentImage}
            alt={label}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <label
              htmlFor={`vendor-branding-upload-${label.toLowerCase().replace(/\s/g, "-")}`}
              className="px-3 py-1.5 bg-card/90 rounded text-sm font-medium hover:bg-card transition-colors cursor-pointer"
            >
              Replace
            </label>
            <button
              type="button"
              onClick={removeImage}
              className="p-2 bg-destructive/100 text-destructive-foreground rounded hover:bg-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={`vendor-branding-upload-${label.toLowerCase().replace(/\s/g, "-")}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full ${containerHeight} border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer ${
            isDragging
              ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20 scale-[1.02]"
              : "border-border bg-muted/50 hover:bg-muted hover:border-sky-400"
          }`}
        >
          <div className="flex flex-col items-center justify-center py-4">
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                {compressionProgress > 0 && compressionProgress < 100 ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-1">Optimizing...</p>
                    <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${compressionProgress}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Uploading...</p>
                )}
              </>
            ) : isDragging ? (
              <>
                <Upload className="w-8 h-8 mb-2 text-primary animate-bounce" />
                <p className="text-xs font-medium text-primary">Drop image here</p>
              </>
            ) : (
              <>
                <ImageIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">
                  Click or drag to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG up to 10MB
                </p>
              </>
            )}
          </div>
        </label>
      )}
    </div>
  );
}
