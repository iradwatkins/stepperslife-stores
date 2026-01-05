"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Upload, X, Image as ImageIcon, Plus } from "lucide-react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";

interface ProductImageUploadProps {
  images: string[];
  primaryImage: string;
  onImagesChange: (images: string[], primaryImage: string) => void;
  maxImages?: number;
}

export function ProductImageUpload({
  images,
  primaryImage,
  onImagesChange,
  maxImages = 8,
}: ProductImageUploadProps) {
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

    if (images.length >= maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
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
        const newImages = [...images, imageUrl];
        const newPrimary = primaryImage || imageUrl;
        onImagesChange(newImages, newPrimary);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      setCompressionProgress(0);
    }
  }, [generateUploadUrl, getImageUrl, images, primaryImage, onImagesChange, maxImages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Process multiple files
    for (let i = 0; i < files.length; i++) {
      if (images.length + i >= maxImages) break;
      await processFile(files[i]);
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

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (images.length + i >= maxImages) break;
        await processFile(files[i]);
      }
    }
  }, [processFile, images.length, maxImages]);

  const removeImage = (url: string) => {
    const newImages = images.filter((img) => img !== url);
    const newPrimary = primaryImage === url ? (newImages[0] || "") : primaryImage;
    onImagesChange(newImages, newPrimary);
  };

  const setPrimary = (url: string) => {
    onImagesChange(images, url);
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        id="product-image-upload"
      />

      {/* Drag and drop zone */}
      <label
        htmlFor="product-image-upload"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer ${
          isDragging
            ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20 scale-[1.02]"
            : "border-border bg-muted/50 hover:bg-muted hover:border-sky-400"
        } ${images.length >= maxImages ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex flex-col items-center justify-center py-4">
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
              {compressionProgress > 0 && compressionProgress < 100 ? (
                <>
                  <p className="text-sm text-muted-foreground mb-2">Optimizing image...</p>
                  <div className="w-40 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${compressionProgress}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Uploading...</p>
              )}
            </>
          ) : isDragging ? (
            <>
              <Upload className="w-10 h-10 mb-3 text-primary animate-bounce" />
              <p className="text-sm font-medium text-primary">Drop images here</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Plus className="w-8 h-8 text-primary" />
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Drag & drop or click to upload images
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, GIF up to 10MB (auto-optimized)
              </p>
              <p className="text-xs text-muted-foreground">
                {images.length}/{maxImages} images uploaded
              </p>
            </>
          )}
        </div>
      </label>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img} className="relative group aspect-square">
              <Image
                src={img}
                alt="Product"
                fill
                className={`object-cover rounded-lg border-2 ${
                  primaryImage === img
                    ? "border-primary ring-2 ring-sky-300"
                    : "border-border"
                }`}
              />
              <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                {primaryImage !== img && (
                  <button
                    type="button"
                    onClick={() => setPrimary(img)}
                    className="px-2 py-1 bg-card/90 rounded text-xs font-medium hover:bg-card transition-colors"
                  >
                    Set Primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img)}
                  className="p-1.5 bg-destructive/100 text-destructive-foreground rounded hover:bg-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {primaryImage === img && (
                <span className="absolute top-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
