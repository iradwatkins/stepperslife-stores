"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { formatDate } from "date-fns";
import {
  Calendar,
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
  Play,
  Sparkles,
  Target,
  Clock,
  Gift,
  Award,
  MapPin,
} from "lucide-react";

export default function EventsFeaturesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  // Fetch upcoming events
  const upcomingEvents = useQuery(api.public.queries.getUpcomingEvents, { limit: 6 });

  return (
    <div ref={containerRef}>
      <PublicHeader />

      {/* Hero Section with Parallax */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=1920&q=80"
            alt="Elegant ballroom dancing event"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/10 to-transparent" />
        </div>

        {/* Animated Background Elements */}
        <motion.div
          style={{ y: backgroundY }}
          className="absolute inset-0 overflow-hidden"
        >
          {/* Floating Circles */}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/10"
              style={{
                width: Math.random() * 200 + 50,
                height: Math.random() * 200 + 50,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, Math.random() * 20 - 10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: Math.random() * 5 + 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        <div className="container mx-auto px-4 relative z-10 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-8 border border-white/20"
            >
              <Sparkles className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium">The #1 Platform for Steppin Events</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6"
            >
              Stop Leaving Money
              <motion.span
                className="block text-warning"
                animate={{
                  textShadow: [
                    "0 0 20px rgba(251, 191, 36, 0)",
                    "0 0 40px rgba(251, 191, 36, 0.5)",
                    "0 0 20px rgba(251, 191, 36, 0)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                at the Door
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-12"
            >
              Tickets sell while you sleep. Guests scan in seconds. You keep the money.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <Link
                href="/organizer/events/create"
                className="group px-8 py-4 bg-warning text-white font-bold rounded-xl hover:bg-warning/90 transition-all transform hover:scale-105 shadow-2xl shadow-warning/30 flex items-center gap-2"
              >
                Create Your Event
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </Link>
              <Link
                href="/events"
                className="px-8 py-4 bg-white/10 backdrop-blur text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/30 flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                See Live Events
              </Link>
            </motion.div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            style={{ opacity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2"
            >
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 bg-white rounded-full"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      {upcomingEvents && upcomingEvents.length > 0 && (
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Upcoming <span className="text-primary">Events</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                See what&apos;s happening in the stepping community
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {upcomingEvents.slice(0, 6).map((event, index) => {
                // Get the image URL - prefer imageUrl, then check images array for Convex storage URLs
                const eventImageUrl = event.imageUrl ||
                  (event.images && event.images[0] ? `https://convex.toolboxhosting.com/api/storage/${event.images[0]}` : null);
                // Handle location which can be string or object
                const venueName = typeof event.location === 'string'
                  ? event.location
                  : (event.location?.venueName || event.location?.city);

                return (
                  <motion.div
                    key={event._id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="group"
                  >
                    <Link href={`/events/${event._id}`}>
                      <div className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-border h-full">
                        {/* Event Image */}
                        <div className="relative h-48 overflow-hidden">
                          {eventImageUrl ? (
                            <Image
                              src={eventImageUrl}
                              alt={event.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                              <Calendar className="w-16 h-16 text-primary/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4">
                            <div className="flex items-center gap-2 text-white/90 text-sm">
                              <Calendar className="w-4 h-4" />
                              <span>{event.startDate ? formatDate(new Date(event.startDate), "MMM d, yyyy") : "Date TBA"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Event Details */}
                        <div className="p-5">
                          <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {event.name}
                          </h3>
                          {venueName && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="line-clamp-1">{venueName}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-primary font-semibold">
                              {event.ticketsVisible ? "Tickets Available" : "Coming Soon"}
                            </span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {event.ticketsSold || 0} attending
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <div className="text-center">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all"
              >
                View All Events
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="py-20 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { number: "50K+", label: "Tickets Sold", icon: Ticket },
              { number: "$2M+", label: "Revenue Generated", icon: DollarSign },
              { number: "500+", label: "Events Hosted", icon: Calendar },
              { number: "99.9%", label: "Uptime", icon: Shield },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center group"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors"
                >
                  <stat.icon className="w-8 h-8 text-primary" />
                </motion.div>
                <motion.p
                  className="text-4xl md:text-5xl font-bold text-foreground mb-2"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", delay: index * 0.1 + 0.2 }}
                >
                  {stat.number}
                </motion.p>
                <p className="text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Everything You Need to
              <span className="text-primary"> Succeed</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional tools that help you sell more tickets and create better events.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Ticket,
                title: "Tickets Sell While You Sleep",
                description: "No more ticket tables. Guests buy at 2am and you wake up to money.",
                color: "bg-primary",
              },
              {
                icon: QrCode,
                title: "2-Second Check-ins",
                description: "Say goodbye to clipboards and long lines. Scan, beep, done.",
                color: "bg-success",
              },
              {
                icon: Users,
                title: "Your Team Sells For You",
                description: "Give sellers their own links. Track every sale. Pay commissions automatically.",
                color: "bg-warning",
              },
              {
                icon: CreditCard,
                title: "Never Turn Down Money",
                description: "Stripe, PayPal, cash at the door—customers pay how they want.",
                color: "bg-purple-500",
              },
              {
                icon: BarChart3,
                title: "Know Your Numbers Instantly",
                description: "See exactly how your event is selling, right now, from your phone.",
                color: "bg-pink-500",
              },
              {
                icon: Bell,
                title: "Never Chase Tickets Again",
                description: "Confirmations, reminders, receipts—all sent automatically.",
                color: "bg-cyan-500",
              },
              {
                icon: Globe,
                title: "Share Once, Sell Forever",
                description: "One link that looks amazing on Instagram, Facebook, or text.",
                color: "bg-orange-500",
              },
              {
                icon: Gift,
                title: "Sell More Per Transaction",
                description: "VIP tables, group deals, early bird—boost your average sale.",
                color: "bg-red-500",
              },
              {
                icon: Target,
                title: "Sold Out? Keep Selling",
                description: "Capture emails when you sell out. Notify them when spots open.",
                color: "bg-emerald-500",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-border group cursor-pointer"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-4`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Start Selling in <span className="text-primary">3 Steps</span>
            </h2>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "5 Minutes to Your First Sale",
                description: "Upload your flyer, set your price, and you're live.",
              },
              {
                step: "02",
                title: "One Link Does It All",
                description: "Share on IG, text it, email it. Tickets sell 24/7.",
              },
              {
                step: "03",
                title: "Money Hits Your Account",
                description: "Scan guests with your phone. Money goes straight to you.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="flex items-start gap-6 mb-12 last:mb-0"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="flex-shrink-0 w-20 h-20 bg-primary rounded-2xl flex items-center justify-center"
                >
                  <span className="text-3xl font-bold text-white">{item.step}</span>
                </motion.div>
                <div className="pt-2">
                  <h3 className="text-2xl font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-lg text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Pay Only When <span className="text-primary">You Sell</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Zero upfront cost. Zero monthly fees. We only make money when you do.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              className="bg-card rounded-2xl p-8 shadow-lg border border-border"
            >
              <h3 className="text-2xl font-bold text-foreground mb-2">Pay As You Go</h3>
              <p className="text-muted-foreground mb-6">Perfect for getting started</p>
              <div className="text-5xl font-bold text-primary mb-2">
                2.9% + $0.30
              </div>
              <p className="text-muted-foreground mb-8">per ticket sold</p>
              <ul className="space-y-3">
                {["Unlimited events", "QR scanning", "Staff management", "Email confirmations", "Analytics dashboard"].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              className="bg-primary text-white rounded-2xl p-8 shadow-lg relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 bg-warning text-white px-3 py-1 rounded-full text-sm font-semibold">
                Best Value
              </div>
              <h3 className="text-2xl font-bold mb-2">Credit System</h3>
              <p className="text-white/80 mb-6">For serious promoters</p>
              <div className="text-5xl font-bold mb-2">
                $0.50
              </div>
              <p className="text-white/80 mb-8">per ticket (buy credits in bulk)</p>
              <ul className="space-y-3">
                {["Everything in Pay As You Go", "Lower per-ticket cost", "Priority support", "Advanced analytics", "1000 FREE credits to start"].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-warning" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Star className="w-8 h-8 text-warning fill-current" />
                </motion.div>
              ))}
            </div>
            <blockquote className="text-2xl md:text-3xl text-foreground font-medium mb-8 italic">
              &ldquo;I used to spend hours at the door with a clipboard. Now I scan tickets in seconds and know exactly how many people are inside. SteppersLife is a game changer.&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">MT</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-foreground">Marcus Thompson</p>
                <p className="text-muted-foreground">Event Promoter, Chicago</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-white relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/5"
              style={{
                width: 200 + i * 100,
                height: 200 + i * 100,
                left: `${20 * i}%`,
                top: "50%",
                transform: "translateY(-50%)",
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Your Next Sold-Out Event Starts Here
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              500+ promoters already moved on from clipboards and cash boxes. It's your turn.
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="/organizer/events/create"
                className="inline-flex items-center gap-2 px-10 py-5 bg-warning text-white font-bold text-xl rounded-xl hover:bg-warning/90 transition-all shadow-2xl shadow-warning/30"
              >
                Create Your First Event Free
                <ArrowRight className="w-6 h-6" />
              </Link>
            </motion.div>
            <p className="mt-6 text-white/70">
              No credit card required • Free to start • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
