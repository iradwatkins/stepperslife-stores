"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Clock, Star, UtensilsCrossed } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef, useMemo } from "react";

export function RestaurantsShowcase() {
  const convexRestaurants = useQuery(api.restaurants.getFeatured);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  // Transform Convex data to component format
  const restaurants = useMemo(() => {
    if (!convexRestaurants) return [];
    return convexRestaurants.map((r) => ({
      id: r._id,
      slug: r.slug,
      name: r.name,
      description: r.description || "",
      cuisine: r.cuisine,
      logoUrl: r.logoUrl || "",
      coverImageUrl: r.coverImageUrl || "",
      acceptingOrders: r.acceptingOrders,
      estimatedPickupTime: r.estimatedPickupTime,
      averageRating: 4.5,
      totalReviews: 0,
    }));
  }, [convexRestaurants]);

  // Loading state
  if (convexRestaurants === undefined) {
    return (
      <section ref={sectionRef} className="bg-muted/30 py-16 overflow-hidden">
        <div className="container px-4 mx-auto">
          <div className="mb-10">
            <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-80 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-72 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Empty state - no restaurants available
  if (restaurants.length === 0) {
    return (
      <section ref={sectionRef} className="bg-muted/30 py-16 overflow-hidden">
        <div className="container px-4 mx-auto">
          <motion.div
            className="text-center py-12 bg-background rounded-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <UtensilsCrossed className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            </motion.div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Restaurants</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              No restaurants are currently available. Check back soon for local dining options.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/restaurants"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <UtensilsCrossed className="w-5 h-5" />
                View Restaurants
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    );
  }

  return <RestaurantsShowcaseContent restaurants={restaurants} />;
}

// Shared content component
interface Restaurant {
  id: string;
  slug: string;
  name: string;
  description: string;
  cuisine: string[];
  logoUrl: string;
  coverImageUrl: string;
  acceptingOrders: boolean;
  estimatedPickupTime: number;
  averageRating: number;
  totalReviews: number;
}

function RestaurantsShowcaseContent({ restaurants }: { restaurants: Restaurant[] }) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  return (
    <section ref={sectionRef} className="bg-muted/30 py-16 overflow-hidden">
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
              Order from Local Restaurants
            </motion.h2>
            <motion.p
              className="mt-2 text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Support Chicago&apos;s best restaurants - pickup available now
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
              <Link href="/restaurants">View All Restaurants</Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {restaurants.map((restaurant, index) => (
            <motion.div
              key={restaurant.id}
              variants={cardVariants}
              custom={index}
            >
              <Link
                href={`/restaurants/${restaurant.slug}`}
                className="group block h-full"
              >
                <motion.article
                  className="overflow-hidden rounded-lg border bg-card h-full"
                  whileHover={{
                    y: -8,
                    boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)",
                    rotateY: 2,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {restaurant.coverImageUrl ? (
                      <Image
                        src={restaurant.coverImageUrl}
                        alt={restaurant.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UtensilsCrossed className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {!restaurant.acceptingOrders && (
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center bg-foreground/60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <span className="rounded-full bg-background px-3 py-1 text-sm font-semibold">
                          Currently Closed
                        </span>
                      </motion.div>
                    )}
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  <div className="p-4">
                    <h3 className="mb-2 text-lg font-bold text-card-foreground group-hover:text-primary transition-colors">
                      {restaurant.name}
                    </h3>

                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {restaurant.description}
                    </p>

                    <motion.div
                      className="mb-3 flex flex-wrap gap-1"
                      initial={{ opacity: 0 }}
                      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                    >
                      {restaurant.cuisine.slice(0, 2).map((cuisine) => (
                        <motion.span
                          key={cuisine}
                          className="rounded-full bg-muted px-2 py-1 text-xs"
                          whileHover={{ scale: 1.05, backgroundColor: "var(--primary)", color: "white" }}
                        >
                          {cuisine}
                        </motion.span>
                      ))}
                    </motion.div>

                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 5 }}
                        >
                          <Star className="h-3 w-3 fill-warning text-warning" />
                        </motion.div>
                        <span className="font-medium">
                          {restaurant.averageRating}
                        </span>
                        <span>({restaurant.totalReviews} reviews)</span>
                      </div>
                      {restaurant.acceptingOrders && (
                        <motion.div
                          className="flex items-center gap-2"
                          initial={{ opacity: 0, x: -10 }}
                          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                          transition={{ delay: 0.5 + index * 0.05 }}
                        >
                          <Clock className="h-3 w-3" />
                          <span>{restaurant.estimatedPickupTime} min pickup</span>
                        </motion.div>
                      )}
                    </div>

                    {restaurant.acceptingOrders && (
                      <motion.div
                        className="mt-4"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button className="w-full" size="sm">
                          <UtensilsCrossed className="mr-2 h-4 w-4" />
                          Order Now
                        </Button>
                      </motion.div>
                    )}
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
