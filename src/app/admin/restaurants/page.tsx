"use client";

import { useQuery } from "convex/react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/convex/_generated/api";
import {
  Utensils,
  Filter,
  Eye,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Moon,
  ImagePlus,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RestaurantImageModal } from "@/components/admin/RestaurantImageModal";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminRestaurantsPage() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [lateNightFilter, setLateNightFilter] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<{
    id: Id<"restaurants">;
    name: string;
  } | null>(null);

  // Get all restaurants
  const allRestaurants = useQuery(api.restaurants.getAll, {
    lateNightOnly: lateNightFilter || undefined,
  });

  // Apply status filter
  const restaurants = statusFilter === "all"
    ? allRestaurants
    : statusFilter === "active"
      ? allRestaurants?.filter((r) => r.isActive)
      : allRestaurants?.filter((r) => !r.isActive);

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
          <a href="/login?redirect=/admin/restaurants" className="text-primary hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (!allRestaurants) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: allRestaurants.length,
    active: allRestaurants.filter((r) => r.isActive).length,
    inactive: allRestaurants.filter((r) => !r.isActive).length,
    lateNight: allRestaurants.filter((r) => r.isOpenLateNight).length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Restaurant Management</h1>
        <p className="text-muted-foreground mt-1">
          Support restaurateurs by managing their restaurant listings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
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
            <div className="w-10 h-10 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold text-foreground">{stats.inactive}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Late Night</p>
              <p className="text-2xl font-bold text-foreground">{stats.lateNight}</p>
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
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={lateNightFilter}
              onChange={(e) => setLateNightFilter(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm text-foreground">Late Night Only</span>
          </label>

          <span className="text-sm text-muted-foreground">
            Showing {restaurants?.length || 0} {(restaurants?.length || 0) === 1 ? "restaurant" : "restaurants"}
          </span>
        </div>
      </div>

      {/* Restaurants Grid */}
      {!restaurants || restaurants.length === 0 ? (
        <div className="bg-card rounded-lg shadow-md p-12 text-center">
          <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No restaurants found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {restaurants.map((restaurant) => (
            <div key={restaurant._id} className="bg-card rounded-lg shadow-md overflow-hidden">
              <div className="flex">
                {/* Restaurant Image */}
                <div className="w-32 h-32 flex-shrink-0 bg-muted">
                  {restaurant.coverImageUrl ? (
                    <img
                      src={restaurant.coverImageUrl}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Utensils className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Restaurant Details */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-foreground">{restaurant.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            restaurant.isActive
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {restaurant.isActive ? "Active" : "Inactive"}
                        </span>
                        {restaurant.isOpenLateNight && (
                          <Moon className="w-4 h-4 text-purple-500" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {restaurant.cuisine?.slice(0, 3).map((c) => (
                          <span key={c} className="px-2 py-0.5 bg-accent text-xs rounded-full">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{restaurant.city}, {restaurant.state}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{restaurant.phone || "No phone"}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <a
                      href={`/restaurants/${restaurant.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setSelectedRestaurant({
                          id: restaurant._id,
                          name: restaurant.name,
                        })
                      }
                    >
                      <ImagePlus className="w-4 h-4 mr-1" />
                      Images
                    </Button>
                    <a
                      href={`/restaurateur/dashboard/${restaurant._id}`}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Manage
                    </a>
                  </div>
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
            As admin, you can view and manage restaurants on behalf of restaurateurs.
            Use the Images button to upload logos, cover photos, and food gallery.
            Use the Manage button to help with menu updates, hours, and settings.
          </p>
        </div>
      </div>

      {/* Restaurant Image Modal */}
      <RestaurantImageModal
        restaurantId={selectedRestaurant?.id ?? null}
        restaurantName={selectedRestaurant?.name}
        open={!!selectedRestaurant}
        onOpenChange={(open) => !open && setSelectedRestaurant(null)}
      />
    </div>
  );
}
