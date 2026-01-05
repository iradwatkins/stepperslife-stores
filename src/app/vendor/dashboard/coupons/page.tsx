"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import {
  Ticket,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Percent,
  DollarSign,
  X,
  Loader2,
  Users,
  Package,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateCouponForm {
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: string;
  minPurchaseAmount: string;
  maxDiscountAmount: string;
  maxUses: string;
  maxUsesPerCustomer: string;
  validUntil: string;
}

const initialFormState: CreateCouponForm = {
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minPurchaseAmount: "",
  maxDiscountAmount: "",
  maxUses: "",
  maxUsesPerCustomer: "",
  validUntil: "",
};

export default function VendorCouponsPage() {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreateCouponForm>(initialFormState);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  // Get vendor
  const vendor = useQuery(
    api.vendors.getByOwner,
    user?._id ? { ownerId: user._id as Id<"users"> } : "skip"
  );

  // Get coupons
  const coupons = useQuery(
    api.vendorCoupons.getByVendor,
    vendor?._id ? { vendorId: vendor._id } : "skip"
  );

  // Mutations
  const createCoupon = useMutation(api.vendorCoupons.create);
  const updateCoupon = useMutation(api.vendorCoupons.update);
  const removeCoupon = useMutation(api.vendorCoupons.remove);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor?._id) return;

    setIsCreating(true);
    setError("");

    try {
      await createCoupon({
        vendorId: vendor._id,
        code: formData.code,
        description: formData.description || undefined,
        discountType: formData.discountType,
        discountValue:
          formData.discountType === "PERCENTAGE"
            ? Number(formData.discountValue)
            : Math.round(Number(formData.discountValue) * 100),
        minPurchaseAmount: formData.minPurchaseAmount
          ? Math.round(Number(formData.minPurchaseAmount) * 100)
          : undefined,
        maxDiscountAmount: formData.maxDiscountAmount
          ? Math.round(Number(formData.maxDiscountAmount) * 100)
          : undefined,
        maxUses: formData.maxUses ? Number(formData.maxUses) : undefined,
        maxUsesPerCustomer: formData.maxUsesPerCustomer
          ? Number(formData.maxUsesPerCustomer)
          : undefined,
        validUntil: formData.validUntil
          ? new Date(formData.validUntil).getTime()
          : undefined,
      });

      setFormData(initialFormState);
      setShowCreateModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create coupon");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (couponId: Id<"vendorCoupons">, currentStatus: boolean) => {
    try {
      await updateCoupon({
        couponId,
        isActive: !currentStatus,
      });
    } catch (err) {
      console.error("Failed to toggle coupon:", err);
    }
  };

  const handleDelete = async (couponId: Id<"vendorCoupons">) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      await removeCoupon({ couponId });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete coupon");
    }
  };

  if (!vendor) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Coupons</h1>
          <p className="text-muted-foreground">Create discount codes for your products</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
              <Ticket className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{coupons?.length || 0}</p>
          <p className="text-sm text-muted-foreground">Total Coupons</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-success/20 dark:bg-success/20 rounded-lg flex items-center justify-center">
              <ToggleRight className="w-6 h-6 text-success" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {coupons?.filter((c) => c.isActive).length || 0}
          </p>
          <p className="text-sm text-muted-foreground">Active Coupons</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {coupons?.reduce((sum, c) => sum + c.usedCount, 0) || 0}
          </p>
          <p className="text-sm text-muted-foreground">Total Redemptions</p>
        </div>
      </div>

      {/* Coupons List */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Your Coupons</h2>
        </div>

        {!coupons || coupons.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No coupons yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first coupon to offer discounts to your customers.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Coupon
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {coupons.map((coupon) => {
              const isExpired = coupon.validUntil && Date.now() > coupon.validUntil;
              const isMaxedOut = coupon.maxUses && coupon.usedCount >= coupon.maxUses;

              return (
                <div key={coupon._id} className="p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-lg font-bold text-foreground bg-muted px-3 py-1 rounded">
                        {coupon.code}
                      </code>
                      {coupon.isActive && !isExpired && !isMaxedOut ? (
                        <span className="px-2 py-1 bg-success/20 text-success text-xs font-medium rounded-full">
                          Active
                        </span>
                      ) : isExpired ? (
                        <span className="px-2 py-1 bg-destructive/20 text-destructive text-xs font-medium rounded-full">
                          Expired
                        </span>
                      ) : isMaxedOut ? (
                        <span className="px-2 py-1 bg-warning/20 text-warning text-xs font-medium rounded-full">
                          Limit Reached
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>

                    <p className="text-muted-foreground text-sm mb-2">
                      {coupon.description || "No description"}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {coupon.discountType === "PERCENTAGE" ? (
                          <>
                            <Percent className="w-4 h-4" />
                            <span>{coupon.discountValue}% off</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4" />
                            <span>{formatCurrency(coupon.discountValue)} off</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>
                          {coupon.usedCount}
                          {coupon.maxUses ? `/${coupon.maxUses}` : ""} used
                        </span>
                      </div>

                      {coupon.validUntil && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Expires {formatDate(coupon.validUntil)}</span>
                        </div>
                      )}

                      {coupon.minPurchaseAmount && (
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          <span>Min {formatCurrency(coupon.minPurchaseAmount)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleActive(coupon._id, coupon.isActive)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      title={coupon.isActive ? "Deactivate" : "Activate"}
                    >
                      {coupon.isActive ? (
                        <ToggleRight className="w-5 h-5 text-success" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>

                    {coupon.usedCount === 0 && (
                      <button
                        onClick={() => handleDelete(coupon._id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Create Coupon</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="p-6 space-y-4">
              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="code">Coupon Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., SUMMER20"
                  required
                  className="uppercase"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Summer sale - 20% off"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discountType">Discount Type *</Label>
                  <select
                    id="discountType"
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as "PERCENTAGE" | "FIXED_AMOUNT",
                      })
                    }
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    required
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED_AMOUNT">Fixed Amount</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="discountValue">
                    {formData.discountType === "PERCENTAGE" ? "Percentage *" : "Amount ($) *"}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min={formData.discountType === "PERCENTAGE" ? "1" : "0.01"}
                    max={formData.discountType === "PERCENTAGE" ? "100" : undefined}
                    step={formData.discountType === "PERCENTAGE" ? "1" : "0.01"}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder={formData.discountType === "PERCENTAGE" ? "20" : "10.00"}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minPurchaseAmount">Min Purchase ($)</Label>
                  <Input
                    id="minPurchaseAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minPurchaseAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, minPurchaseAmount: e.target.value })
                    }
                    placeholder="50.00"
                  />
                </div>

                {formData.discountType === "PERCENTAGE" && (
                  <div>
                    <Label htmlFor="maxDiscountAmount">Max Discount ($)</Label>
                    <Input
                      id="maxDiscountAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.maxDiscountAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, maxDiscountAmount: e.target.value })
                      }
                      placeholder="25.00"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxUses">Total Usage Limit</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>

                <div>
                  <Label htmlFor="maxUsesPerCustomer">Per Customer Limit</Label>
                  <Input
                    id="maxUsesPerCustomer"
                    type="number"
                    min="1"
                    value={formData.maxUsesPerCustomer}
                    onChange={(e) =>
                      setFormData({ ...formData, maxUsesPerCustomer: e.target.value })
                    }
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="validUntil">Expiration Date</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating} className="flex-1">
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Coupon
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
