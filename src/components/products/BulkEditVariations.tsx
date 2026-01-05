"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { DollarSign, Package, Percent, ArrowUp, ArrowDown, Equal } from "lucide-react";

interface BulkEditVariationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variationIds: Id<"productVariations">[];
  onSuccess: () => void;
}

type PriceActionType = "set" | "increase" | "decrease" | "none";
type InventoryActionType = "set" | "increase" | "decrease" | "none";

interface BulkEditFormData {
  // Price
  priceAction: PriceActionType;
  priceValue: number;
  priceIsPercent: boolean;

  // Inventory
  inventoryAction: InventoryActionType;
  inventoryValue: number;

  // Stock settings
  updateTrackInventory: boolean;
  trackInventory: boolean;
  updateAllowBackorder: boolean;
  allowBackorder: boolean;
  updateLowStockThreshold: boolean;
  lowStockThreshold: number;

  // Status
  updateStatus: boolean;
  status: "ACTIVE" | "DRAFT";
  updateEnabled: boolean;
  isEnabled: boolean;

  // Shipping
  updateWeight: boolean;
  weight: number;
}

const defaultFormData: BulkEditFormData = {
  priceAction: "none",
  priceValue: 0,
  priceIsPercent: false,
  inventoryAction: "none",
  inventoryValue: 0,
  updateTrackInventory: false,
  trackInventory: true,
  updateAllowBackorder: false,
  allowBackorder: false,
  updateLowStockThreshold: false,
  lowStockThreshold: 5,
  updateStatus: false,
  status: "ACTIVE",
  updateEnabled: false,
  isEnabled: true,
  updateWeight: false,
  weight: 0,
};

export function BulkEditVariations({
  open,
  onOpenChange,
  variationIds,
  onSuccess,
}: BulkEditVariationsProps) {
  const [formData, setFormData] = useState<BulkEditFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("pricing");

  const bulkUpdate = useMutation(
    api.products.variationMutations.bulkUpdateVariations
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Build updates object
      const updates: Parameters<typeof bulkUpdate>[0]["updates"] = {};

      // Price updates
      if (formData.priceAction !== "none") {
        if (formData.priceAction === "set") {
          updates.price = Math.round(formData.priceValue * 100); // Convert to cents
        } else {
          updates.priceAdjustment = {
            type: formData.priceAction as "increase" | "decrease",
            value: formData.priceIsPercent
              ? formData.priceValue
              : Math.round(formData.priceValue * 100),
            isPercent: formData.priceIsPercent,
          };
        }
      }

      // Inventory updates
      if (formData.inventoryAction !== "none") {
        if (formData.inventoryAction === "set") {
          updates.inventoryQuantity = formData.inventoryValue;
        } else {
          updates.inventoryAdjustment = {
            type: formData.inventoryAction,
            value: formData.inventoryValue,
          };
        }
      }

      // Stock settings
      if (formData.updateTrackInventory) {
        updates.trackInventory = formData.trackInventory;
      }
      if (formData.updateAllowBackorder) {
        updates.allowBackorder = formData.allowBackorder;
      }
      if (formData.updateLowStockThreshold) {
        updates.lowStockThreshold = formData.lowStockThreshold;
      }

      // Status updates
      if (formData.updateStatus) {
        updates.status = formData.status;
      }
      if (formData.updateEnabled) {
        updates.isEnabled = formData.isEnabled;
      }

      // Shipping updates
      if (formData.updateWeight) {
        updates.weight = formData.weight;
      }

      // Check if any updates were selected
      if (Object.keys(updates).length === 0) {
        toast.error("Please select at least one field to update");
        return;
      }

      const result = await bulkUpdate({
        variationIds,
        updates,
      });

      toast.success(`Updated ${result.updated} variations`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to update variations");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData(defaultFormData);
      setActiveTab("pricing");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Edit Variations</DialogTitle>
          <DialogDescription>
            Update {variationIds.length} selected variation
            {variationIds.length !== 1 ? "s" : ""}. Changes will apply to all
            selected items.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Label>Price Action</Label>
                <RadioGroup
                  value={formData.priceAction}
                  onValueChange={(value: PriceActionType) =>
                    setFormData((prev) => ({ ...prev, priceAction: value }))
                  }
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="price-none" />
                    <Label htmlFor="price-none" className="cursor-pointer">
                      No change
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="set" id="price-set" />
                    <Label htmlFor="price-set" className="cursor-pointer">
                      <Equal className="h-4 w-4 inline mr-1" />
                      Set to
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="increase" id="price-increase" />
                    <Label htmlFor="price-increase" className="cursor-pointer">
                      <ArrowUp className="h-4 w-4 inline mr-1 text-green-500" />
                      Increase by
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="decrease" id="price-decrease" />
                    <Label htmlFor="price-decrease" className="cursor-pointer">
                      <ArrowDown className="h-4 w-4 inline mr-1 text-red-500" />
                      Decrease by
                    </Label>
                  </div>
                </RadioGroup>

                {formData.priceAction !== "none" && (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      {!formData.priceIsPercent && (
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className={!formData.priceIsPercent ? "pl-9" : ""}
                        value={formData.priceValue || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            priceValue: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder={
                          formData.priceAction === "set" ? "New price" : "Amount"
                        }
                      />
                      {formData.priceIsPercent && (
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    {formData.priceAction !== "set" && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="priceIsPercent"
                          checked={formData.priceIsPercent}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              priceIsPercent: checked === true,
                            }))
                          }
                        />
                        <Label
                          htmlFor="priceIsPercent"
                          className="cursor-pointer"
                        >
                          Percent
                        </Label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Label>Stock Quantity Action</Label>
                <RadioGroup
                  value={formData.inventoryAction}
                  onValueChange={(value: InventoryActionType) =>
                    setFormData((prev) => ({ ...prev, inventoryAction: value }))
                  }
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="inv-none" />
                    <Label htmlFor="inv-none" className="cursor-pointer">
                      No change
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="set" id="inv-set" />
                    <Label htmlFor="inv-set" className="cursor-pointer">
                      <Equal className="h-4 w-4 inline mr-1" />
                      Set to
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="increase" id="inv-increase" />
                    <Label htmlFor="inv-increase" className="cursor-pointer">
                      <ArrowUp className="h-4 w-4 inline mr-1 text-green-500" />
                      Increase by
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="decrease" id="inv-decrease" />
                    <Label htmlFor="inv-decrease" className="cursor-pointer">
                      <ArrowDown className="h-4 w-4 inline mr-1 text-red-500" />
                      Decrease by
                    </Label>
                  </div>
                </RadioGroup>

                {formData.inventoryAction !== "none" && (
                  <Input
                    type="number"
                    min="0"
                    value={formData.inventoryValue || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        inventoryValue: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder={
                      formData.inventoryAction === "set"
                        ? "New quantity"
                        : "Quantity"
                    }
                  />
                )}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <Checkbox
                    id="updateTrackInventory"
                    checked={formData.updateTrackInventory}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        updateTrackInventory: checked === true,
                      }))
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="updateTrackInventory"
                      className="cursor-pointer"
                    >
                      Update inventory tracking
                    </Label>
                    {formData.updateTrackInventory && (
                      <Select
                        value={formData.trackInventory ? "true" : "false"}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            trackInventory: value === "true",
                          }))
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Track inventory</SelectItem>
                          <SelectItem value="false">
                            Don't track inventory
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Checkbox
                    id="updateAllowBackorder"
                    checked={formData.updateAllowBackorder}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        updateAllowBackorder: checked === true,
                      }))
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="updateAllowBackorder"
                      className="cursor-pointer"
                    >
                      Update backorder setting
                    </Label>
                    {formData.updateAllowBackorder && (
                      <Select
                        value={formData.allowBackorder ? "true" : "false"}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            allowBackorder: value === "true",
                          }))
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Allow backorders</SelectItem>
                          <SelectItem value="false">
                            Don't allow backorders
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Checkbox
                    id="updateLowStockThreshold"
                    checked={formData.updateLowStockThreshold}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        updateLowStockThreshold: checked === true,
                      }))
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="updateLowStockThreshold"
                      className="cursor-pointer"
                    >
                      Update low stock threshold
                    </Label>
                    {formData.updateLowStockThreshold && (
                      <Input
                        type="number"
                        min="0"
                        className="mt-2"
                        value={formData.lowStockThreshold}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            lowStockThreshold: parseInt(e.target.value) || 0,
                          }))
                        }
                        placeholder="Low stock threshold"
                      />
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status" className="space-y-4 mt-4">
              <div className="flex items-center gap-4">
                <Checkbox
                  id="updateEnabled"
                  checked={formData.updateEnabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      updateEnabled: checked === true,
                    }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="updateEnabled" className="cursor-pointer">
                    Update enabled status
                  </Label>
                  {formData.updateEnabled && (
                    <Select
                      value={formData.isEnabled ? "true" : "false"}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          isEnabled: value === "true",
                        }))
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">
                          Enabled (available for purchase)
                        </SelectItem>
                        <SelectItem value="false">
                          Disabled (not available)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Checkbox
                  id="updateStatus"
                  checked={formData.updateStatus}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      updateStatus: checked === true,
                    }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="updateStatus" className="cursor-pointer">
                    Update publication status
                  </Label>
                  {formData.updateStatus && (
                    <Select
                      value={formData.status}
                      onValueChange={(value: "ACTIVE" | "DRAFT") =>
                        setFormData((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <Checkbox
                  id="updateWeight"
                  checked={formData.updateWeight}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      updateWeight: checked === true,
                    }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="updateWeight" className="cursor-pointer">
                    Update weight (grams)
                  </Label>
                  {formData.updateWeight && (
                    <Input
                      type="number"
                      min="0"
                      className="mt-2"
                      value={formData.weight || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          weight: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="Weight in grams"
                    />
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Updating..."
                : `Update ${variationIds.length} Variation${variationIds.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
