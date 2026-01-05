"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Copy,
  Edit,
  Package,
  AlertTriangle,
  Wand2,
  ChevronDown,
  Image as ImageIcon,
  GripVertical,
} from "lucide-react";
import { AttributeEditor } from "./AttributeEditor";
import { VariationForm } from "./VariationForm";
import { BulkEditVariations } from "./BulkEditVariations";
import { toast } from "sonner";

interface VariationManagerProps {
  productId: Id<"products">;
  onVariationsChange?: () => void;
}

interface ProductAttribute {
  id: string;
  name: string;
  slug: string;
  values: string[];
  isVariation: boolean;
  isVisible: boolean;
  sortOrder?: number;
}

export function VariationManager({
  productId,
  onVariationsChange,
}: VariationManagerProps) {
  const [selectedVariations, setSelectedVariations] = useState<
    Id<"productVariations">[]
  >([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVariation, setEditingVariation] = useState<
    Id<"productVariations"> | null
  >(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [variationToDelete, setVariationToDelete] = useState<
    Id<"productVariations"> | null
  >(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Queries
  const product = useQuery(api.products.queries.getProductById, { productId });
  const variations = useQuery(api.products.variations.getVariationsByProduct, {
    productId,
    includeDisabled: true,
  });
  const variationCount = useQuery(api.products.variations.getVariationCount, {
    productId,
  });

  // Mutations
  const generateVariations = useMutation(
    api.products.variationMutations.generateVariationsFromAttributes
  );
  const deleteVariation = useMutation(
    api.products.variationMutations.deleteVariation
  );
  const deleteAllVariations = useMutation(
    api.products.variationMutations.deleteAllVariations
  );
  const bulkUpdate = useMutation(
    api.products.variationMutations.bulkUpdateVariations
  );
  const updateAttributes = useMutation(
    api.products.variationMutations.updateProductAttributes
  );

  // Format price for display
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Handle attribute changes
  const handleAttributesChange = async (attributes: ProductAttribute[]) => {
    try {
      await updateAttributes({ productId, attributes });
      toast.success("Attributes updated");
      onVariationsChange?.();
    } catch (error) {
      toast.error("Failed to update attributes");
      console.error(error);
    }
  };

  // Generate variations from attributes
  const handleGenerateVariations = async () => {
    if (!product) return;

    const variationAttrs = product.attributes?.filter((attr) => attr.isVariation);
    if (!variationAttrs || variationAttrs.length === 0) {
      toast.error("Please add at least one attribute marked for variations");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateVariations({
        productId,
        basePrice: product.price,
        baseInventory: 10, // Default inventory
        trackInventory: true,
      });

      if (result.created > 0) {
        toast.success(
          `Created ${result.created} variations (${result.skipped} already existed)`
        );
      } else {
        toast.info("All variations already exist");
      }
      onVariationsChange?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate variations");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle delete variation
  const handleDeleteVariation = async () => {
    if (!variationToDelete) return;

    try {
      await deleteVariation({ variationId: variationToDelete });
      toast.success("Variation deleted");
      setIsDeleteDialogOpen(false);
      setVariationToDelete(null);
      onVariationsChange?.();
    } catch (error) {
      toast.error("Failed to delete variation");
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedVariations.length === 0) return;

    try {
      for (const id of selectedVariations) {
        await deleteVariation({ variationId: id });
      }
      toast.success(`Deleted ${selectedVariations.length} variations`);
      setSelectedVariations([]);
      onVariationsChange?.();
    } catch (error) {
      toast.error("Failed to delete variations");
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (!variations) return;
    if (selectedVariations.length === variations.length) {
      setSelectedVariations([]);
    } else {
      setSelectedVariations(variations.map((v) => v._id));
    }
  };

  // Handle variation select
  const handleVariationSelect = (id: Id<"productVariations">) => {
    setSelectedVariations((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  // Get stock status badge
  const getStockBadge = (variation: {
    inventoryQuantity: number;
    trackInventory: boolean;
    lowStockThreshold?: number;
    allowBackorder?: boolean;
  }) => {
    if (!variation.trackInventory) {
      return <Badge variant="secondary">Not tracked</Badge>;
    }

    if (variation.inventoryQuantity <= 0) {
      return variation.allowBackorder ? (
        <Badge variant="outline" className="border-amber-500 text-amber-500">
          Backorder
        </Badge>
      ) : (
        <Badge variant="destructive">Out of stock</Badge>
      );
    }

    const threshold = variation.lowStockThreshold || 5;
    if (variation.inventoryQuantity <= threshold) {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-500">
          Low stock ({variation.inventoryQuantity})
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="border-green-500 text-green-500">
        In stock ({variation.inventoryQuantity})
      </Badge>
    );
  };

  if (!product) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Attributes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Attributes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttributeEditor
            attributes={product.attributes || []}
            onChange={handleAttributesChange}
          />
        </CardContent>
      </Card>

      {/* Variations Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Variations</CardTitle>
            {variationCount && (
              <p className="text-sm text-muted-foreground mt-1">
                {variationCount.total} total &middot; {variationCount.active} active
                &middot; {variationCount.draft} draft
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedVariations.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkEditOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Bulk Edit ({selectedVariations.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleGenerateVariations}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate All Variations
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (
                      confirm(
                        "Are you sure you want to delete ALL variations? This cannot be undone."
                      )
                    ) {
                      deleteAllVariations({ productId }).then(() => {
                        toast.success("All variations deleted");
                        onVariationsChange?.();
                      });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Variations
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Variation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!variations || variations.length === 0 ? (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No variations yet</h3>
              <p className="text-muted-foreground mb-4">
                Add attributes above and generate variations, or create them
                manually.
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleGenerateVariations}
                  disabled={
                    isGenerating ||
                    !product.attributes?.some((a) => a.isVariation)
                  }
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  {isGenerating ? "Generating..." : "Generate Variations"}
                </Button>
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manually
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedVariations.length === variations.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Variation</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variations.map((variation) => {
                    const attrs = variation.attributes as Record<string, string>;
                    return (
                      <TableRow
                        key={variation._id}
                        className={!variation.isEnabled ? "opacity-50" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedVariations.includes(variation._id)}
                            onCheckedChange={() =>
                              handleVariationSelect(variation._id)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {variation.imageUrl ? (
                              <img
                                src={variation.imageUrl}
                                alt=""
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">
                                {variation.displayName ||
                                  Object.values(attrs).join(" / ")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {Object.entries(attrs)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(", ")}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {variation.sku || "-"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {formatPrice(variation.price)}
                            </p>
                            {variation.compareAtPrice && (
                              <p className="text-sm text-muted-foreground line-through">
                                {formatPrice(variation.compareAtPrice)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStockBadge(variation)}</TableCell>
                        <TableCell>
                          {variation.status === "ACTIVE" ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingVariation(variation._id);
                                  setIsFormOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setVariationToDelete(variation._id);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variation Form Dialog */}
      <VariationForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingVariation(null);
        }}
        productId={productId}
        variationId={editingVariation}
        attributes={product.attributes || []}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditingVariation(null);
          onVariationsChange?.();
        }}
      />

      {/* Bulk Edit Dialog */}
      <BulkEditVariations
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        variationIds={selectedVariations}
        onSuccess={() => {
          setIsBulkEditOpen(false);
          setSelectedVariations([]);
          onVariationsChange?.();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Variation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this variation? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteVariation}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
