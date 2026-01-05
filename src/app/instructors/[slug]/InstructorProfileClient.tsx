"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BadgeCheck,
  MapPin,
  Calendar,
  Users,
  BookOpen,
  Instagram,
  Facebook,
  Youtube,
  Globe,
  ArrowLeft,
  Share2,
  Mail,
} from "lucide-react";
import { motion } from "framer-motion";

interface InstructorProfileClientProps {
  slug: string;
}

export function InstructorProfileClient({
  slug,
}: InstructorProfileClientProps) {
  const instructor = useQuery(api.instructors.queries.getBySlug, { slug });

  // Fetch upcoming classes for this instructor
  const instructorClasses = useQuery(
    api.public.queries.getPublishedClasses,
    instructor ? { instructorSlug: slug, limit: 5 } : "skip"
  );

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: instructor?.name ?? "Instructor",
        text: `Check out ${instructor?.name} on SteppersLife`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      // You could add a toast notification here
    }
  };

  // Loading state
  if (instructor === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-5xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="flex flex-col md:flex-row gap-8">
            <Skeleton className="w-full md:w-80 aspect-square rounded-xl" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (instructor === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Instructor Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This instructor profile doesn&apos;t exist or has been removed.
          </p>
          <Button asChild>
            <Link href="/instructors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Instructors
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/5">
        {instructor.bannerUrl && (
          <Image
            src={instructor.bannerUrl}
            alt=""
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <div className="container max-w-5xl mx-auto px-4">
        {/* Back Button */}
        <div className="-mt-20 relative z-10 mb-4">
          <Button variant="ghost" size="sm" asChild className="bg-background/80 backdrop-blur">
            <Link href="/instructors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Instructors
            </Link>
          </Button>
        </div>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-6 md:gap-8 -mt-12 md:-mt-16 relative z-10"
        >
          {/* Photo */}
          <div className="flex-shrink-0">
            <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-xl overflow-hidden border-4 border-background shadow-lg bg-muted">
              {instructor.photoUrl ? (
                <Image
                  src={instructor.photoUrl}
                  alt={instructor.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Users className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-4 md:pt-8">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {instructor.name}
                  </h1>
                  {instructor.verified && (
                    <div className="bg-blue-500 text-white rounded-full p-1">
                      <BadgeCheck className="w-5 h-5" />
                    </div>
                  )}
                </div>
                {instructor.title && (
                  <p className="text-lg text-muted-foreground">
                    {instructor.title}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              {instructor.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {instructor.location}
                </div>
              )}
              {instructor.experienceYears && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {instructor.experienceYears}+ years experience
                </div>
              )}
              {instructor.classCount !== undefined && instructor.classCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {instructor.classCount} classes
                </div>
              )}
              {instructor.studentCount !== undefined && instructor.studentCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {instructor.studentCount}+ students taught
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {instructor.specialties.map((specialty) => (
                <Badge key={specialty} variant="secondary">
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pb-12">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Bio */}
            {instructor.bio && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {instructor.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Classes Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Upcoming Classes</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/classes?instructor=${instructor.slug}`}>
                    View All
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {instructorClasses === undefined ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : instructorClasses && instructorClasses.length > 0 ? (
                  <div className="space-y-4">
                    {instructorClasses.map((classItem) => (
                      <Link
                        key={classItem._id}
                        href={`/classes/${classItem._id}`}
                        className="block group"
                      >
                        <div className="flex gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          {classItem.imageUrl && (
                            <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                              <Image
                                src={classItem.imageUrl}
                                alt={classItem.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground group-hover:text-primary truncate">
                              {classItem.name}
                            </h4>
                            {classItem.startDate && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(classItem.startDate).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            )}
                            {classItem.location && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate">
                                  {typeof classItem.location === "string"
                                    ? classItem.location
                                    : classItem.location.venueName || classItem.location.city}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No upcoming classes scheduled</p>
                    <p className="text-sm">Check back soon for new classes!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" asChild>
                  <Link href={`/classes?instructor=${instructor.slug}`}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    View Classes
                  </Link>
                </Button>
                {instructor.socialLinks?.website && (
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={instructor.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Visit Website
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Social Links */}
            {instructor.socialLinks &&
              (instructor.socialLinks.instagram ||
                instructor.socialLinks.facebook ||
                instructor.socialLinks.youtube) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Follow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {instructor.socialLinks.instagram && (
                        <Button variant="outline" size="icon" asChild>
                          <a
                            href={`https://instagram.com/${instructor.socialLinks.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                          >
                            <Instagram className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      {instructor.socialLinks.facebook && (
                        <Button variant="outline" size="icon" asChild>
                          <a
                            href={`https://facebook.com/${instructor.socialLinks.facebook}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Facebook"
                          >
                            <Facebook className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      {instructor.socialLinks.youtube && (
                        <Button variant="outline" size="icon" asChild>
                          <a
                            href={`https://youtube.com/${instructor.socialLinks.youtube}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="YouTube"
                          >
                            <Youtube className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Verified Badge Info */}
            {instructor.verified && (
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-500 text-white rounded-full p-2">
                      <BadgeCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-700 dark:text-blue-300">
                        Verified Instructor
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        This instructor has been verified by SteppersLife for
                        their expertise and teaching credentials.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
