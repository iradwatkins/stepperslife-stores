"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import {
  Upload,
  Calendar,
  GraduationCap,
  Store,
  ImagePlus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { AdminFlyerUpload } from "@/components/admin/AdminFlyerUpload";
import { AdminImageBadge } from "@/components/admin/AdminImageBadge";
import { RestaurantImageModal } from "@/components/admin/RestaurantImageModal";
import { Id } from "@/convex/_generated/dataModel";

type TabType = "events" | "classes" | "restaurants";

export default function AdminUploadsPage() {
  const { isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("events");
  const [selectedRestaurant, setSelectedRestaurant] = useState<{
    id: Id<"restaurants">;
    name: string;
  } | null>(null);

  // Queries
  const uploadStats = useQuery(api.admin.eventUploads.getAdminUploadStats);
  const adminEvents = useQuery(api.admin.eventUploads.getAdminUploadedEvents, {
    eventType: "EVENT",
  });
  const adminClasses = useQuery(api.admin.eventUploads.getAdminUploadedEvents, {
    eventType: "CLASS",
  });
  const restaurantsNeedingImages = useQuery(
    api.admin.restaurantUploads.getRestaurantsNeedingImages
  );

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload Center</h1>
        <p className="text-muted-foreground mt-1">
          Upload flyers and manage images for events, classes, and restaurants
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Uploaded</p>
              <p className="text-2xl font-bold text-foreground">
                {uploadStats?.totalUploaded ?? "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Events</p>
              <p className="text-2xl font-bold text-foreground">
                {uploadStats?.events ?? "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Classes</p>
              <p className="text-2xl font-bold text-foreground">
                {uploadStats?.classes ?? "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 text-success rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Claimed</p>
              <p className="text-2xl font-bold text-foreground">
                {uploadStats?.claimed ?? "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 text-warning rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unclaimed</p>
              <p className="text-2xl font-bold text-foreground">
                {uploadStats?.unclaimed ?? "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-lg shadow-md">
        <div className="flex border-b border-border">
          {(
            [
              { id: "events", label: "Events", icon: Calendar },
              { id: "classes", label: "Classes", icon: GraduationCap },
              { id: "restaurants", label: "Restaurants", icon: Store },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Events Tab */}
          {activeTab === "events" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Upload Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Upload Event Flyer</h3>
                  <AdminFlyerUpload
                    defaultType="EVENT"
                    onSuccess={() => {
                      // Queries will auto-refresh
                    }}
                  />
                </div>

                {/* Recent Uploads */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Event Uploads</h3>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {!adminEvents ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : adminEvents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No admin-uploaded events yet</p>
                      </div>
                    ) : (
                      adminEvents.slice(0, 10).map((event) => (
                        <div
                          key={event._id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                            {event.imageUrl ? (
                              <img
                                src={event.imageUrl}
                                alt={event.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{event.name}</p>
                              <AdminImageBadge size="sm" responsive />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {event.startDate
                                ? format(new Date(event.startDate), "MMM d, yyyy")
                                : "Date TBD"}
                            </p>
                          </div>
                          <a
                            href={`/events/${event._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Classes Tab */}
          {activeTab === "classes" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Upload Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Upload Class Flyer</h3>
                  <AdminFlyerUpload
                    defaultType="CLASS"
                    onSuccess={() => {
                      // Queries will auto-refresh
                    }}
                  />
                </div>

                {/* Recent Uploads */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Class Uploads</h3>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {!adminClasses ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : adminClasses.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No admin-uploaded classes yet</p>
                      </div>
                    ) : (
                      adminClasses.slice(0, 10).map((classItem) => (
                        <div
                          key={classItem._id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                            {classItem.imageUrl ? (
                              <img
                                src={classItem.imageUrl}
                                alt={classItem.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{classItem.name}</p>
                              <AdminImageBadge size="sm" responsive />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {classItem.startDate
                                ? format(new Date(classItem.startDate), "MMM d, yyyy")
                                : "Date TBD"}
                            </p>
                          </div>
                          <a
                            href={`/classes/${classItem._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Restaurants Tab */}
          {activeTab === "restaurants" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Restaurants Needing Images</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  These restaurants are missing logo, cover image, or food photos
                </p>
              </div>

              {!restaurantsNeedingImages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : restaurantsNeedingImages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-success/10 rounded-lg border border-success">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-success" />
                  <p className="text-success font-medium">All restaurants have complete images!</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {restaurantsNeedingImages.map((restaurant) => (
                    <div
                      key={restaurant.id}
                      className="bg-muted/50 rounded-lg border border-border p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">{restaurant.name}</p>
                          <p className="text-xs text-muted-foreground">/{restaurant.slug}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() =>
                            setSelectedRestaurant({
                              id: restaurant.id,
                              name: restaurant.name,
                            })
                          }
                        >
                          <ImagePlus className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </div>

                      {/* Missing images checklist */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          {restaurant.hasLogo ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-warning" />
                          )}
                          <span
                            className={
                              restaurant.hasLogo ? "text-success" : "text-warning"
                            }
                          >
                            Logo
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {restaurant.hasCover ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-warning" />
                          )}
                          <span
                            className={
                              restaurant.hasCover ? "text-success" : "text-warning"
                            }
                          >
                            Cover Image
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {restaurant.foodPhotoCount > 0 ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-warning" />
                          )}
                          <span
                            className={
                              restaurant.foodPhotoCount > 0
                                ? "text-success"
                                : "text-warning"
                            }
                          >
                            Food Photos ({restaurant.foodPhotoCount}/10)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-accent/50 border border-accent rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm text-foreground">
          <p className="font-medium mb-1">Upload Guidelines</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• Flyers should be clear images (PNG, JPG) up to 10MB</li>
            <li>• AI will attempt to extract event details automatically</li>
            <li>• Events/classes created here will show "Uploaded by SteppersLife" badge</li>
            <li>• Organizers can claim their events later through the platform</li>
          </ul>
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
