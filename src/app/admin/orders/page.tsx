"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/convex/_generated/api";
import {
  Package,
  Filter,
  DollarSign,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type FulfillmentStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export default function OrdersManagementPage() {
  const { isLoading: isAuthLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<FulfillmentStatus | "all">("all");
  const [selectedOrder, setSelectedOrder] = useState<Id<"productOrders"> | null>(null);
  const [trackingInfo, setTrackingInfo] = useState({ number: "", url: "" });

  const allOrders = useQuery(
    api.products.orders.getAllOrders,
    statusFilter !== "all" ? { fulfillmentStatus: statusFilter } : {}
  );

  const updateFulfillmentStatus = useMutation(api.products.orders.updateFulfillmentStatus);

  const handleStatusChange = async (orderId: Id<"productOrders">, newStatus: FulfillmentStatus) => {
    try {
      await updateFulfillmentStatus({
        orderId,
        fulfillmentStatus: newStatus,
      });
      toast.success("Order status updated");
    } catch (error: unknown) {
      toast.error(`Failed to update status: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleAddTracking = async () => {
    if (!selectedOrder) return;

    try {
      await updateFulfillmentStatus({
        orderId: selectedOrder,
        fulfillmentStatus: "SHIPPED",
        trackingNumber: trackingInfo.number || undefined,
        trackingUrl: trackingInfo.url || undefined,
      });
      setSelectedOrder(null);
      setTrackingInfo({ number: "", url: "" });
      toast.success("Tracking information added");
    } catch (error: unknown) {
      toast.error(`Failed to add tracking: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Show loading while Convex auth is being resolved
  if (isAuthLoading) {
    return <LoadingSpinner fullPage text="Authenticating..." />;
  }

  if (!allOrders) {
    return <LoadingSpinner fullPage text="Loading orders..." />;
  }

  const stats = {
    total: allOrders.length,
    pending: allOrders.filter((o) => o.fulfillmentStatus === "PENDING").length,
    processing: allOrders.filter((o) => o.fulfillmentStatus === "PROCESSING").length,
    shipped: allOrders.filter((o) => o.fulfillmentStatus === "SHIPPED").length,
    delivered: allOrders.filter((o) => o.fulfillmentStatus === "DELIVERED").length,
  };

  const totalRevenue = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Orders</h1>
        <p className="text-muted-foreground mt-1">Manage customer orders and fulfillment</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 text-warning rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Processing</p>
              <p className="text-2xl font-bold text-foreground">{stats.processing}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shipped</p>
              <p className="text-2xl font-bold text-foreground">{stats.shipped}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 text-success rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold text-foreground">
                ${(totalRevenue / 100).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            <option value="all">All Orders</option>
            <option value="PENDING">Pending Only</option>
            <option value="PROCESSING">Processing Only</option>
            <option value="SHIPPED">Shipped Only</option>
            <option value="DELIVERED">Delivered Only</option>
            <option value="CANCELLED">Cancelled Only</option>
          </select>

          <span className="text-sm text-muted-foreground">
            Showing {allOrders.length} {allOrders.length === 1 ? "order" : "orders"}
          </span>
        </div>
      </div>

      {/* Orders Table/Cards */}
      {allOrders.length === 0 ? (
        <div className="bg-card rounded-lg shadow-md p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No orders found</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {allOrders.map((order) => (
              <div key={order._id} className="bg-card rounded-lg shadow-md p-4 border border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(order.createdAt), "MMM d, yyyy")}</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">${(order.totalAmount / 100).toFixed(2)}</p>
                </div>
                <div className="space-y-2 mb-3">
                  <p className="text-sm font-medium text-foreground">{order.customerName}</p>
                  <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                  <p className="text-sm text-muted-foreground">{order.items.length} {order.items.length === 1 ? "item" : "items"}</p>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      order.paymentStatus === "PAID"
                        ? "bg-success/10 text-success"
                        : order.paymentStatus === "PENDING"
                          ? "bg-warning/10 text-warning"
                          : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {order.paymentStatus === "PAID" && <CheckCircle2 className="w-3 h-3" />}
                    {order.paymentStatus}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      order.fulfillmentStatus === "DELIVERED"
                        ? "bg-success/10 text-success"
                        : order.fulfillmentStatus === "SHIPPED"
                          ? "bg-accent text-accent-foreground"
                          : order.fulfillmentStatus === "PROCESSING"
                            ? "bg-accent text-accent-foreground"
                            : order.fulfillmentStatus === "CANCELLED"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                    }`}
                  >
                    {order.fulfillmentStatus}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  {order.fulfillmentStatus === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(order._id, "PROCESSING")}
                      className="flex-1 px-3 py-2 bg-accent text-primary rounded-lg hover:bg-accent/90 text-sm font-medium"
                    >
                      Process
                    </button>
                  )}
                  {order.fulfillmentStatus === "PROCESSING" && (
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order._id)}
                      className="flex-1 px-3 py-2 bg-accent text-primary rounded-lg hover:bg-primary/20 text-sm font-medium"
                    >
                      Ship
                    </button>
                  )}
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 text-primary hover:bg-accent rounded-lg flex items-center gap-1 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" /> Track
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-card rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Products
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Fulfillment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-muted">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-muted-foreground">{order.customerEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {order.items.length} {order.items.length === 1 ? "item" : "items"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        ${(order.totalAmount / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            order.paymentStatus === "PAID"
                              ? "bg-success/10 text-success"
                              : order.paymentStatus === "PENDING"
                                ? "bg-warning/10 text-warning"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {order.paymentStatus === "PAID" && <CheckCircle2 className="w-3 h-3" />}
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            order.fulfillmentStatus === "DELIVERED"
                              ? "bg-success/10 text-success"
                              : order.fulfillmentStatus === "SHIPPED"
                                ? "bg-accent text-accent-foreground"
                                : order.fulfillmentStatus === "PROCESSING"
                                  ? "bg-accent text-accent-foreground"
                                  : order.fulfillmentStatus === "CANCELLED"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-warning/10 text-warning"
                          }`}
                        >
                          {order.fulfillmentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {order.fulfillmentStatus === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order._id, "PROCESSING")}
                              className="px-2 py-1 bg-accent text-primary rounded hover:bg-accent/90 text-xs"
                            >
                              Process
                            </button>
                          )}
                          {order.fulfillmentStatus === "PROCESSING" && (
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order._id)}
                              className="px-2 py-1 bg-accent text-primary rounded hover:bg-primary/20 text-xs"
                            >
                              Ship
                            </button>
                          )}
                          {order.trackingUrl && (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-primary hover:bg-accent rounded"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tracking Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Truck className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Add Tracking Information</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingInfo.number}
                  onChange={(e) => setTrackingInfo({ ...trackingInfo, number: e.target.value })}
                  placeholder="1Z999AA10123456784"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tracking URL</label>
                <input
                  type="url"
                  value={trackingInfo.url}
                  onChange={(e) => setTrackingInfo({ ...trackingInfo, url: e.target.value })}
                  placeholder="https://www.ups.com/track?..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleAddTracking}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Mark as Shipped
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  setTrackingInfo({ number: "", url: "" });
                }}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
