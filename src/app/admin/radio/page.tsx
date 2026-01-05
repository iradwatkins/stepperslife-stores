"use client";

import { useQuery } from "convex/react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/convex/_generated/api";
import {
  Radio,
  Filter,
  Eye,
  Headphones,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
  Music,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

export default function AdminRadioPage() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified">("all");
  const [featuredFilter, setFeaturedFilter] = useState(false);

  // Get all DJs
  const allDJs = useQuery(api.radio.getAllDJs, {});

  // Apply filters
  let filteredDJs = allDJs || [];
  if (statusFilter === "verified") {
    filteredDJs = filteredDJs.filter((dj) => dj.verified);
  } else if (statusFilter === "unverified") {
    filteredDJs = filteredDJs.filter((dj) => !dj.verified);
  }
  if (featuredFilter) {
    filteredDJs = filteredDJs.filter((dj) => dj.featured);
  }

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
          <a href="/login?redirect=/admin/radio" className="text-primary hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (!allDJs) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading DJs...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: allDJs.length,
    verified: allDJs.filter((dj) => dj.verified).length,
    unverified: allDJs.filter((dj) => !dj.verified).length,
    featured: allDJs.filter((dj) => dj.featured).length,
    active: allDJs.filter((dj) => dj.isActive).length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Radio Management</h1>
        <p className="text-muted-foreground mt-1">
          Support DJs by managing their profiles and programs
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total DJs</p>
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
              <p className="text-sm text-muted-foreground">Verified</p>
              <p className="text-2xl font-bold text-foreground">{stats.verified}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 text-warning rounded-full flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-foreground">{stats.unverified}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Featured</p>
              <p className="text-2xl font-bold text-foreground">{stats.featured}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-foreground">{stats.active}</p>
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
            <option value="all">All DJs</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Pending Verification</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm text-foreground">Featured Only</span>
          </label>

          <span className="text-sm text-muted-foreground">
            Showing {filteredDJs.length} {filteredDJs.length === 1 ? "DJ" : "DJs"}
          </span>
        </div>
      </div>

      {/* DJs Grid */}
      {filteredDJs.length === 0 ? (
        <div className="bg-card rounded-lg shadow-md p-12 text-center">
          <Radio className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No DJs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDJs.map((dj) => (
            <div key={dj._id} className="bg-card rounded-lg shadow-md overflow-hidden">
              {/* DJ Image */}
              <div className="aspect-video bg-muted relative">
                {dj.photoUrl ? (
                  <img
                    src={dj.photoUrl}
                    alt={dj.stageName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <Radio className="w-12 h-12 text-primary/50" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {dj.verified && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/90 text-white flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                  {dj.featured && (
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
              </div>

              {/* DJ Details */}
              <div className="p-4">
                <h3 className="font-bold text-lg text-foreground">{dj.stageName}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 h-10 mt-1">
                  {dj.bio || "No bio available"}
                </p>

                {/* Genres */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {dj.genres?.slice(0, 3).map((genre) => (
                    <span key={genre} className="px-2 py-0.5 bg-accent text-xs rounded-full flex items-center gap-1">
                      <Music className="w-3 h-3" />
                      {genre}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{dj.totalReviews || 0} reviews</span>
                  </div>
                  {(dj.averageRating ?? 0) > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span>{dj.averageRating?.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <a
                    href={`/radio/dj/${dj.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-1.5 text-sm text-center bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </a>
                  <a
                    href={`/radio/dj-dashboard/${dj._id}`}
                    className="flex-1 px-3 py-1.5 text-sm text-center bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Manage
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
            As admin, you can manage DJ profiles, verify new DJs, feature top performers,
            and help with program scheduling. Use the Manage button to access DJ dashboard controls.
          </p>
        </div>
      </div>
    </div>
  );
}
