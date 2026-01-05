"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const locationFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Please enter a valid address"),
  city: z.string().min(2, "Please enter a city"),
  state: z.string().min(2, "Please enter a state").max(2, "Use 2-letter state code"),
  zipCode: z.string().min(5, "Please enter a valid ZIP code"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  estimatedPickupTime: z.number().min(5).max(120).optional(),
  acceptingOrders: z.boolean(),
  isActive: z.boolean(),
  isOpenLateNight: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  parkingDetails: z.string().optional(),
  isAccessible: z.boolean().optional(),
  seatingCapacity: z.number().min(0).optional(),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

interface LocationFormProps {
  restaurantId: Id<"restaurants">;
  location?: {
    _id: Id<"restaurantLocations">;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone?: string;
    email?: string;
    estimatedPickupTime?: number;
    acceptingOrders: boolean;
    isActive: boolean;
    isOpenLateNight?: boolean;
    hasParking?: boolean;
    parkingDetails?: string;
    isAccessible?: boolean;
    seatingCapacity?: number;
  };
}

export function LocationForm({ restaurantId, location }: LocationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createLocation = useMutation(api.restaurantLocations.create);
  const updateLocation = useMutation(api.restaurantLocations.update);

  const isEditing = !!location;

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: location?.name ?? "",
      address: location?.address ?? "",
      city: location?.city ?? "",
      state: location?.state ?? "",
      zipCode: location?.zipCode ?? "",
      phone: location?.phone ?? "",
      email: location?.email ?? "",
      estimatedPickupTime: location?.estimatedPickupTime ?? 20,
      acceptingOrders: location?.acceptingOrders ?? true,
      isActive: location?.isActive ?? true,
      isOpenLateNight: location?.isOpenLateNight ?? false,
      hasParking: location?.hasParking ?? false,
      parkingDetails: location?.parkingDetails ?? "",
      isAccessible: location?.isAccessible ?? false,
      seatingCapacity: location?.seatingCapacity ?? 0,
    },
  });

  async function onSubmit(values: LocationFormValues) {
    setIsSubmitting(true);
    try {
      if (isEditing && location) {
        await updateLocation({
          id: location._id,
          name: values.name,
          address: values.address,
          city: values.city,
          state: values.state.toUpperCase(),
          zipCode: values.zipCode,
          phone: values.phone || undefined,
          email: values.email || undefined,
          estimatedPickupTime: values.estimatedPickupTime,
          acceptingOrders: values.acceptingOrders,
          isOpenLateNight: values.isOpenLateNight,
          hasParking: values.hasParking,
          parkingDetails: values.parkingDetails || undefined,
          isAccessible: values.isAccessible,
          seatingCapacity: values.seatingCapacity,
        });
        toast.success("Location updated successfully");
      } else {
        await createLocation({
          restaurantId,
          name: values.name,
          address: values.address,
          city: values.city,
          state: values.state.toUpperCase(),
          zipCode: values.zipCode,
          phone: values.phone || undefined,
          email: values.email || undefined,
          estimatedPickupTime: values.estimatedPickupTime,
          acceptingOrders: values.acceptingOrders,
          isOpenLateNight: values.isOpenLateNight,
          hasParking: values.hasParking,
          parkingDetails: values.parkingDetails || undefined,
          isAccessible: values.isAccessible,
          seatingCapacity: values.seatingCapacity,
        });
        toast.success("Location created successfully");
      }
      router.push("/restaurateur/dashboard/locations");
    } catch (error) {
      console.error("Failed to save location:", error);
      toast.error(isEditing ? "Failed to update location" : "Failed to create location");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Back Link */}
      <Link
        href="/restaurateur/dashboard/locations"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Locations
      </Link>

      {/* Form Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          {isEditing ? "Edit Location" : "Add New Location"}
        </h1>
        <p className="text-muted-foreground">
          {isEditing
            ? "Update your location details"
            : "Add a new location for your restaurant"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Location Details</CardTitle>
              <CardDescription>Basic information about this location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Downtown, O'Hare Airport" {...field} />
                    </FormControl>
                    <FormDescription>
                      A friendly name to identify this location
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Chicago" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="IL"
                            maxLength={2}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP</FormLabel>
                        <FormControl>
                          <Input placeholder="60601" maxLength={10} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How customers can reach this location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(312) 555-0123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="downtown@restaurant.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Operations</CardTitle>
              <CardDescription>Order settings for this location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="estimatedPickupTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Pickup Time (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={5}
                        max={120}
                        placeholder="20"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Average time for order pickup
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptingOrders"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Accepting Orders</FormLabel>
                      <FormDescription>
                        Enable online ordering for this location
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Location</FormLabel>
                      <FormDescription>
                        Make this location visible to customers
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isOpenLateNight"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Late Night Hours</FormLabel>
                      <FormDescription>
                        This location is open past midnight
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
              <CardDescription>Additional information about this location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="hasParking"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Parking Available</FormLabel>
                      <FormDescription>
                        This location has parking options
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("hasParking") && (
                <FormField
                  control={form.control}
                  name="parkingDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parking Details</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Free lot behind building, Street parking"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="isAccessible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Wheelchair Accessible</FormLabel>
                      <FormDescription>
                        This location is ADA accessible
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seatingCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seating Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="50"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of seats available (0 if takeout only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/restaurateur/dashboard/locations")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Location"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
