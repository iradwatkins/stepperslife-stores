"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Package, Plus, Trash2, Upload, Save, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

type Variant = {
  id: string;
  name: string;
  options: {
    size?: string;
    color?: string;
  };
  price: number;
  sku?: string;
  inventoryQuantity: number;
  image?: string;
};

type Props = {
  productId: Id<"products">;
  productName: string;
  basePrice: number;
  baseSku?: string;
  variants?: Variant[];
  onVariantsChange: () => void;
};

export default function VariantsManager({
  productId,
  productName,
  basePrice,
  baseSku,
  variants = [],
  onVariantsChange,
}: Props) {
  const [colors, setColors] = useState("");
  const [sizes, setSizes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<Variant>>>({});

  const generateVariants = useMutation(api.products.mutations.generateVariantCombinations);
  const updateVariant = useMutation(api.products.mutations.updateProductVariant);
  const deleteVariant = useMutation(api.products.mutations.deleteProductVariant);

  const handleGenerateCombinations = async () => {
    if (!colors.trim() || !sizes.trim()) {
      toast.error("Please enter both colors and sizes");
      return;
    }

    const colorArray = colors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const sizeArray = sizes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (colorArray.length === 0 || sizeArray.length === 0) {
      toast.error("Please enter valid colors and sizes");
      return;
    }

    const totalVariants = colorArray.length * sizeArray.length;
    if (!confirm(`This will generate ${totalVariants} variant combinations. Continue?`)) {
      return;
    }

    setIsGenerating(true);
    try {
      await generateVariants({
        productId,
        colors: colorArray,
        sizes: sizeArray,
        basePrice,
        baseSku,
      });
      toast.success(`Successfully generated ${totalVariants} variants!`);
      onVariantsChange();
      setColors("");
      setSizes("");
    } catch (error) {
      toast.error(
        `Failed to generate variants: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateVariant = async (variantId: string) => {
    const updates = editedValues[variantId];
    if (!updates) return;

    try {
      await updateVariant({
        productId,
        variantId,
        updates,
      });
      toast.success("Variant updated successfully!");
      setEditingVariant(null);
      setEditedValues({});
      onVariantsChange();
    } catch (error) {
      toast.error(`Failed to update variant: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDeleteVariant = async (variantId: string, variantName: string) => {
    if (!confirm(`Delete variant "${variantName}"?`)) {
      return;
    }

    try {
      await deleteVariant({ productId, variantId });
      toast.success("Variant deleted successfully!");
      onVariantsChange();
    } catch (error) {
      toast.error(`Failed to delete variant: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleImageUpload = async (variantId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/upload-product-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      await updateVariant({
        productId,
        variantId,
        updates: {
          image: data.url,
        },
      });

      toast.success("Variant image uploaded successfully!");
      onVariantsChange();
    } catch (error) {
      toast.error(`Failed to upload image: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const startEditing = (variant: Variant) => {
    setEditingVariant(variant.id);
    setEditedValues({
      ...editedValues,
      [variant.id]: {
        price: variant.price,
        sku: variant.sku,
        inventoryQuantity: variant.inventoryQuantity,
      },
    });
  };

  const updateEditedValue = (variantId: string, field: string, value: any) => {
    setEditedValues({
      ...editedValues,
      [variantId]: {
        ...editedValues[variantId],
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Variant Generator */}
      <div className="bg-card rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Generate Variant Combinations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Colors (comma-separated)
            </label>
            <input
              type="text"
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              placeholder="Red, Blue, Green, Black"
              className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground mt-1">Example: Red, Blue, Green</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Sizes (comma-separated)
            </label>
            <input
              type="text"
              value={sizes}
              onChange={(e) => setSizes(e.target.value)}
              placeholder="S, M, L, XL"
              className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground mt-1">Example: S, M, L, XL</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateCombinations}
          disabled={isGenerating || !colors.trim() || !sizes.trim()}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Generate Combinations
            </>
          )}
        </button>

        {colors.trim() && sizes.trim() && (
          <p className="text-sm text-muted-foreground mt-3">
            Will generate {colors.split(",").filter(Boolean).length} ×{" "}
            {sizes.split(",").filter(Boolean).length} ={" "}
            {colors.split(",").filter(Boolean).length * sizes.split(",").filter(Boolean).length}{" "}
            variants
          </p>
        )}
      </div>

      {/* Variants Table */}
      {variants.length > 0 && (
        <div className="bg-card rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border">
            <h3 className="text-lg font-bold text-foreground">
              Product Variants ({variants.length})
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Manage pricing, inventory, and images for each variant
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card border-b border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Image
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Variant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Inventory
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {variants.map((variant) => (
                  <tr key={variant.id} className="hover:bg-card">
                    {/* Image */}
                    <td className="px-4 py-3">
                      <div className="relative w-16 h-16">
                        {variant.image ? (
                          <Image
                            src={variant.image}
                            alt={variant.name}
                            fill
                            className="object-cover rounded-lg"
                            unoptimized
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <label className="absolute inset-0 cursor-pointer hover:bg-foreground/20 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Upload className="w-5 h-5 text-primary-foreground" />
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(variant.id, file);
                            }}
                          />
                        </label>
                      </div>
                    </td>

                    {/* Variant Name */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{variant.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {variant.options.color && `Color: ${variant.options.color}`}
                        {variant.options.color && variant.options.size && " • "}
                        {variant.options.size && `Size: ${variant.options.size}`}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3">
                      {editingVariant === variant.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={(editedValues[variant.id]?.price ?? variant.price) / 100}
                          onChange={(e) =>
                            updateEditedValue(
                              variant.id,
                              "price",
                              Math.round(parseFloat(e.target.value) * 100)
                            )
                          }
                          className="w-24 px-2 py-1 border border rounded text-sm"
                        />
                      ) : (
                        <span className="text-foreground">${(variant.price / 100).toFixed(2)}</span>
                      )}
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3">
                      {editingVariant === variant.id ? (
                        <input
                          type="text"
                          value={editedValues[variant.id]?.sku ?? variant.sku ?? ""}
                          onChange={(e) => updateEditedValue(variant.id, "sku", e.target.value)}
                          className="w-32 px-2 py-1 border border rounded text-sm"
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">{variant.sku || "—"}</span>
                      )}
                    </td>

                    {/* Inventory */}
                    <td className="px-4 py-3">
                      {editingVariant === variant.id ? (
                        <input
                          type="number"
                          value={
                            editedValues[variant.id]?.inventoryQuantity ?? variant.inventoryQuantity
                          }
                          onChange={(e) =>
                            updateEditedValue(
                              variant.id,
                              "inventoryQuantity",
                              parseInt(e.target.value)
                            )
                          }
                          className="w-20 px-2 py-1 border border rounded text-sm"
                        />
                      ) : (
                        <span className="text-foreground">{variant.inventoryQuantity}</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {editingVariant === variant.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateVariant(variant.id)}
                              className="p-1 text-success hover:bg-success/10 rounded transition-colors"
                              title="Save changes"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingVariant(null)}
                              className="p-1 text-muted-foreground hover:bg-card rounded transition-colors"
                              title="Cancel"
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditing(variant)}
                              className="px-2 py-1 text-xs bg-accent text-primary rounded hover:bg-primary/20 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(variant.id, variant.name)}
                              className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                              title="Delete variant"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {variants.length === 0 && (
        <div className="bg-card rounded-lg border-2 border-dashed border p-8 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No variants yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Use the generator above to create variant combinations
          </p>
        </div>
      )}
    </div>
  );
}
