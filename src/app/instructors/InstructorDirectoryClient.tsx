"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InstructorCard } from "@/components/instructors/InstructorCard";
import {
  Search,
  Users,
  BadgeCheck,
  MapPin,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function InstructorDirectoryClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Fetch data
  const instructors = useQuery(api.instructors.queries.getAll, {
    search: searchQuery || undefined,
    specialty: selectedSpecialty !== "all" ? selectedSpecialty : undefined,
    location: selectedLocation !== "all" ? selectedLocation : undefined,
    verifiedOnly: verifiedOnly || undefined,
  });

  const specialties = useQuery(api.instructors.queries.getSpecialties);
  const locations = useQuery(api.instructors.queries.getLocations);
  const stats = useQuery(api.instructors.queries.getStats);

  const isLoading = instructors === undefined;

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSpecialty !== "all") count++;
    if (selectedLocation !== "all") count++;
    if (verifiedOnly) count++;
    return count;
  }, [selectedSpecialty, selectedLocation, verifiedOnly]);

  const clearFilters = () => {
    setSelectedSpecialty("all");
    setSelectedLocation("all");
    setVerifiedOnly(false);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container max-w-7xl mx-auto px-4 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Meet Our Instructors
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Learn from the best in Chicago Steppin&apos;, Line Dance, and
              Walking. Our verified instructors bring decades of experience to
              help you master your moves.
            </p>

            {/* Stats */}
            <div className="flex justify-center gap-8 md:gap-12">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {stats?.total ?? "—"}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Instructors
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {stats?.verified ?? "—"}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4" />
                  Verified
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {stats?.cities ?? "—"}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  Cities
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search instructors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search instructors"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select
                value={selectedSpecialty}
                onValueChange={setSelectedSpecialty}
              >
                <SelectTrigger className="w-[140px]" aria-label="Filter by specialty">
                  <SelectValue placeholder="Specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Styles</SelectItem>
                  {specialties?.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
              >
                <SelectTrigger className="w-[150px]" aria-label="Filter by location">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={verifiedOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className="gap-1.5"
              >
                <BadgeCheck className="w-4 h-4" />
                Verified
              </Button>

              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Clear ({activeFilterCount})
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              "Loading..."
            ) : (
              <>
                Showing{" "}
                <span className="font-medium text-foreground">
                  {instructors?.length ?? 0}
                </span>{" "}
                instructor{instructors?.length !== 1 ? "s" : ""}
              </>
            )}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && instructors?.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No instructors found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear all filters
            </Button>
          </motion.div>
        )}

        {/* Instructor Grid */}
        {!isLoading && instructors && instructors.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {instructors.map((instructor, index) => (
                <motion.div
                  key={instructor._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <InstructorCard instructor={instructor} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
