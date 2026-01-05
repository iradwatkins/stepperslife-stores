"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  ChefHat,
  UtensilsCrossed,
  Clock,
  DollarSign,
  Users,
  Star,
  Check,
  ArrowRight,
  Smartphone,
  TrendingUp,
  ShoppingBag,
  Bell,
  CreditCard,
  MapPin,
  Flame,
  Heart,
  Zap,
} from "lucide-react";

// Floating food icons animation
const FloatingFoodIcons = () => {
  const icons = [
    { icon: "🍗", delay: 0, x: "10%", y: "20%" },
    { icon: "🥘", delay: 0.5, x: "80%", y: "15%" },
    { icon: "🍖", delay: 1, x: "15%", y: "70%" },
    { icon: "🥧", delay: 1.5, x: "85%", y: "65%" },
    { icon: "🍝", delay: 2, x: "50%", y: "10%" },
    { icon: "🥗", delay: 2.5, x: "25%", y: "45%" },
    { icon: "🍰", delay: 3, x: "75%", y: "40%" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map((item, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl md:text-6xl opacity-20"
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0.1, 0.3, 0.1],
            scale: [0.8, 1.2, 0.8],
            y: [0, -30, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 6,
            delay: item.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {item.icon}
        </motion.div>
      ))}
    </div>
  );
};

// Steam animation for food
const SteamAnimation = () => {
  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-8 bg-gradient-to-t from-white/30 to-transparent rounded-full"
          style={{ left: `${i * 12 - 12}px` }}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.6, 0],
            y: [-10, -40],
            scaleX: [1, 1.5, 0.5],
          }}
          transition={{
            duration: 2,
            delay: i * 0.3,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};

export default function RestaurantsFeaturesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.3]);

  // Fetch real restaurants
  const restaurants = useQuery(api.restaurants.getAll, {});

  const stats = [
    { value: "50+", label: "Active Restaurants", icon: ChefHat },
    { value: "$2M+", label: "Orders Processed", icon: DollarSign },
    { value: "15K+", label: "Happy Customers", icon: Users },
    { value: "4.9", label: "Average Rating", icon: Star },
  ];

  const features = [
    {
      icon: UtensilsCrossed,
      title: "Your Menu, Always Up to Date",
      description:
        "86'd the ribs? Update your menu in seconds. Customers always see what's available.",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: ShoppingBag,
      title: "Orders Come to You",
      description:
        "No more phone tag. Customers order online, you just cook.",
      color: "from-yellow-500 to-orange-500",
    },
    {
      icon: Clock,
      title: "Catering Made Simple",
      description:
        "Big event orders? Pre-orders for the weekend? Handled automatically.",
      color: "from-green-500 to-teal-500",
    },
    {
      icon: CreditCard,
      title: "Money in Your Account—Fast",
      description:
        "Accept cards, Apple Pay, all of it. Cash hits your bank quick.",
      color: "from-blue-500 to-purple-500",
    },
    {
      icon: Bell,
      title: "Never Miss an Order",
      description:
        "New order? Your phone buzzes. No more missed sales or confused customers.",
      color: "from-pink-500 to-rose-500",
    },
    {
      icon: TrendingUp,
      title: "Know What's Selling",
      description:
        "See your bestsellers. Spot slow movers. Make smarter menu decisions.",
      color: "from-indigo-500 to-blue-500",
    },
  ];

  const orderFlow = [
    {
      step: "1",
      title: "Customer Orders",
      description: "Customer browses your menu and places an order online",
      icon: Smartphone,
    },
    {
      step: "2",
      title: "You Get Notified",
      description: "Receive instant notification with order details",
      icon: Bell,
    },
    {
      step: "3",
      title: "Prepare & Serve",
      description: "Mark as preparing, ready, and complete when done",
      icon: ChefHat,
    },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section */}
      <motion.section
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=80"
            alt="Soul food platter with fried chicken"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/10 to-transparent" />
        </div>

        <FloatingFoodIcons />

        {/* Animated Background Pattern */}
        <div className="absolute inset-0">
          {/* Warm glow circles */}
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full bg-yellow-400/20 blur-3xl"
            animate={{
              x: ["-25%", "25%", "-25%"],
              y: ["-25%", "25%", "-25%"],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            style={{ left: "20%", top: "20%" }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full bg-red-400/20 blur-3xl"
            animate={{
              x: ["25%", "-25%", "25%"],
              y: ["25%", "-25%", "25%"],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            style={{ right: "20%", bottom: "20%" }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-5xl mx-auto"
          >
            {/* Animated plate icon */}
            <motion.div
              className="relative inline-block mb-8"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            >
              <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center relative">
                <ChefHat className="w-16 h-16 text-white" />
                <SteamAnimation />
              </div>
              <motion.div
                className="absolute -inset-4 rounded-full border-2 border-white/20"
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            <motion.h1
              className="text-5xl md:text-7xl font-bold text-white mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Fill Your Kitchen with{" "}
              <span className="relative">
                <span className="text-yellow-300">Orders—Not Stress</span>
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-yellow-300 rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                />
              </span>
            </motion.h1>

            <motion.p
              className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Customers order from their phones. You get notified instantly. Just cook and serve.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link href="/restaurants/apply">
                <motion.button
                  className="px-8 py-4 bg-white text-orange-600 rounded-full font-bold text-lg shadow-2xl flex items-center gap-2 mx-auto sm:mx-0"
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Flame className="w-5 h-5" />
                  Start Selling Today
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link href="/restaurants">
                <motion.button
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-full font-bold text-lg flex items-center gap-2 mx-auto sm:mx-0"
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.2)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  Browse Restaurants
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/50 flex justify-center pt-2">
            <motion.div
              className="w-1.5 h-1.5 bg-white rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </motion.section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <stat.icon className="w-8 h-8 text-white" />
                </motion.div>
                <motion.div
                  className="text-4xl md:text-5xl font-bold text-foreground mb-2"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 100, delay: index * 0.1 + 0.3 }}
                >
                  {stat.value}
                </motion.div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Restaurants Section */}
      {restaurants && restaurants.length > 0 && (
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Featured <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Restaurants</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Discover amazing soul food from our partner restaurants
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {restaurants.slice(0, 4).map((restaurant, index) => (
                <motion.div
                  key={restaurant._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <Link href={`/restaurants/${restaurant.slug || restaurant._id}`}>
                    <div className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-border h-full">
                      {/* Restaurant Image */}
                      <div className="relative h-40 overflow-hidden">
                        <Image
                          src={restaurant.coverImageUrl || restaurant.logoUrl || "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80"}
                          alt={restaurant.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute top-3 right-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            restaurant.acceptingOrders ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                          }`}>
                            {restaurant.acceptingOrders ? "Open" : "Closed"}
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-white font-bold line-clamp-1">{restaurant.name}</p>
                        </div>
                      </div>

                      {/* Restaurant Details */}
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="line-clamp-1">{restaurant.cuisine || "Soul Food"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-orange-500 font-semibold flex items-center gap-1">
                            <Star className="w-4 h-4 fill-current" /> 4.9
                          </span>
                          <span className="text-sm text-muted-foreground">Order Now</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <Link
                href="/restaurants"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:opacity-90 transition-all"
              >
                View All Restaurants
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              From Phone Calls to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                Phone Orders
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stop missing calls. Start stacking orders.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative"
              >
                <motion.div
                  className="bg-card rounded-2xl p-8 shadow-lg border border-border h-full overflow-hidden relative"
                  whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Gradient overlay on hover */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 transition-opacity duration-300`}
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 0.05 }}
                  />

                  <motion.div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 relative z-10`}
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <feature.icon className="w-7 h-7 text-white" />
                  </motion.div>

                  <h3 className="text-xl font-bold text-foreground mb-3 relative z-10">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground relative z-10">{feature.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Simple Order Flow
            </h2>
            <p className="text-xl text-muted-foreground">
              From order to served in three easy steps
            </p>
          </motion.div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
            {orderFlow.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="flex items-center"
              >
                <motion.div
                  className="bg-card rounded-2xl p-8 shadow-xl border border-border text-center w-full md:w-72"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.div
                    className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center relative"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <item.icon className="w-10 h-10 text-white" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm">
                      {item.step}
                    </div>
                  </motion.div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </motion.div>

                {index < orderFlow.length - 1 && (
                  <motion.div
                    className="hidden md:block"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                  >
                    <ArrowRight className="w-8 h-8 text-orange-500 mx-4" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Preview Section */}
      <section className="py-24 bg-background overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Beautiful Menus That{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  Sell
                </span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Showcase your dishes with stunning photos, detailed descriptions,
                and easy-to-navigate categories. Your menu updates in real-time.
              </p>

              <ul className="space-y-4">
                {[
                  "Unlimited menu items and categories",
                  "High-quality photo uploads",
                  "Dietary labels and allergen info",
                  "Daily specials and limited items",
                  "Bulk pricing for catering",
                ].map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              {/* Mock menu card */}
              <motion.div
                className="bg-card rounded-3xl shadow-2xl border border-border overflow-hidden"
                whileHover={{ y: -10 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <div className="h-48 relative">
                  <Image
                    src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80"
                    alt="Soul food restaurant"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3">
                      <h3 className="text-white font-bold text-lg">Soul Kitchen</h3>
                      <div className="flex items-center gap-2 text-white/80 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>Chicago, IL</span>
                        <Star className="w-4 h-4 text-yellow-400 ml-2" />
                        <span>4.9</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { name: "Fried Chicken Dinner", price: "$15.99", popular: true, image: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=100&q=80" },
                    { name: "Mac & Cheese", price: "$6.99", popular: false, image: "https://images.unsplash.com/photo-1612152328957-56e1a4d8a6f9?w=100&q=80" },
                    { name: "Collard Greens", price: "$5.99", popular: true, image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=100&q=80" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden relative">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          {item.popular && (
                            <span className="text-xs text-orange-500 flex items-center gap-1">
                              <Flame className="w-3 h-3" /> Popular
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-foreground">{item.price}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Floating badges */}
              <motion.div
                className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg font-bold"
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", delay: 0.5 }}
                animate={{ y: [0, -5, 0] }}
              >
                Open Now
              </motion.div>

              <motion.div
                className="absolute -bottom-4 -left-4 bg-card border border-border shadow-xl rounded-2xl p-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">New Order!</p>
                    <p className="text-xs text-muted-foreground">Just now</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gradient-to-br from-orange-600 via-red-600 to-amber-600 relative overflow-hidden">
        <FloatingFoodIcons />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Zero Monthly Fees. Ever.
            </h2>
            <p className="text-xl text-white/80">
              You only pay when customers order. That's it.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-lg mx-auto"
          >
            <motion.div
              className="bg-white rounded-3xl p-8 shadow-2xl text-center"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-1 rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Commission-Based
              </div>

              <div className="mb-6">
                <span className="text-6xl font-bold text-gray-900">5%</span>
                <span className="text-xl text-gray-500 ml-2">per order</span>
              </div>

              <p className="text-gray-600 mb-8">
                That's it. No setup fees, no monthly charges. Just a small percentage
                when customers order from you.
              </p>

              <ul className="text-left space-y-3 mb-8">
                {[
                  "Unlimited menu items",
                  "Online ordering system",
                  "Real-time order notifications",
                  "Customer reviews & ratings",
                  "Sales analytics dashboard",
                  "Stripe payment processing",
                  "24/7 customer support",
                ].map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </motion.li>
                ))}
              </ul>

              <Link href="/restaurants/apply">
                <motion.button
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-lg shadow-lg"
                  whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(234,88,12,0.4)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  Apply Now - It's Free
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div
              className="flex justify-center gap-1 mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: "spring" }}
                >
                  <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
                </motion.div>
              ))}
            </motion.div>

            <blockquote className="text-2xl md:text-3xl font-medium text-foreground mb-8 leading-relaxed">
              "SteppersLife transformed our catering business. We went from taking phone orders
              to a professional online presence overnight. Our orders have{" "}
              <span className="text-orange-500 font-bold">doubled in just 3 months</span>."
            </blockquote>

            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <ChefHat className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-foreground">Chef Marcus Williams</p>
                <p className="text-muted-foreground">Soul Kitchen Chicago</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-orange-900 to-red-900 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute w-96 h-96 rounded-full bg-orange-500/20 blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            style={{ left: "10%", top: "20%" }}
          />
          <motion.div
            className="absolute w-80 h-80 rounded-full bg-red-500/20 blur-3xl"
            animate={{
              x: [0, -100, 0],
              y: [0, -50, 0],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            style={{ right: "10%", bottom: "20%" }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-6 py-2 rounded-full mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Heart className="w-5 h-5 text-red-400" />
              <span className="text-white font-medium">Join Our Growing Community</span>
            </motion.div>

            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Ready to Stop Missing Orders?
            </h2>
            <p className="text-xl text-white/80 mb-10">
              While you're reading this, someone is hungry and looking for food like yours.
              Let them find you.
            </p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Link href="/restaurants/apply">
                <motion.button
                  className="px-10 py-5 bg-white text-orange-600 rounded-full font-bold text-lg shadow-2xl flex items-center gap-3 mx-auto sm:mx-0"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 20px 40px rgba(255,255,255,0.3)",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ChefHat className="w-6 h-6" />
                  Start Cooking Up Orders
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </motion.div>

            <p className="text-white/60 mt-6 text-sm">
              Free to apply • No monthly fees • 5% commission only when you sell
            </p>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
