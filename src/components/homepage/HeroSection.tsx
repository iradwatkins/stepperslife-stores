'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
      <div className="container mx-auto px-4 py-16 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Column - Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col justify-center"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your Community,
              <span className="block text-primary">All in One Place</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Discover events, shop local vendors, find classes, and explore restaurants -
              all in one unified platform built for your community.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/events"
                className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Explore Events
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Browse Marketplace
              </Link>
            </div>
          </motion.div>

          {/* Right Column - Decorative Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Decorative Cards */}
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="space-y-4"
              >
                <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-6 backdrop-blur-sm border border-border/50">
                  <div className="text-3xl font-bold">500+</div>
                  <div className="text-sm text-muted-foreground">Events</div>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 dark:from-green-500/30 dark:to-green-600/15 p-6 backdrop-blur-sm border border-border/50">
                  <div className="text-3xl font-bold">200+</div>
                  <div className="text-sm text-muted-foreground">Vendors</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mt-12 space-y-4"
              >
                <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-6 backdrop-blur-sm border border-border/50">
                  <div className="text-3xl font-bold">100+</div>
                  <div className="text-sm text-muted-foreground">Classes</div>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 dark:from-orange-500/30 dark:to-orange-600/15 p-6 backdrop-blur-sm border border-border/50">
                  <div className="text-3xl font-bold">50+</div>
                  <div className="text-sm text-muted-foreground">Restaurants</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
