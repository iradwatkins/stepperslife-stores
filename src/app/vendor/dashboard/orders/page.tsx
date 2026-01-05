"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import {
  Package,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ShoppingBag,
  Play,
  X,
  Loader2,
} from "lucide-react";

type FulfillmentStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

interface OrderItem {
  productId: Id<"products">;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

interface VendorOrder {
  _id: string;
  _creationTime: number;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  fulfillmentStatus: FulfillmentStatus;
  trackingNumber?: string;
  trackingUrl?: string;
  createdAt: number;
  paidAt?: number;
  shippedAt?: number;
  deliveredAt?: number;
  vendorItems: OrderItem[];
  vendorSubtotal: number;
  totalItems: number;
}

const STATUS_CONFIG: Record<FulfillmentStatus, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: "Pending", color: "bg-warning/20 text-warning-foreground dark:bg-warning/20 dark:text-warning", icon: Clock },
  PROCESSING: { label: "Processing", color: "bg-info/20 text-foreground dark:bg-primary/20 dark:text-primary", icon: Package },
  SHIPPED: { label: "Shipped", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300", icon: Truck },
  DELIVERED: { label: "Delivered", color: "bg-success/20 text-success dark:bg-success/20 dark:text-success", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "bg-destructive/20 text-destructive dark:bg-destructive/20 dark:text-destructive", icon: XCircle },
};

export default function VendorOrdersPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FulfillmentStatus | "">("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  // Order action state
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [actionOrder, setActionOrder] = useState<VendorOrder | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Mutation for updating order status
  const updateStatus = useMutation(api.products.orders.updateFulfillmentStatus);

  // Get vendor
  const vendor = useQuery(
    api.vendors.getByOwner,
    user?._id ? { ownerId: user._id as Id<"users"> } : "skip"
  );

  // Get vendor orders
  const orders = useQuery(
    api.products.orders.getOrdersByVendor,
    vendor?._id
      ? {
          vendorId: vendor._id,
          fulfillmentStatus: statusFilter || undefined,
        }
      : "skip"
  ) as VendorOrder[] | undefined;

  // Filter orders by search
  const filteredOrders = orders?.filter((order: VendorOrder) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.customerEmail.toLowerCase().includes(query)
    );
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Calculate stats
  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter((o: VendorOrder) => o.fulfillmentStatus === "PENDING").length || 0,
    processing: orders?.filter((o: VendorOrder) => o.fulfillmentStatus === "PROCESSING").length || 0,
    shipped: orders?.filter((o: VendorOrder) => o.fulfillmentStatus === "SHIPPED").length || 0,
  };

  // Handler: Update order status directly (for PROCESSING and DELIVERED)
  const handleUpdateStatus = async (order: VendorOrder, status: FulfillmentStatus) => {
    setUpdating(true);
    setUpdateError(null);
    try {
      await updateStatus({
        orderId: order._id as Id<"productOrders">,
        fulfillmentStatus: status,
      });
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setUpdating(false);
    }
  };

  // Handler: Open shipping modal to enter tracking info
  const openShippingModal = (order: VendorOrder) => {
    setActionOrder(order);
    setTrackingNumber(order.trackingNumber || "");
    setTrackingUrl(order.trackingUrl || "");
    setUpdateError(null);
    setShowShippingModal(true);
  };

  // Handler: Submit shipment with tracking info
  const handleShipOrder = async () => {
    if (!actionOrder) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      await updateStatus({
        orderId: actionOrder._id as Id<"productOrders">,
        fulfillmentStatus: "SHIPPED",
        trackingNumber: trackingNumber.trim() || undefined,
        trackingUrl: trackingUrl.trim() || undefined,
      });
      setShowShippingModal(false);
      setActionOrder(null);
      setTrackingNumber("");
      setTrackingUrl("");
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Failed to ship order");
    } finally {
      setUpdating(false);
    }
  };

  // Handler: Close shipping modal
  const closeShippingModal = () => {
    setShowShippingModal(false);
    setActionOrder(null);
    setTrackingNumber("");
    setTrackingUrl("");
    setUpdateError(null);
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-muted-foreground">Manage orders containing your products</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/20 dark:bg-warning/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-info/20 dark:bg-primary/20 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.processing}</p>
              <p className="text-sm text-muted-foreground">Processing</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.shipped}</p>
              <p className="text-sm text-muted-foreground">Shipped</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by order number, customer name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FulfillmentStatus | "")}
              className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {orders === undefined ? (
        <div className="bg-card rounded-xl border border-border p-8 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : filteredOrders && filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order: VendorOrder) => {
            const statusConfig = STATUS_CONFIG[order.fulfillmentStatus as FulfillmentStatus];
            const StatusIcon = statusConfig.icon;
            const isExpanded = selectedOrder === order._id;

            return (
              <div
                key={order._id}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                {/* Order Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedOrder(isExpanded ? null : order._id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.customerName} • {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-foreground">
                          {formatCurrency(order.vendorSubtotal)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.totalItems} item{order.totalItems !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}
                      >
                        <StatusIcon className="w-4 h-4" />
                        {statusConfig.label}
                      </span>
                      <button
                        type="button" className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <Eye className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Customer Info */}
                      <div>
                        <h4 className="font-medium text-foreground mb-2">Customer Information</h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Name:</span>{" "}
                            {order.customerName}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Email:</span>{" "}
                            {order.customerEmail}
                          </p>
                          {order.customerPhone && (
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground">Phone:</span>{" "}
                              {order.customerPhone}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Shipping Address */}
                      <div>
                        <h4 className="font-medium text-foreground mb-2">Shipping Address</h4>
                        <div className="text-sm text-muted-foreground">
                          <p>{order.shippingAddress.name}</p>
                          <p>{order.shippingAddress.address1}</p>
                          {order.shippingAddress.address2 && (
                            <p>{order.shippingAddress.address2}</p>
                          )}
                          <p>
                            {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                            {order.shippingAddress.zipCode}
                          </p>
                          <p>{order.shippingAddress.country}</p>
                        </div>
                      </div>
                    </div>

                    {/* Your Items */}
                    <div className="mt-6">
                      <h4 className="font-medium text-foreground mb-3">Your Items</h4>
                      <div className="space-y-3">
                        {order.vendorItems.map((item: OrderItem, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                          >
                            <div>
                              <p className="font-medium text-foreground">{item.productName}</p>
                              {item.variantName && (
                                <p className="text-sm text-muted-foreground">{item.variantName}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-foreground">
                                {formatCurrency(item.totalPrice)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} × {formatCurrency(item.price)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tracking Info */}
                    {order.trackingNumber && (
                      <div className="mt-6 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
                        <h4 className="font-medium text-sky-900 dark:text-sky-100 mb-2">
                          Tracking Information
                        </h4>
                        <p className="text-sm text-sky-800 dark:text-sky-200">
                          Tracking #: {order.trackingNumber}
                        </p>
                        {order.trackingUrl && (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:text-primary/90 underline"
                          >
                            Track Package
                          </a>
                        )}
                      </div>
                    )}

                    {/* Order Timeline */}
                    <div className="mt-6">
                      <h4 className="font-medium text-foreground mb-3">Order Timeline</h4>
                      <div className="space-y-2 text-sm">
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">Created:</span>{" "}
                          {formatDate(order.createdAt)}
                        </p>
                        {order.paidAt && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Paid:</span>{" "}
                            {formatDate(order.paidAt)}
                          </p>
                        )}
                        {order.shippedAt && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Shipped:</span>{" "}
                            {formatDate(order.shippedAt)}
                          </p>
                        )}
                        {order.deliveredAt && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Delivered:</span>{" "}
                            {formatDate(order.deliveredAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Order Actions */}
                    {order.fulfillmentStatus !== "DELIVERED" && order.fulfillmentStatus !== "CANCELLED" && (
                      <div className="mt-6 pt-4 border-t border-border">
                        <h4 className="font-medium text-foreground mb-3">Order Actions</h4>
                        <div className="flex flex-wrap gap-3">
                          {order.fulfillmentStatus === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(order, "PROCESSING")}
                              disabled={updating}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {updating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                              Start Processing
                            </button>
                          )}
                          {order.fulfillmentStatus === "PROCESSING" && (
                            <button
                              type="button"
                              onClick={() => openShippingModal(order)}
                              disabled={updating}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {updating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Truck className="w-4 h-4" />
                              )}
                              Mark as Shipped
                            </button>
                          )}
                          {order.fulfillmentStatus === "SHIPPED" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(order, "DELIVERED")}
                              disabled={updating}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg font-medium hover:bg-success/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {updating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              Mark as Delivered
                            </button>
                          )}
                        </div>
                        {updateError && (
                          <p className="mt-2 text-sm text-destructive dark:text-destructive">{updateError}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">No orders yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            When customers purchase your products, their orders will appear here.
          </p>
        </div>
      )}

      {/* Shipping Modal */}
      {showShippingModal && actionOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full border border-border">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">Ship Order</h3>
                <p className="text-sm text-muted-foreground">{actionOrder.orderNumber}</p>
              </div>
              <button
                type="button"
                onClick={closeShippingModal}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g., 1Z999AA10123456784"
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Tracking URL (optional)
                </label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="e.g., https://www.ups.com/track?tracknum=..."
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              {updateError && (
                <p className="text-sm text-destructive dark:text-destructive">{updateError}</p>
              )}

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Shipping to:</strong>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {actionOrder.shippingAddress.name}<br />
                  {actionOrder.shippingAddress.address1}<br />
                  {actionOrder.shippingAddress.address2 && <>{actionOrder.shippingAddress.address2}<br /></>}
                  {actionOrder.shippingAddress.city}, {actionOrder.shippingAddress.state} {actionOrder.shippingAddress.zipCode}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t border-border">
              <button
                type="button"
                onClick={closeShippingModal}
                disabled={updating}
                className="flex-1 px-4 py-2 border border-input rounded-lg font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleShipOrder}
                disabled={updating}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Shipping...
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    Confirm Shipment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
