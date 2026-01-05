"use client";

import { useQuery } from "convex/react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/convex/_generated/api";
import {
  GraduationCap,
  Filter,
  Eye,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  FileText,
  XCircle,
  AlertCircle,
  Star,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminFlyerUploadModal } from "@/components/admin/AdminFlyerUploadModal";
import { AdminImageBadge } from "@/components/admin/AdminImageBadge";
import { useState } from "react";
import { format } from "date-fns";

type ClassStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";

export default function AdminClassesPage() {
  const { isLoading: isAuthLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ClassStatus | "all">("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Use getAllEvents and filter for classes (eventType === "CLASS")
  const allEvents = useQuery(
    api.adminPanel.queries.getAllEvents,
    statusFilter !== "all" ? { status: statusFilter } : {}
  );

  // Filter for classes only
  const classes = allEvents?.filter((event) => event.eventType === "CLASS") || [];

  // Apply level filter
  const filteredClasses = levelFilter === "all"
    ? classes
    : classes.filter((c) => c.classLevel === levelFilter);

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

  if (!allEvents) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading classes...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: classes.length,
    published: classes.filter((c) => c.status === "PUBLISHED").length,
    draft: classes.filter((c) => c.status === "DRAFT").length,
    beginner: classes.filter((c) => c.classLevel === "Beginner").length,
    intermediate: classes.filter((c) => c.classLevel === "Intermediate").length,
    advanced: classes.filter((c) => c.classLevel === "Advanced").length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Class Management</h1>
          <p className="text-muted-foreground mt-1">
            Support instructors by managing their classes
          </p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Flyer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
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
              <p className="text-sm text-muted-foreground">Published</p>
              <p className="text-2xl font-bold text-foreground">{stats.published}</p>
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
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Beginner</p>
              <p className="text-2xl font-bold text-foreground">{stats.beginner}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Intermediate</p>
              <p className="text-2xl font-bold text-foreground">{stats.intermediate}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Advanced</p>
              <p className="text-2xl font-bold text-foreground">{stats.advanced}</p>
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
            <option value="PUBLISHED">Published Only</option>
            <option value="DRAFT">Draft Only</option>
            <option value="CANCELLED">Cancelled Only</option>
            <option value="COMPLETED">Completed Only</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            <option value="all">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <span className="text-sm text-muted-foreground">
            Showing {filteredClasses.length} {filteredClasses.length === 1 ? "class" : "classes"}
          </span>
        </div>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <div className="bg-card rounded-lg shadow-md p-12 text-center">
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No classes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredClasses.map((classItem) => (
            <div key={classItem._id} className="bg-card rounded-lg shadow-md overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Class Image */}
                <div className="md:w-40 md:h-40 flex-shrink-0 bg-muted">
                  {classItem.imageUrl ? (
                    <img
                      src={classItem.imageUrl}
                      alt={classItem.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <GraduationCap className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Class Details */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-bold text-foreground">{classItem.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            classItem.status === "PUBLISHED"
                              ? "bg-success/10 text-success"
                              : classItem.status === "DRAFT"
                                ? "bg-warning/10 text-warning"
                                : classItem.status === "CANCELLED"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-accent text-accent-foreground"
                          }`}
                        >
                          {classItem.status || "DRAFT"}
                        </span>
                        {classItem.isAdminUploaded && <AdminImageBadge size="sm" />}
                        {classItem.classLevel && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {classItem.classLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {classItem.description || "No description"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {classItem.startDate
                          ? format(new Date(classItem.startDate), "MMM d, h:mm a")
                          : "No date"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">
                        {typeof classItem.location === "string"
                          ? classItem.location
                          : classItem.location?.city || "No location"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{classItem.ticketCount || 0} registered</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <GraduationCap className="w-4 h-4" />
                      <span>{classItem.organizerName || "Unknown Instructor"}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <a
                      href={`/classes/${classItem._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </a>
                    <a
                      href={`/instructor/classes/${classItem._id}/edit`}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Edit
                    </a>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Instructor: {classItem.organizerEmail || "N/A"}
                    </span>
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
            As admin, you can view and edit classes on behalf of instructors.
            Use the Edit button to help instructors manage their class details,
            schedules, and settings.
          </p>
        </div>
      </div>

      {/* Admin Flyer Upload Modal */}
      <AdminFlyerUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        defaultType="CLASS"
      />
    </div>
  );
}
