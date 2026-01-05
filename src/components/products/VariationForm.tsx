"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { toast } from "sonner";
import { DollarSign, Package, Truck, Download } from "lucide-react";

interface ProductAttribute {
  id: string;
  name: string;
  slug: string;
  values: string[];
  isVariation: boolean;
  isVisible: boolean;
  sortOrder?: number;
}

interface VariationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: Id<"products">;
  variationId: Id<"productVariations"> | null;
  attributes: ProductAttribute[];
  onSuccess: () => void;
}

interface VariationFormData {
  attributes: Record<string, string>;
  price: number;
  compareAtPrice?: number;
  sku: string;
  inventoryQuantity: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  lowStockThreshold?: number;
  imageUrl?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  isVirtual: boolean;
  isDownloadable: boolean;
  downloadFiles: Array<{ id: string; name: string; url: string }>;
  downloadLimit?: number;
  downloadExpiry?: number;
  isEnabled: boolean;
  status: "ACTIVE" | "DRAFT";
}

const defaultFormData: VariationFormData = {
  attributes: {},
  price: 0,
  sku: "",
  inventoryQuantity: 0,
  trackInventory: true,
  allowBackorder: false,
  isVirtual: false,
  isDownloadable: false,
  downloadFiles: [],
  isEnabled: true,
  status: "ACTIVE",
};

export function VariationForm({
  open,
  onOpenChange,
  productId,
  variationId,
  attributes,
  onSuccess,
}: VariationFormProps) {
  const [formData, setFormData] = useState<VariationFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Get existing variation data if editing
  const existingVariation = useQuery(
    api.products.variations.getVariationById,
    variationId ? { variationId } : "skip"
  );

  // Mutations
  const createVariation = useMutation(
    api.products.variationMutations.createVariation
  );
  const updateVariation = useMutation(
    api.products.variationMutations.updateVariation
  );

  // Get variation attributes (those marked for variations)
  const variationAttributes = attributes.filter((attr) => attr.isVariation);

  // Initialize form with existing data or defaults
  useEffect(() => {
    if (variationId && existingVariation) {
      setFormData({
        attributes: existingVariation.attributes as Record<string, string>,
        price: existingVariation.price,
        compareAtPrice: existingVariation.compareAtPrice || undefined,
        sku: existingVariation.sku || "",
        inventoryQuantity: existingVariation.inventoryQuantity,
        trackInventory: existingVariation.trackInventory,
        allowBackorder: existingVariation.allowBackorder || false,
        lowStockThreshold: existingVariation.lowStockThreshold || undefined,
        imageUrl: existingVariation.imageUrl || undefined,
        weight: existingVariation.weight || undefined,
        dimensions: existingVariation.dimensions || undefined,
        isVirtual: existingVariation.isVirtual || false,
        isDownloadable: existingVariation.isDownloadable || false,
        downloadFiles: existingVariation.downloadFiles || [],
        downloadLimit: existingVariation.downloadLimit || undefined,
        downloadExpiry: existingVariation.downloadExpiry || undefined,
        isEnabled: existingVariation.isEnabled,
        status: existingVariation.status,
      });
    } else {
      // Reset to defaults for new variation
      const initialAttributes: Record<string, string> = {};
      variationAttributes.forEach((attr) => {
        if (attr.values.length > 0) {
          initialAttributes[attr.slug] = attr.values[0];
        }
      });
      setFormData({ ...defaultFormData, attributes: initialAttributes });
    }
  }, [variationId, existingVariation, variationAttributes]);

  // Handle attribute selection
  const handleAttributeChange = (slug: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, [slug]: value },
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (formData.price < 0) {
        toast.error("Price cannot be negative");
        return;
      }

      // Check if all variation attributes are selected
      const missingAttrs = variationAttributes.filter(
        (attr) => !formData.attributes[attr.slug]
      );
      if (missingAttrs.length > 0) {
        toast.error(
          `Please select values for: ${missingAttrs.map((a) => a.name).join(", ")}`
        );
        return;
      }

      if (variationId) {
        // Update existing variation
        await updateVariation({
          variationId,
          expectedVersion: existingVariation?.version,
          updates: {
            attributes: formData.attributes,
            price: formData.price,
            sku: formData.sku || undefined,
            compareAtPrice: formData.compareAtPrice,
            inventoryQuantity: formData.inventoryQuantity,
            trackInventory: formData.trackInventory,
            allowBackorder: formData.allowBackorder,
            lowStockThreshold: formData.lowStockThreshold,
            imageUrl: formData.imageUrl,
            weight: formData.weight,
            dimensions: formData.dimensions,
            isVirtual: formData.isVirtual,
            isDownloadable: formData.isDownloadable,
            downloadFiles: formData.downloadFiles,
            downloadLimit: formData.downloadLimit,
            downloadExpiry: formData.downloadExpiry,
            isEnabled: formData.isEnabled,
            status: formData.status,
          },
        });
        toast.success("Variation updated");
      } else {
        // Create new variation
        await createVariation({
          productId,
          attributes: formData.attributes,
          price: formData.price,
          sku: formData.sku || undefined,
          compareAtPrice: formData.compareAtPrice,
          inventoryQuantity: formData.inventoryQuantity,
          trackInventory: formData.trackInventory,
          allowBackorder: formData.allowBackorder,
          lowStockThreshold: formData.lowStockThreshold,
          imageUrl: formData.imageUrl,
          weight: formData.weight,
          dimensions: formData.dimensions,
          isVirtual: formData.isVirtual,
          isDownloadable: formData.isDownloadable,
          downloadFiles: formData.downloadFiles,
          downloadLimit: formData.downloadLimit,
          downloadExpiry: formData.downloadExpiry,
          isEnabled: formData.isEnabled,
        });
        toast.success("Variation created");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save variation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format price for display
  const formatPriceInput = (cents: number) => (cents / 100).toFixed(2);
  const parsePriceInput = (value: string) =>
    Math.round(parseFloat(value || "0") * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {variationId ? "Edit Variation" : "Add Variation"}
          </DialogTitle>
          <DialogDescription>
            {variationId
              ? "Update the details for this variation"
              : "Create a new product variation by selecting attributes and setting prices"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">
                <Package className="h-4 w-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="inventory">
                <Package className="h-4 w-4 mr-2" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="shipping">
                <Truck className="h-4 w-4 mr-2" />
                Shipping
              </TabsTrigger>
              <TabsTrigger value="downloads">
                <Download className="h-4 w-4 mr-2" />
                Downloads
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              {/* Attribute Selection */}
              {variationAttributes.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {variationAttributes.map((attr) => (
                    <div key={attr.id} className="space-y-2">
                      <Label>{attr.name}</Label>
                      <Select
                        value={formData.attributes[attr.slug] || ""}
                        onValueChange={(value) =>
                          handleAttributeChange(attr.slug, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${attr.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {attr.values.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No variation attributes defined. Add attributes to the product
                  first.
                </div>
              )}

              {/* Variation Image */}
              <div className="space-y-2">
                <Label>Variation Image</Label>
                <div className="flex items-start gap-4">
                  {formData.imageUrl ? (
                    <div className="relative">
                      <img
                        src={formData.imageUrl}
                        alt="Variation"
                        className="h-24 w-24 rounded object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            imageUrl: undefined,
                          }))
                        }
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded border-2 border-dashed flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      placeholder="Image URL"
                      value={formData.imageUrl || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          imageUrl: e.target.value || undefined,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter an image URL for this variation
                    </p>
                  </div>
                </div>
              </div>

              {/* SKU */}
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sku: e.target.value }))
                  }
                  placeholder="e.g., SHIRT-M-BLUE"
                />
                <p className="text-xs text-muted-foreground">
                  Stock Keeping Unit - must be unique across all variations
                </p>
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-9"
                      value={formatPriceInput(formData.price)}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          price: parsePriceInput(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compareAtPrice">Compare at Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="compareAtPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-9"
                      value={
                        formData.compareAtPrice
                          ? formatPriceInput(formData.compareAtPrice)
                          : ""
                      }
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          compareAtPrice: e.target.value
                            ? parsePriceInput(e.target.value)
                            : undefined,
                        }))
                      }
                      placeholder="Original price"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isEnabled"
                    checked={formData.isEnabled}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        isEnabled: checked === true,
                      }))
                    }
                  />
                  <Label htmlFor="isEnabled" className="cursor-pointer">
                    Enabled (available for purchase)
                  </Label>
                </div>
                <div className="space-y-2">
                  <Select
                    value={formData.status}
                    onValueChange={(value: "ACTIVE" | "DRAFT") =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="trackInventory"
                  checked={formData.trackInventory}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      trackInventory: checked === true,
                    }))
                  }
                />
                <Label htmlFor="trackInventory" className="cursor-pointer">
                  Track inventory for this variation
                </Label>
              </div>

              {formData.trackInventory && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inventoryQuantity">Stock Quantity</Label>
                      <Input
                        id="inventoryQuantity"
                        type="number"
                        min="0"
                        value={formData.inventoryQuantity}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            inventoryQuantity: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lowStockThreshold">
                        Low Stock Threshold
                      </Label>
                      <Input
                        id="lowStockThreshold"
                        type="number"
                        min="0"
                        value={formData.lowStockThreshold || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            lowStockThreshold: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          }))
                        }
                        placeholder="5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="allowBackorder"
                      checked={formData.allowBackorder}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          allowBackorder: checked === true,
                        }))
                      }
                    />
                    <Label htmlFor="allowBackorder" className="cursor-pointer">
                      Allow backorders (sell when out of stock)
                    </Label>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Shipping Tab */}
            <TabsContent value="shipping" className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isVirtual"
                  checked={formData.isVirtual}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      isVirtual: checked === true,
                    }))
                  }
                />
                <Label htmlFor="isVirtual" className="cursor-pointer">
                  Virtual product (no shipping required)
                </Label>
              </div>

              {!formData.isVirtual && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (grams)</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      value={formData.weight || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          weight: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        }))
                      }
                      placeholder="Product weight"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Dimensions (cm)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Length"
                        value={formData.dimensions?.length || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dimensions: {
                              length: parseFloat(e.target.value) || 0,
                              width: prev.dimensions?.width || 0,
                              height: prev.dimensions?.height || 0,
                            },
                          }))
                        }
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Width"
                        value={formData.dimensions?.width || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dimensions: {
                              length: prev.dimensions?.length || 0,
                              width: parseFloat(e.target.value) || 0,
                              height: prev.dimensions?.height || 0,
                            },
                          }))
                        }
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Height"
                        value={formData.dimensions?.height || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dimensions: {
                              length: prev.dimensions?.length || 0,
                              width: prev.dimensions?.width || 0,
                              height: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Downloads Tab */}
            <TabsContent value="downloads" className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isDownloadable"
                  checked={formData.isDownloadable}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      isDownloadable: checked === true,
                    }))
                  }
                />
                <Label htmlFor="isDownloadable" className="cursor-pointer">
                  Downloadable product
                </Label>
              </div>

              {formData.isDownloadable && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="downloadLimit">Download Limit</Label>
                      <Input
                        id="downloadLimit"
                        type="number"
                        min="-1"
                        value={formData.downloadLimit ?? ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            downloadLimit: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          }))
                        }
                        placeholder="Unlimited (-1)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="downloadExpiry">
                        Download Expiry (days)
                      </Label>
                      <Input
                        id="downloadExpiry"
                        type="number"
                        min="0"
                        value={formData.downloadExpiry ?? ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            downloadExpiry: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          }))
                        }
                        placeholder="Never expires"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Download Files</Label>
                    <p className="text-sm text-muted-foreground">
                      Add downloadable files for this variation. Each file needs
                      a name and URL.
                    </p>
                    {/* File list would go here - simplified for now */}
                    <div className="border rounded-md p-4 text-center text-muted-foreground">
                      File upload coming soon
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : variationId
                  ? "Update Variation"
                  : "Create Variation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
