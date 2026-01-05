"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Upload,
  X,
  Image as ImageIcon,
  GripVertical,
  Pencil,
  Trash2,
  ImagePlus,
  Store,
  Camera,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FoodPhoto {
  storageId: Id<"_storage">;
  url: string;
  caption?: string;
  uploadedAt: number;
  uploadedBy?: Id<"users">;
  isAdminUploaded?: boolean;
}

interface RestaurantImageManagerProps {
  restaurantId: Id<"restaurants">;
  onClose?: () => void;
}

/**
 * RestaurantImageManager
 *
 * Full image management interface for restaurant images.
 * Allows admin to upload/manage:
 * - Logo (single image)
 * - Cover image (single image)
 * - Food photos gallery (up to 10 images)
 *
 * Features:
 * - Drag-and-drop upload
 * - Image compression
 * - Caption editing
 * - Drag-to-reorder gallery
 * - Remove images
 */
export function RestaurantImageManager({
  restaurantId,
  onClose,
}: RestaurantImageManagerProps) {
  const [activeTab, setActiveTab] = useState<"logo" | "cover" | "gallery">("logo");
  const [isUploading, setIsUploading] = useState(false);
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<FoodPhoto | null>(null);
  const [captionValue, setCaptionValue] = useState("");

  // Queries
  const restaurantImages = useQuery(api.admin.restaurantUploads.getRestaurantImages, {
    restaurantId,
  });

  // Mutations
  const generateUploadUrl = useMutation(api.files.mutations.generateUploadUrl);
  const uploadLogo = useMutation(api.admin.restaurantUploads.adminUploadRestaurantLogo);
  const uploadCover = useMutation(api.admin.restaurantUploads.adminUploadRestaurantCover);
  const addFoodPhoto = useMutation(api.admin.restaurantUploads.adminAddFoodPhoto);
  const removeFoodPhoto = useMutation(api.admin.restaurantUploads.adminRemoveFoodPhoto);
  const updateCaption = useMutation(api.admin.restaurantUploads.adminUpdateFoodPhotoCaption);
  const reorderPhotos = useMutation(api.admin.restaurantUploads.adminReorderFoodPhotos);

  // DnD sensors for gallery reordering
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // File processing with compression
  const processFile = useCallback(
    async (file: File): Promise<{ storageId: Id<"_storage">; url: string } | null> => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return null;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be less than 10MB");
        return null;
      }

      try {
        // Compress image
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: file.type,
          initialQuality: 0.85,
        });

        // Generate upload URL
        const uploadUrl = await generateUploadUrl();

        // Upload the compressed file
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": compressedFile.type },
          body: compressedFile,
        });

        const { storageId } = await result.json();

        // Get the URL from a data URL for preview
        const reader = new FileReader();
        const url = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(compressedFile);
        });

        return { storageId, url };
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload image");
        return null;
      }
    },
    [generateUploadUrl]
  );

  // Handle logo upload
  const handleLogoUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const result = await processFile(file);
        if (result) {
          await uploadLogo({
            restaurantId,
            logoUrl: result.url,
          });
          toast.success("Logo updated successfully");
        }
      } finally {
        setIsUploading(false);
      }
    },
    [processFile, uploadLogo, restaurantId]
  );

  // Handle cover upload
  const handleCoverUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const result = await processFile(file);
        if (result) {
          await uploadCover({
            restaurantId,
            coverImageUrl: result.url,
          });
          toast.success("Cover image updated successfully");
        }
      } finally {
        setIsUploading(false);
      }
    },
    [processFile, uploadCover, restaurantId]
  );

  // Handle food photo upload
  const handleFoodPhotoUpload = useCallback(
    async (file: File) => {
      const currentCount = restaurantImages?.foodPhotos?.length || 0;
      if (currentCount >= 10) {
        toast.error("Maximum of 10 food photos allowed");
        return;
      }

      setIsUploading(true);
      try {
        const result = await processFile(file);
        if (result) {
          await addFoodPhoto({
            restaurantId,
            storageId: result.storageId,
            url: result.url,
          });
          toast.success("Food photo added");
        }
      } finally {
        setIsUploading(false);
      }
    },
    [processFile, addFoodPhoto, restaurantId, restaurantImages]
  );

  // Handle food photo removal
  const handleRemovePhoto = useCallback(
    async (storageId: Id<"_storage">) => {
      try {
        await removeFoodPhoto({
          restaurantId,
          storageId,
        });
        toast.success("Photo removed");
      } catch (error) {
        toast.error("Failed to remove photo");
      }
    },
    [removeFoodPhoto, restaurantId]
  );

  // Handle caption update
  const handleUpdateCaption = useCallback(async () => {
    if (!selectedPhoto) return;

    try {
      await updateCaption({
        restaurantId,
        storageId: selectedPhoto.storageId,
        caption: captionValue,
      });
      toast.success("Caption updated");
      setCaptionDialogOpen(false);
      setSelectedPhoto(null);
      setCaptionValue("");
    } catch (error) {
      toast.error("Failed to update caption");
    }
  }, [updateCaption, restaurantId, selectedPhoto, captionValue]);

  // Handle drag end for reordering
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const photos = restaurantImages?.foodPhotos || [];
        const oldIndex = photos.findIndex((p) => p.storageId === active.id);
        const newIndex = photos.findIndex((p) => p.storageId === over.id);

        const newOrder = arrayMove(photos, oldIndex, newIndex);
        const photoOrder = newOrder.map((p) => p.storageId);

        try {
          await reorderPhotos({
            restaurantId,
            photoOrder,
          });
          toast.success("Photo order updated");
        } catch (error) {
          toast.error("Failed to reorder photos");
        }
      }
    },
    [reorderPhotos, restaurantId, restaurantImages]
  );

  // Open caption dialog
  const openCaptionDialog = (photo: FoodPhoto) => {
    setSelectedPhoto(photo);
    setCaptionValue(photo.caption || "");
    setCaptionDialogOpen(true);
  };

  if (!restaurantImages) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{restaurantImages.name}</h2>
          <p className="text-sm text-muted-foreground">Manage restaurant images</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className={`flex items-center gap-2 p-3 rounded-lg border ${
            restaurantImages.logoUrl ? "bg-success/10 border-success" : "bg-muted border-border"
          }`}
        >
          {restaurantImages.logoUrl ? (
            <CheckCircle className="h-4 w-4 text-success" />
          ) : (
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">Logo</span>
        </div>
        <div
          className={`flex items-center gap-2 p-3 rounded-lg border ${
            restaurantImages.coverImageUrl ? "bg-success/10 border-success" : "bg-muted border-border"
          }`}
        >
          {restaurantImages.coverImageUrl ? (
            <CheckCircle className="h-4 w-4 text-success" />
          ) : (
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">Cover</span>
        </div>
        <div
          className={`flex items-center gap-2 p-3 rounded-lg border ${
            (restaurantImages.foodPhotos?.length || 0) > 0
              ? "bg-success/10 border-success"
              : "bg-muted border-border"
          }`}
        >
          {(restaurantImages.foodPhotos?.length || 0) > 0 ? (
            <CheckCircle className="h-4 w-4 text-success" />
          ) : (
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            Photos ({restaurantImages.foodPhotos?.length || 0}/10)
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(["logo", "cover", "gallery"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "logo" && <Store className="h-4 w-4 inline mr-2" />}
            {tab === "cover" && <ImageIcon className="h-4 w-4 inline mr-2" />}
            {tab === "gallery" && <Camera className="h-4 w-4 inline mr-2" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* Logo Tab */}
        {activeTab === "logo" && (
          <SingleImageUpload
            currentUrl={restaurantImages.logoUrl}
            onUpload={handleLogoUpload}
            isUploading={isUploading}
            label="Restaurant Logo"
            description="Square image, 500x500 recommended"
            aspectRatio="square"
          />
        )}

        {/* Cover Tab */}
        {activeTab === "cover" && (
          <SingleImageUpload
            currentUrl={restaurantImages.coverImageUrl}
            onUpload={handleCoverUpload}
            isUploading={isUploading}
            label="Cover Image"
            description="Wide image, 1200x600 recommended"
            aspectRatio="wide"
          />
        )}

        {/* Gallery Tab */}
        {activeTab === "gallery" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Drag to reorder. Click edit to add captions.
              </p>
              <span className="text-sm font-medium">
                {restaurantImages.foodPhotos?.length || 0} / 10 photos
              </span>
            </div>

            {/* Upload new photo */}
            {(restaurantImages.foodPhotos?.length || 0) < 10 && (
              <FoodPhotoUploader onUpload={handleFoodPhotoUpload} isUploading={isUploading} />
            )}

            {/* Photo grid with DnD */}
            {restaurantImages.foodPhotos && restaurantImages.foodPhotos.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={restaurantImages.foodPhotos.map((p) => p.storageId)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {restaurantImages.foodPhotos.map((photo) => (
                      <SortableFoodPhoto
                        key={photo.storageId}
                        photo={photo}
                        onEdit={() => openCaptionDialog(photo)}
                        onRemove={() => handleRemovePhoto(photo.storageId)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {(!restaurantImages.foodPhotos || restaurantImages.foodPhotos.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No food photos yet</p>
                <p className="text-sm">Upload photos to showcase the restaurant's dishes</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Caption Dialog */}
      <Dialog open={captionDialogOpen} onOpenChange={setCaptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Photo Caption</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPhoto && (
              <div className="relative h-40 w-full bg-muted rounded-lg overflow-hidden">
                <Image
                  src={selectedPhoto.url}
                  alt="Food photo"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                value={captionValue}
                onChange={(e) => setCaptionValue(e.target.value)}
                placeholder="e.g., Signature Jerk Chicken"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateCaption}>Save Caption</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Single image upload component (for logo and cover)
interface SingleImageUploadProps {
  currentUrl?: string;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  label: string;
  description: string;
  aspectRatio: "square" | "wide";
}

function SingleImageUpload({
  currentUrl,
  onUpload,
  isUploading,
  label,
  description,
  aspectRatio,
}: SingleImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await onUpload(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await onUpload(file);
  };

  const heightClass = aspectRatio === "square" ? "h-64" : "h-48";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-foreground">{label}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {currentUrl ? (
        <div className={`relative w-full ${heightClass} bg-muted rounded-lg overflow-hidden border-2 border-border`}>
          <Image src={currentUrl} alt={label} fill className="object-cover" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-2 right-2 px-3 py-1.5 bg-background/90 text-foreground rounded-lg hover:bg-background transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Replace
          </button>
        </div>
      ) : (
        <label
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center w-full ${heightClass} border-2 border-dashed rounded-lg cursor-pointer transition-all ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border bg-muted hover:border-primary hover:bg-muted/80"
          }`}
        >
          {isUploading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          ) : (
            <>
              <ImagePlus className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">Drop image or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </>
          )}
        </label>
      )}
    </div>
  );
}

// Food photo uploader (for gallery)
interface FoodPhotoUploaderProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

function FoodPhotoUploader({ onUpload, isUploading }: FoodPhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await onUpload(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await onUpload(file);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <label
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border bg-muted hover:border-primary"
        }`}
      >
        {isUploading ? (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
            <span className="text-sm font-medium">Add food photo</span>
          </div>
        )}
      </label>
    </>
  );
}

// Sortable food photo item
interface SortableFoodPhotoProps {
  photo: FoodPhoto;
  onEdit: () => void;
  onRemove: () => void;
}

function SortableFoodPhoto({ photo, onEdit, onRemove }: SortableFoodPhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.storageId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-muted rounded-lg overflow-hidden border border-border"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 p-1.5 bg-background/80 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-foreground" />
      </div>

      {/* Image */}
      <div className="relative h-32 w-full">
        <Image src={photo.url} alt={photo.caption || "Food photo"} fill className="object-cover" />
      </div>

      {/* Caption */}
      {photo.caption && (
        <div className="p-2 bg-background">
          <p className="text-xs text-muted-foreground truncate">{photo.caption}</p>
        </div>
      )}

      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 bg-background/80 text-foreground rounded hover:bg-background transition-colors"
          title="Edit caption"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="p-1.5 bg-destructive/80 text-destructive-foreground rounded hover:bg-destructive transition-colors"
          title="Remove photo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default RestaurantImageManager;
