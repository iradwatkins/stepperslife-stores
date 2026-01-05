"use client";

import { useQuery } from "convex/react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/convex/_generated/api";
import {
  Store,
  Filter,
  Eye,
  DollarSign,
  Package,
  CheckCircle2,
  FileText,
  Archive,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";

type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

export default function AdminMarketplacePage() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");

  // Get all products
  const allProducts = useQuery(
    api.products.queries.getAllProducts,
    statusFilter !== "all" ? { status: statusFilter } : {}
  );

  // Show loading while Convex auth is being resolved
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If auth completed but user is not authenticated, Convex queries will never return data
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Authentication required to view this page.</p>
          <a href="/login?redirect=/admin/marketplace" className="text-primary hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (!allProducts) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: allProducts.length,
    active: allProducts.filter((p) => p.status === "ACTIVE").length,
    draft: allProducts.filter((p) => p.status === "DRAFT").length,
    archived: allProducts.filter((p) => p.status === "ARCHIVED").length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Marketplace Management</h1>
        <p className="text-muted-foreground mt-1">
          Support vendors by managing their products and listings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 text-success rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-foreground">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 text-warning rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Draft</p>
              <p className="text-2xl font-bold text-foreground">{stats.draft}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted text-muted-foreground rounded-full flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Archived</p>
              <p className="text-2xl font-bold text-foreground">{stats.archived}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DRAFT">Draft Only</option>
            <option value="ARCHIVED">Archived Only</option>
          </select>

          <span className="text-sm text-muted-foreground">
            Showing {allProducts.length} {allProducts.length === 1 ? "product" : "products"}
          </span>
        </div>
      </div>

      {/* Products Grid */}
      {allProducts.length === 0 ? (
        <div className="bg-card rounded-lg shadow-md p-12 text-center">
          <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allProducts.map((product) => (
            <div key={product._id} className="bg-card rounded-lg shadow-md overflow-hidden">
              {/* Product Image */}
              <div className="aspect-square bg-muted relative">
                {product.primaryImage ? (
                  <img
                    src={product.primaryImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <span
                  className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    product.status === "ACTIVE"
                      ? "bg-success/90 text-white"
                      : product.status === "DRAFT"
                        ? "bg-warning/90 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {product.status}
                </span>
              </div>

              {/* Product Details */}
              <div className="p-4">
                <h3 className="font-bold text-foreground truncate">{product.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 h-10 mt-1">
                  {product.description || "No description"}
                </p>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 text-lg font-bold text-foreground">
                    <DollarSign className="w-4 h-4" />
                    {((product.price || 0) / 100).toFixed(2)}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Stock: {product.inventoryQuantity ?? "∞"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <a
                    href={`/marketplace/${product._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-1.5 text-sm text-center bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </a>
                  <a
                    href={`/vendor/dashboard/products/${product._id}/edit`}
                    className="flex-1 px-3 py-1.5 text-sm text-center bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Edit
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      <div className="bg-accent/50 border border-accent rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm text-foreground">
          <p className="font-medium mb-1">Admin Support Role</p>
          <p className="text-muted-foreground">
            As admin, you can view and edit products on behalf of vendors.
            Help vendors manage their listings, pricing, inventory, and product details.
          </p>
        </div>
      </div>
    </div>
  );
}
