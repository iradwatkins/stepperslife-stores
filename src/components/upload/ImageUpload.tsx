"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { Id } from "@/convex/_generated/dataModel";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";

interface ImageUploadProps {
  onImageUploaded: (storageId: Id<"_storage">) => void;
  onImageRemoved?: () => void;
  currentImageId?: Id<"_storage">;
  currentImageUrl?: string;
  required?: boolean;
}

export function ImageUpload({
  onImageUploaded,
  onImageRemoved,
  currentImageId,
  currentImageUrl,
  required = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch URL from storage ID if we have an ID but no URL
  const fetchedImageUrl = useQuery(
    api.files.queries.getImageUrl,
    currentImageId ? { storageId: currentImageId } : "skip"
  );

  // Update preview when fetched URL becomes available
  useEffect(() => {
    if (fetchedImageUrl && !previewUrl) {
      setPreviewUrl(fetchedImageUrl);
    }
  }, [fetchedImageUrl, previewUrl]);

  // Also update if currentImageUrl prop changes
  useEffect(() => {
    if (currentImageUrl) {
      setPreviewUrl(currentImageUrl);
    }
  }, [currentImageUrl]);

  const generateUploadUrl = useMutation(api.files.mutations.generateUploadUrl);

  // Handle file upload (shared between click and drag/drop)
  const processFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate original file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setIsUploading(true);
    setCompressionProgress(0);

    try {
      // Compress image
      const compressionOptions = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type,
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

      // Create preview from compressed file
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);

      // Notify parent
      onImageUploaded(storageId);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      setCompressionProgress(0);
    }
  }, [generateUploadUrl, onImageUploaded]);

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

  const handleRemove = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onImageRemoved?.();
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        id="image-upload"
      />

      {previewUrl ? (
        <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden border-2 border-border">
          <Image src={previewUrl} alt="Event preview" fill className="object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor="image-upload"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.02]"
              : required
                ? "border-destructive bg-muted hover:bg-muted/80 hover:border-primary"
                : "border-border bg-muted hover:bg-muted/80 hover:border-primary"
          }`}
        >
          <div className="flex flex-col items-center justify-center py-8">
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                {compressionProgress > 0 && compressionProgress < 100 ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-2">Optimizing image...</p>
                    <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${compressionProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{compressionProgress}%</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                )}
              </>
            ) : isDragging ? (
              <>
                <Upload className="w-12 h-12 mb-4 text-primary animate-bounce" />
                <p className="text-sm font-medium text-primary">Drop image here</p>
              </>
            ) : (
              <>
                <ImageIcon className={`w-12 h-12 mb-4 ${required ? "text-destructive" : "text-muted-foreground"}`} />
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="w-5 h-5 text-primary" />
                  <p className="text-sm font-medium text-foreground">
                    Drag & drop or click to upload{required && " *"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB (auto-optimized)</p>
                {required && (
                  <p className="text-xs text-destructive mt-2 font-medium">Required</p>
                )}
              </>
            )}
          </div>
        </label>
      )}
    </div>
  );
}
