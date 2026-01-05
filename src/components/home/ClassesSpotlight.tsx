"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, Calendar, MapPin, Clock } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// Type for class-specific fields that extend the base Event type
interface ClassExtensions {
  level?: string;
  instructorName?: string;
  instructorPhoto?: string;
  schedule?: string;
  duration?: string;
}

export function ClassesSpotlight() {
  // Fetch real classes from Convex
  const classes = useQuery(api.public.queries.getPublishedClasses, {});
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  // Loading state
  if (classes === undefined) {
    return (
      <section ref={sectionRef} className="bg-background py-16 overflow-hidden">
        <div className="container px-4 mx-auto">
          <div className="mb-10">
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-80 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Empty state - no classes available
  if (!classes || classes.length === 0) {
    return (
      <section ref={sectionRef} className="bg-background py-16 overflow-hidden">
        <div className="container px-4 mx-auto">
          <motion.div
            className="text-center py-12 bg-muted/30 rounded-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            </motion.div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Classes</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              No classes are currently scheduled. Check back soon for upcoming dance classes and workshops.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/classes"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <GraduationCap className="w-5 h-5" />
                Browse Classes
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="bg-background py-16 overflow-hidden">
      <div className="container px-4 mx-auto">
        <motion.div
          className="mb-10 flex flex-wrap items-start justify-between gap-4"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex-1 min-w-[250px]">
            <motion.h2
              className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground"
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
              transition={{ duration: 0.6 }}
            >
              Classes
            </motion.h2>
            <motion.p
              className="mt-2 text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Master Chicago Steppin with expert-led classes
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button asChild variant="outline" className="flex-shrink-0">
              <Link href="/classes">Browse All Classes</Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {classes.slice(0, 6).map((classItem, index) => (
            <motion.div
              key={classItem._id}
              variants={cardVariants}
              custom={index}
            >
              <Link
                href={`/classes/${classItem._id}`}
                className="group block h-full"
              >
                <motion.article
                  className="overflow-hidden rounded-lg border bg-card h-full"
                  whileHover={{
                    y: -8,
                    boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {classItem.imageUrl ? (
                      <Image
                        src={classItem.imageUrl}
                        alt={classItem.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <GraduationCap className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                    {/* Level Badge */}
                    {(classItem as unknown as ClassExtensions).level && (
                      <motion.div
                        className="absolute left-3 top-3"
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", delay: 0.2 + index * 0.1 }}
                      >
                        <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                          {(classItem as unknown as ClassExtensions).level}
                        </span>
                      </motion.div>
                    )}
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                      <span className="text-white font-medium text-sm">View class details</span>
                    </div>
                  </div>

                  <div className="p-5">
                    {/* Instructor */}
                    {(classItem as unknown as ClassExtensions).instructorName && (
                      <motion.div
                        className="mb-3 flex items-center gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                      >
                        <div className="relative h-8 w-8 overflow-hidden rounded-full ring-2 ring-primary/20 bg-muted flex items-center justify-center">
                          {(classItem as unknown as ClassExtensions).instructorPhoto ? (
                            <Image
                              src={(classItem as unknown as ClassExtensions).instructorPhoto!}
                              alt={(classItem as unknown as ClassExtensions).instructorName!}
                              fill
                              sizes="32px"
                              className="object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-xs font-medium">
                              {(classItem as unknown as ClassExtensions).instructorName!.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-card-foreground">
                          {(classItem as unknown as ClassExtensions).instructorName}
                        </span>
                      </motion.div>
                    )}

                    <h3 className="mb-2 text-xl font-bold text-card-foreground group-hover:text-primary transition-colors">
                      {classItem.name}
                    </h3>
                    {classItem.description && (
                      <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                        {classItem.description}
                      </p>
                    )}

                    <div className="mb-4 space-y-2 text-sm">
                      {/* Schedule info */}
                      {(classItem as unknown as ClassExtensions).schedule && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{(classItem as unknown as ClassExtensions).schedule}</span>
                        </div>
                      )}
                      {/* Location */}
                      {classItem.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="line-clamp-1">
                            {typeof classItem.location === "string"
                              ? classItem.location
                              : `${classItem.location.city}, ${classItem.location.state}`}
                          </span>
                        </div>
                      )}
                      {/* Duration */}
                      {(classItem as unknown as ClassExtensions).duration && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{(classItem as unknown as ClassExtensions).duration}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      {classItem.price !== undefined && (
                        <motion.span
                          className="text-2xl font-bold text-card-foreground"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                        >
                          {classItem.price === 0 ? "Free" : `$${(classItem.price / 100).toFixed(2)}`}
                        </motion.span>
                      )}
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button size="sm">View Details</Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.article>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
