"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { format } from "date-fns";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  Calendar,
  BookOpen,
  Utensils,
  ShoppingBag,
  Ticket,
  Users,
  DollarSign,
  QrCode,
  CreditCard,
  BarChart3,
  Bell,
  Globe,
  Smartphone,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
  TrendingUp,
  Clock,
  MapPin,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Hero slides data
const heroSlides = [
  {
    image: "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=1920&q=80",
    title: "Fill Every Seat, Every Time",
    subtitle: "Stop worrying about door chaos—sell tickets online and scan guests in seconds",
    cta: "Create Event",
    href: "/organizer/events/create",
    accent: "primary",
  },
  {
    image: "https://images.unsplash.com/photo-1547153760-18fc86324498?w=1920&q=80",
    title: "Turn Your Passion Into Steady Income",
    subtitle: "Get paid automatically while you focus on what you love—teaching",
    cta: "Start Teaching",
    href: "/organizer/classes/create",
    accent: "warning",
  },
  {
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=80",
    title: "More Orders, Less Hassle",
    subtitle: "Customers order from their phones. You just cook.",
    cta: "List Restaurant",
    href: "/restaurants/apply",
    accent: "success",
  },
  {
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80",
    title: "Reach Thousands of Ready Buyers",
    subtitle: "Your products in front of customers who actually want them",
    cta: "Open Store",
    href: "/vendor/apply",
    accent: "purple",
  },
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function FeaturesPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Fetch real data from database
  const upcomingEvents = useQuery(api.public.queries.getUpcomingEvents, { limit: 4 });
  const upcomingClasses = useQuery(api.public.queries.getPublishedClasses, { includePast: false });
  const restaurants = useQuery(api.restaurants.getAll, {});

  // Helper to get image URL from event/class
  // Uses self-hosted Convex at convex.toolboxhosting.com
  const getImageUrl = (item: { imageUrl?: string; images?: string[] } | undefined) => {
    if (!item) return null;
    // Use pre-resolved imageUrl if available (already absolute URL from query)
    if (item.imageUrl) return item.imageUrl;
    // For storage IDs, construct URL to self-hosted Convex
    if (item.images && item.images[0]) {
      return `https://convex.toolboxhosting.com/api/storage/${item.images[0]}`;
    }
    return null;
  };

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  return (
    <>
      <PublicHeader />

      {/* Hero Slider Section */}
      <section className="relative h-[600px] md:h-[700px] overflow-hidden">
        {/* Background Images */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0"
          >
            <Image
              src={heroSlides[currentSlide].image}
              alt={heroSlides[currentSlide].title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Content */}
        <div className="container mx-auto px-4 h-full flex items-center relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl text-white"
            >
              <motion.h1
                className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {heroSlides[currentSlide].title}
              </motion.h1>
              <motion.p
                className="text-xl md:text-2xl text-white/90 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {heroSlides[currentSlide].subtitle}
              </motion.p>
              <motion.div
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Link
                  href={heroSlides[currentSlide].href}
                  className={`px-8 py-4 font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center gap-2 ${
                    heroSlides[currentSlide].accent === "primary" ? "bg-primary hover:bg-primary/90" :
                    heroSlides[currentSlide].accent === "warning" ? "bg-warning hover:bg-warning/90" :
                    heroSlides[currentSlide].accent === "success" ? "bg-success hover:bg-success/90" :
                    "bg-purple-500 hover:bg-purple-600"
                  } text-white`}
                >
                  {heroSlides[currentSlide].cta}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="#products"
                  className="px-8 py-4 bg-white/10 backdrop-blur text-white font-bold rounded-lg hover:bg-white/20 transition-all border border-white/30"
                >
                  Explore Features
                </Link>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-20"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-20"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {heroSlides.map((slide, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`transition-all ${
                index === currentSlide
                  ? "w-8 h-3 bg-white rounded-full"
                  : "w-3 h-3 bg-white/50 rounded-full hover:bg-white/70"
              }`}
            />
          ))}
        </div>

        {/* Slide Labels */}
        <div className="absolute bottom-8 right-8 hidden md:flex gap-2 z-20">
          {heroSlides.map((slide, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                index === currentSlide
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {index === 0 ? "Events" : index === 1 ? "Classes" : index === 2 ? "Food" : "Shop"}
            </button>
          ))}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 bg-muted border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: "1000+", label: "Events Hosted" },
              { number: "50K+", label: "Tickets Sold" },
              { number: "500+", label: "Active Instructors" },
              { number: "99.9%", label: "Uptime" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <p className="text-3xl md:text-4xl font-bold text-primary">{stat.number}</p>
                <p className="text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Succeed—All in One Place
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stop juggling multiple apps. Run your entire business from one dashboard.
            </p>
          </motion.div>

          {/* Events Product */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-24"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground">Events & Ticketing</h3>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  Sell tickets, manage attendees, and grow your events with professional tools designed for the stepping community.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    { icon: Ticket, text: "Sell tickets 24/7—even while you sleep" },
                    { icon: QrCode, text: "No more clipboards—scan guests in 2 seconds flat" },
                    { icon: Users, text: "Let your team sell for you and track every dollar automatically" },
                    { icon: CreditCard, text: "Get paid your way—customers choose how to pay" },
                    { icon: BarChart3, text: "Know exactly how your event is selling, right now" },
                    { icon: Bell, text: "Never chase down tickets again—they're sent automatically" },
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-4 h-4 text-success" />
                      </div>
                      <span className="text-foreground">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/organizer/events/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                  >
                    Create Your Event
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/events/pricing"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-semibold"
                  >
                    View Pricing
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-4 overflow-hidden">
                  {/* 4-Item Event Grid - Show real events */}
                  <div className="grid grid-cols-2 gap-4">
                    {(upcomingEvents?.slice(0, 4) || []).map((event, index) => (
                      <Link
                        key={event._id || index}
                        href={`/events/${event._id}`}
                        className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                      >
                        <div className="relative h-32">
                          <Image
                            src={getImageUrl(event) || "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=400&q=80"}
                            alt={event.name}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-white font-semibold text-sm line-clamp-1">{event.name}</p>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {event.eventDateLiteral || (event.startDate
                              ? format(new Date(event.startDate), "EEE, MMM d • h:mma")
                              : "Coming Soon")}
                          </p>
                          <p className="text-xs text-primary font-medium mt-1">
                            {event.ticketsSold || 0} tickets sold
                          </p>
                        </div>
                      </Link>
                    ))}
                    {/* Fallback cards if no events */}
                    {(!upcomingEvents || upcomingEvents.length === 0) && (
                      <>
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="bg-card rounded-lg overflow-hidden shadow-md animate-pulse">
                            <div className="h-32 bg-muted" />
                            <div className="p-3 space-y-2">
                              <div className="h-3 bg-muted rounded w-3/4" />
                              <div className="h-3 bg-muted rounded w-1/2" />
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    <Link
                      href="/events"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View all events <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Classes Product */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-24"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="bg-gradient-to-br from-warning/5 to-warning/10 rounded-2xl p-4 overflow-hidden">
                  {/* 4-Item Class Grid - Show real classes */}
                  <div className="grid grid-cols-2 gap-4">
                    {(upcomingClasses?.slice(0, 4) || []).map((classItem, index) => (
                      <Link
                        key={classItem._id || index}
                        href={`/classes/${classItem._id}`}
                        className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                      >
                        <div className="relative h-32">
                          <Image
                            src={getImageUrl(classItem) || "https://images.unsplash.com/photo-1547153760-18fc86324498?w=400&q=80"}
                            alt={classItem.name}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute top-2 left-2">
                            <span className="bg-warning text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                              {classItem.categories?.[0] || "Class"}
                            </span>
                          </div>
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-white font-semibold text-sm line-clamp-1">{classItem.name}</p>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {classItem.classDays && classItem.classDays.length > 0
                              ? `Every ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][classItem.classDays[0]]}`
                              : classItem.eventDateLiteral || "Ongoing"}
                          </p>
                          <p className="text-xs text-warning font-medium mt-1">
                            {classItem.ticketsSold || 0}/{classItem.capacity || "∞"} enrolled
                          </p>
                        </div>
                      </Link>
                    ))}
                    {/* Fallback cards if no classes */}
                    {(!upcomingClasses || upcomingClasses.length === 0) && (
                      <>
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="bg-card rounded-lg overflow-hidden shadow-md animate-pulse">
                            <div className="h-32 bg-muted" />
                            <div className="p-3 space-y-2">
                              <div className="h-3 bg-muted rounded w-3/4" />
                              <div className="h-3 bg-muted rounded w-1/2" />
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    <Link
                      href="/classes"
                      className="text-sm text-warning hover:underline inline-flex items-center gap-1"
                    >
                      View all classes <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-warning" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground">Dance Classes</h3>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  Teach stepping, line dancing, or walking classes. Manage enrollments, track attendance, and build your student community.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    { icon: Calendar, text: "Set it once, students know exactly when to show up" },
                    { icon: Users, text: "No more chasing payments—get paid when students sign up" },
                    { icon: DollarSign, text: "You're in control—charge what you're worth" },
                    { icon: Bell, text: "Empty classes? Not anymore—reminders sent automatically" },
                    { icon: MapPin, text: "Students find you easily—no more lost dancers" },
                    { icon: Star, text: "Let happy students sell your classes for you" },
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-4 h-4 text-warning" />
                      </div>
                      <span className="text-foreground">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/organizer/classes/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-warning text-white rounded-lg hover:bg-warning/90 transition-colors font-semibold"
                  >
                    Start Teaching
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/classes"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-semibold"
                  >
                    Browse Classes
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Restaurant Product */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-24"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                    <Utensils className="w-6 h-6 text-success" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground">Soul Food & Catering</h3>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  Run your restaurant or catering business with online ordering, menu management, and seamless payment processing.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    { icon: Smartphone, text: "Customers order from their couch—you just cook" },
                    { icon: Clock, text: "See orders the second they come in" },
                    { icon: DollarSign, text: "Keep more of what you earn—no hidden fees" },
                    { icon: Bell, text: "Never miss an order—get alerts on your phone" },
                    { icon: BarChart3, text: "Know what's selling and what's not" },
                    { icon: Users, text: "Turn first-timers into regulars automatically" },
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-4 h-4 text-success" />
                      </div>
                      <span className="text-foreground">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/restaurants/apply"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-semibold"
                  >
                    List Your Restaurant
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/restaurants/pricing"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-semibold"
                  >
                    View Pricing
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div className="bg-gradient-to-br from-success/5 to-success/10 rounded-2xl p-4 overflow-hidden">
                  {/* 4-Item Restaurant Grid - Show real restaurants */}
                  <div className="grid grid-cols-2 gap-4">
                    {(restaurants?.slice(0, 4) || []).map((restaurant, index) => (
                      <Link
                        key={restaurant._id || index}
                        href={`/restaurants/${restaurant.slug || restaurant._id}`}
                        className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                      >
                        <div className="relative h-32">
                          <Image
                            src={restaurant.coverImageUrl || restaurant.logoUrl || "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&q=80"}
                            alt={restaurant.name}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute top-2 right-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              restaurant.acceptingOrders ? "bg-success text-white" : "bg-muted text-muted-foreground"
                            }`}>
                              {restaurant.acceptingOrders ? "Open" : "Closed"}
                            </span>
                          </div>
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-white font-semibold text-sm line-clamp-1">{restaurant.name}</p>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {restaurant.cuisine || "Soul Food"}
                          </p>
                          <p className="text-xs text-success font-medium mt-1 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" /> 4.9
                          </p>
                        </div>
                      </Link>
                    ))}
                    {/* Fallback cards if no restaurants */}
                    {(!restaurants || restaurants.length === 0) && (
                      <>
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="bg-card rounded-lg overflow-hidden shadow-md animate-pulse">
                            <div className="h-32 bg-muted" />
                            <div className="p-3 space-y-2">
                              <div className="h-3 bg-muted rounded w-3/4" />
                              <div className="h-3 bg-muted rounded w-1/2" />
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    <Link
                      href="/restaurants"
                      className="text-sm text-success hover:underline inline-flex items-center gap-1"
                    >
                      View all restaurants <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Marketplace Product */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-2xl p-4 overflow-hidden">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: "Steppin Hoodie", price: "$59.99", sold: "124 sold", image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=200&q=80" },
                      { name: "Dance Heels", price: "$89.99", sold: "87 sold", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=200&q=80" },
                      { name: "Silk Dress", price: "$129.99", sold: "256 sold", image: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=200&q=80" },
                      { name: "Gold Earrings", price: "$45.99", sold: "63 sold", image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=200&q=80" },
                    ].map((product, index) => (
                      <div key={index} className="bg-card rounded-lg p-3 shadow-md">
                        <div className="w-full h-24 rounded mb-3 overflow-hidden relative">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <h5 className="font-medium text-foreground text-sm">{product.name}</h5>
                        <p className="text-purple-500 font-bold">{product.price}</p>
                        <p className="text-xs text-muted-foreground">{product.sold}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground">Marketplace</h3>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  Sell merchandise, apparel, dance supplies, and more. Reach the entire stepping community with your products.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    { icon: Globe, text: "Get in front of customers who already love what you sell" },
                    { icon: CreditCard, text: "Safe transactions for you and your customers" },
                    { icon: DollarSign, text: "Keep 95% of every sale you make" },
                    { icon: BarChart3, text: "Never oversell—know exactly what's in stock" },
                    { icon: Bell, text: "Ship with confidence—track every order" },
                    { icon: Shield, text: "Stand out as a verified, trusted seller" },
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-4 h-4 text-purple-500" />
                      </div>
                      <span className="text-foreground">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/vendor/apply"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold"
                  >
                    Open Your Store
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/marketplace"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-semibold"
                  >
                    Browse Products
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why SteppersLife Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose SteppersLife?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built by steppers, for steppers. We understand your community because we&apos;re part of it.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Heart,
                title: "Built By Steppers, For Steppers",
                description: "We don't just understand your community—we're part of it.",
              },
              {
                icon: DollarSign,
                title: "Keep More of What You Earn",
                description: "No surprises. You see exactly what you pay before you pay it.",
              },
              {
                icon: Zap,
                title: "Up and Running in Minutes",
                description: "If you can use Facebook, you can use this. Seriously.",
              },
              {
                icon: Shield,
                title: "Never Miss a Sale",
                description: "99.9% uptime means your business never sleeps.",
              },
              {
                icon: Smartphone,
                title: "Sell From Anywhere",
                description: "Take payments at the set, manage orders from your car.",
              },
              {
                icon: Users,
                title: "Your Success Is Our Success",
                description: "We only win when you win—that's how we built it.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Loved by the Community
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "SteppersLife changed my business. I went from paper tickets to selling out events online. The QR scanning at the door is a game changer!",
                author: "Marcus T.",
                role: "Event Promoter, Chicago",
              },
              {
                quote: "Managing my dance classes used to be a headache. Now students register online, pay automatically, and I just focus on teaching.",
                author: "Lisa M.",
                role: "Stepping Instructor, Atlanta",
              },
              {
                quote: "The marketplace let me turn my custom steppin apparel from a hobby into a real business. Orders come in from all over!",
                author: "Darnell W.",
                role: "Vendor, Detroit",
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl p-6 shadow-sm border"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-warning fill-current" />
                  ))}
                </div>
                <p className="text-foreground mb-6 italic">&ldquo;{testimonial.quote}&rdquo;</p>
                <div>
                  <p className="font-bold text-foreground">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Grow Your Business?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join hundreds of organizers, instructors, and vendors who are building their businesses on SteppersLife.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="px-8 py-4 bg-warning text-white font-bold rounded-lg hover:bg-warning/90 transition-all transform hover:scale-105 shadow-lg"
              >
                Get Started Free
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 bg-white/10 backdrop-blur text-white font-bold rounded-lg hover:bg-white/20 transition-all border border-white/30"
              >
                Contact Sales
              </Link>
            </div>
            <p className="mt-6 text-white/70 text-sm">
              No credit card required. Free to start.
            </p>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </>
  );
}
