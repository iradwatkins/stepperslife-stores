"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  Store,
  ShoppingBag,
  Package,
  DollarSign,
  Users,
  Star,
  Check,
  ArrowRight,
  Truck,
  TrendingUp,
  Shield,
  CreditCard,
  Tag,
  Sparkles,
  Heart,
  Zap,
  BarChart3,
  Gift,
  Palette,
} from "lucide-react";

// Floating product cards animation
const FloatingProducts = () => {
  const products = [
    { emoji: "👗", delay: 0, x: "8%", y: "25%" },
    { emoji: "👠", delay: 0.5, x: "85%", y: "20%" },
    { emoji: "👜", delay: 1, x: "12%", y: "65%" },
    { emoji: "💍", delay: 1.5, x: "88%", y: "70%" },
    { emoji: "🎩", delay: 2, x: "45%", y: "12%" },
    { emoji: "⌚", delay: 2.5, x: "75%", y: "45%" },
    { emoji: "👔", delay: 3, x: "20%", y: "40%" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {products.map((item, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl md:text-5xl"
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [0.9, 1.1, 0.9],
            y: [0, -20, 0],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 5,
            delay: item.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {item.emoji}
        </motion.div>
      ))}
    </div>
  );
};

// Shopping bag animation
const AnimatedShoppingBag = () => {
  return (
    <motion.div
      className="relative"
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
    >
      <div className="w-32 h-32 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center relative overflow-hidden">
        <ShoppingBag className="w-16 h-16 text-white" />
        {/* Sparkle effect */}
        <motion.div
          className="absolute top-2 right-2"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Sparkles className="w-6 h-6 text-yellow-300" />
        </motion.div>
      </div>
      <motion.div
        className="absolute -inset-4 rounded-3xl border-2 border-white/20"
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
};

export default function MarketplaceFeaturesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.3]);

  const stats = [
    { value: "200+", label: "Active Vendors", icon: Store },
    { value: "$500K+", label: "Products Sold", icon: DollarSign },
    { value: "25K+", label: "Happy Buyers", icon: Users },
    { value: "4.8", label: "Seller Rating", icon: Star },
  ];

  const features = [
    {
      icon: Store,
      title: "Your Brand, Front and Center",
      description:
        "Your logo. Your colors. Your story. Customers see YOU—not a generic marketplace.",
      color: "from-purple-500 to-indigo-500",
    },
    {
      icon: Package,
      title: "List Everything You Sell",
      description:
        "Dresses, shoes, accessories—add unlimited products in minutes, not hours.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Truck,
      title: "Ship Your Way",
      description:
        "Flat rate, free over $50, calculated by weight—you set the rules.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: CreditCard,
      title: "Money When You Need It",
      description:
        "Sales hit your bank account fast. No waiting around for your money.",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: BarChart3,
      title: "See What's Selling",
      description:
        "Know your bestsellers. Spot trends. Double down on what works.",
      color: "from-pink-500 to-rose-500",
    },
    {
      icon: Shield,
      title: "Sell Without Worry",
      description:
        "Secure payments. Fraud protection. We've got your back so you can focus on selling.",
      color: "from-indigo-500 to-purple-500",
    },
  ];

  const productCategories = [
    { name: "Apparel & Fashion", icon: "👗", count: "500+ items", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80" },
    { name: "Accessories", icon: "👜", count: "300+ items", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80" },
    { name: "Dance Shoes", icon: "👠", count: "200+ items", image: "https://images.unsplash.com/photo-1518049362265-d5b2a6467c28?w=400&q=80" },
    { name: "Jewelry", icon: "💍", count: "150+ items", image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80" },
    { name: "Home Decor", icon: "🏠", count: "100+ items", image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80" },
    { name: "Art & Prints", icon: "🎨", count: "250+ items", image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=80" },
  ];

  const sellingSteps = [
    {
      step: "1",
      title: "Apply & Get Approved",
      description: "Quick application process, usually approved within 24 hours",
      icon: Check,
    },
    {
      step: "2",
      title: "Set Up Your Store",
      description: "Add your branding, products, and configure shipping options",
      icon: Store,
    },
    {
      step: "3",
      title: "Start Selling",
      description: "Your products go live and reach thousands of customers",
      icon: TrendingUp,
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
            src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80"
            alt="Fashion boutique display"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/10 to-transparent" />
        </div>

        <FloatingProducts />

        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
          {/* Gradient orbs */}
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full bg-pink-400/20 blur-3xl"
            animate={{
              x: ["-25%", "25%", "-25%"],
              y: ["-25%", "25%", "-25%"],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            style={{ left: "10%", top: "10%" }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-3xl"
            animate={{
              x: ["25%", "-25%", "25%"],
              y: ["25%", "-25%", "25%"],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            style={{ right: "10%", bottom: "10%" }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-5xl mx-auto"
          >
            {/* Animated shopping bag */}
            <div className="flex justify-center mb-8">
              <AnimatedShoppingBag />
            </div>

            <motion.h1
              className="text-5xl md:text-7xl font-bold text-white mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Your Customers Are{" "}
              <span className="relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300">
                  Already Here
                </span>
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 rounded-full"
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
              25,000+ buyers who love stepping. Your store right in front of them. No marketing required.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link href="/vendor/apply">
                <motion.button
                  className="px-8 py-4 bg-white text-purple-600 rounded-full font-bold text-lg shadow-2xl flex items-center gap-2 mx-auto sm:mx-0"
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Store className="w-5 h-5" />
                  Open Your Store
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link href="/marketplace">
                <motion.button
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-full font-bold text-lg flex items-center gap-2 mx-auto sm:mx-0"
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.2)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  Browse Marketplace
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
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg"
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

      {/* Product Categories */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              What Can You{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500">
                Sell?
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Perfect for steppers fashion, dance accessories, and lifestyle products
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {productCategories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <motion.div
                  className="bg-card rounded-2xl overflow-hidden border border-border h-full group"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 20px 40px rgba(139,92,246,0.1)",
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="relative h-32">
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <motion.div
                      className="absolute bottom-2 left-2 text-3xl"
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      {category.icon}
                    </motion.div>
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="text-lg font-bold text-foreground mb-1">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.count}</p>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Run Your Store Like a Pro
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No e-commerce experience required. We handle the tech—you handle the products.
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
              >
                <motion.div
                  className="bg-card rounded-2xl p-8 shadow-lg border border-border h-full"
                  whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <feature.icon className="w-7 h-7 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Start Selling in 3 Steps
            </h2>
            <p className="text-xl text-muted-foreground">
              Get your store up and running in no time
            </p>
          </motion.div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
            {sellingSteps.map((item, index) => (
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
                    className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center relative"
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

                {index < sellingSteps.length - 1 && (
                  <motion.div
                    className="hidden md:block"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                  >
                    <ArrowRight className="w-8 h-8 text-purple-500 mx-4" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Store Preview Section */}
      <section className="py-24 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Your Brand,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500">
                  Your Store
                </span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Create a stunning storefront that reflects your brand. Customize colors,
                add your logo, and showcase your products beautifully.
              </p>

              <ul className="space-y-4">
                {[
                  "Custom branding and store banner",
                  "Organize products by collections",
                  "Featured products section",
                  "Customer reviews and ratings",
                  "Seller profile and story",
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
              {/* Mock store card */}
              <motion.div
                className="bg-card rounded-3xl shadow-2xl border border-border overflow-hidden"
                whileHover={{ y: -10 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <div className="h-32 relative">
                  <Image
                    src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&q=80"
                    alt="Boutique store banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/60 to-indigo-500/60" />
                </div>
                <div className="px-6 -mt-8 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-4 overflow-hidden relative">
                    <Image
                      src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&q=80"
                      alt="Store logo"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Stepping Style Boutique</h3>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span>4.9 (127 reviews)</span>
                    <span>•</span>
                    <span>Chicago, IL</span>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-2 gap-4">
                  {[
                    { name: "Silk Dress", price: "$89.99", tag: "New", image: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=200&q=80" },
                    { name: "Dance Heels", price: "$149.99", tag: "Hot", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=200&q=80" },
                    { name: "Clutch Bag", price: "$45.99", tag: null, image: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=200&q=80" },
                    { name: "Earrings", price: "$32.99", tag: "Sale", image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=200&q=80" },
                  ].map((product, i) => (
                    <motion.div
                      key={i}
                      className="bg-muted/50 rounded-xl p-3 relative"
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      <div className="w-full aspect-square rounded-lg overflow-hidden relative mb-2">
                        <Image src={product.image} alt={product.name} fill className="object-cover" />
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                      <p className="text-sm font-bold text-purple-500">{product.price}</p>
                      {product.tag && (
                        <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                          product.tag === "New" ? "bg-green-500 text-white" :
                          product.tag === "Hot" ? "bg-orange-500 text-white" :
                          "bg-red-500 text-white"
                        }`}>
                          {product.tag}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Floating badges */}
              <motion.div
                className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2"
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", delay: 0.5 }}
                animate={{ y: [0, -5, 0] }}
              >
                <Zap className="w-4 h-4" />
                Verified Seller
              </motion.div>

              <motion.div
                className="absolute -bottom-4 -left-4 bg-card border border-border shadow-xl rounded-2xl p-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">New Order!</p>
                    <p className="text-xs text-green-500 font-medium">+$89.99</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 relative overflow-hidden">
        <FloatingProducts />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Keep 90% of Every Sale
            </h2>
            <p className="text-xl text-white/80">
              Low 10% commission. No hidden fees. No monthly charges.
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
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-600 px-4 py-1 rounded-full text-sm font-medium mb-6">
                <Tag className="w-4 h-4" />
                Simple Commission
              </div>

              <div className="mb-6">
                <span className="text-6xl font-bold text-gray-900">10%</span>
                <span className="text-xl text-gray-500 ml-2">per sale</span>
              </div>

              <p className="text-gray-600 mb-8">
                No monthly fees, no listing fees. Just a small commission when you make a sale.
              </p>

              <ul className="text-left space-y-3 mb-8">
                {[
                  "Unlimited product listings",
                  "Custom storefront page",
                  "Built-in payment processing",
                  "Order management dashboard",
                  "Shipping label printing",
                  "Customer messaging",
                  "Sales analytics & reports",
                  "Marketing tools",
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

              <Link href="/vendor/apply">
                <motion.button
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg"
                  whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(139,92,246,0.4)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  Apply to Sell - Free to Join
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
              "I started selling my handmade jewelry on SteppersLife and within two months,
              I had my{" "}
              <span className="text-purple-500 font-bold">first $10,000 month</span>.
              The community here genuinely supports Black-owned businesses."
            </blockquote>

            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
                <Store className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-foreground">Crystal Johnson</p>
                <p className="text-muted-foreground">CJ Accessories</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute w-96 h-96 rounded-full bg-purple-500/20 blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            style={{ left: "10%", top: "20%" }}
          />
          <motion.div
            className="absolute w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl"
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
              <Heart className="w-5 h-5 text-pink-400" />
              <span className="text-white font-medium">Join Our Vendor Community</span>
            </motion.div>

            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Your First Sale Could Be Today
            </h2>
            <p className="text-xl text-white/80 mb-10">
              Right now, someone is looking for exactly what you sell. Get your store in front of them.
            </p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Link href="/vendor/apply">
                <motion.button
                  className="px-10 py-5 bg-white text-purple-600 rounded-full font-bold text-lg shadow-2xl flex items-center gap-3 mx-auto sm:mx-0"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 20px 40px rgba(255,255,255,0.3)",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Store className="w-6 h-6" />
                  Open Your Store Today
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </motion.div>

            <p className="text-white/60 mt-6 text-sm">
              Free to apply • No monthly fees • Only 10% when you sell
            </p>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
