"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { format } from "date-fns";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  BookOpen,
  Users,
  DollarSign,
  Calendar,
  Bell,
  MapPin,
  Star,
  Clock,
  Award,
  ArrowRight,
  CheckCircle2,
  Play,
  Sparkles,
  TrendingUp,
  Heart,
  Repeat,
  CreditCard,
  BarChart3,
  MessageSquare,
  Zap,
} from "lucide-react";

export default function ClassesFeaturesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  // Fetch upcoming classes
  const upcomingClasses = useQuery(api.public.queries.getPublishedClasses, {
    includePast: false,
  });

  return (
    <div ref={containerRef}>
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1547153760-18fc86324498?w=1920&q=80"
            alt="Couple dancing elegantly"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/10 to-transparent" />
        </div>

        {/* Animated Dance Floor Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            {[...Array(10)].map((_, row) => (
              <div key={row} className="flex">
                {[...Array(10)].map((_, col) => (
                  <motion.div
                    key={`${row}-${col}`}
                    className="w-24 h-24 border border-white/20"
                    animate={{
                      backgroundColor: [
                        "rgba(255,255,255,0)",
                        "rgba(255,255,255,0.1)",
                        "rgba(255,255,255,0)",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      delay: (row + col) * 0.1,
                      repeat: Infinity,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Floating Musical Notes */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-white/20 text-4xl"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -50, 0],
              rotate: [0, 15, -15, 0],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          >
            ♪
          </motion.div>
        ))}

        <div className="container mx-auto px-4 relative z-10 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-8 border border-white/20"
            >
              <Award className="w-4 h-4" />
              <span className="text-sm font-medium">Built for Dance Instructors</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6"
            >
              Get Paid to Share
              <motion.span
                className="block text-white"
                style={{ textShadow: "0 0 40px rgba(255,255,255,0.5)" }}
              >
                Your Gift
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-12"
            >
              Students sign up online. Payments hit your account automatically. You just show up and teach.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <Link
                href="/organizer/classes/create"
                className="group px-8 py-4 bg-white text-warning font-bold rounded-xl hover:bg-white/90 transition-all transform hover:scale-105 shadow-2xl flex items-center gap-2"
              >
                Create Your Class
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </Link>
              <Link
                href="/classes"
                className="px-8 py-4 bg-white/10 backdrop-blur text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/30 flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Browse Classes
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

      {/* Class Types */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Teach Any <span className="text-warning">Dance Style</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Our platform supports all the dances our community loves
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Chicago Steppin",
                description: "The smooth, gliding dance that brings couples together on the floor.",
                levels: ["Beginner", "Intermediate", "Advanced"],
                color: "from-warning to-orange-500",
                image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80",
              },
              {
                title: "Line Dancing",
                description: "Group dances that get everyone moving with choreographed steps.",
                levels: ["Beginner", "Intermediate", "Advanced"],
                color: "from-primary to-blue-500",
                image: "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=400&q=80",
              },
              {
                title: "Walking / Boppin",
                description: "The classic walk and bop moves that define the culture.",
                levels: ["Beginner", "Intermediate", "Advanced"],
                color: "from-success to-emerald-500",
                image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80",
              },
            ].map((style, index) => (
              <motion.div
                key={style.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${style.color} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl`} />
                <div className="relative bg-card rounded-2xl overflow-hidden border border-border hover:border-warning transition-colors h-full">
                  <div className="relative h-48">
                    <Image
                      src={style.image}
                      alt={style.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-br ${style.color} opacity-60`} />
                    <motion.div
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute bottom-4 left-4 text-5xl"
                    >
                      💃
                    </motion.div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-foreground mb-3">{style.title}</h3>
                    <p className="text-muted-foreground mb-4">{style.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {style.levels.map((level) => (
                        <span
                          key={level}
                          className="px-3 py-1 bg-warning/10 text-warning rounded-full text-sm font-medium"
                        >
                          {level}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Classes Section */}
      {upcomingClasses && upcomingClasses.length > 0 && (
        <section className="py-20 bg-muted">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Upcoming <span className="text-warning">Classes</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Find a class near you and start your dance journey
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {upcomingClasses.slice(0, 6).map((classItem, index) => {
                // Get the image URL - prefer imageUrl, then check images array for Convex storage URLs
                const classImageUrl = classItem.imageUrl ||
                  (classItem.images && classItem.images[0] ? `https://convex.toolboxhosting.com/api/storage/${classItem.images[0]}` : null);
                // Handle location which can be string or object
                const venueName = typeof classItem.location === 'string'
                  ? classItem.location
                  : (classItem.location?.venueName || classItem.location?.city);

                // Get day names from classDays array
                const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const classDaysText = classItem.classDays?.map((d: number) => dayNames[d]).join(", ");

                return (
                  <motion.div
                    key={classItem._id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="group"
                  >
                    <Link href={`/classes/${classItem._id}`}>
                      <div className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-border h-full">
                        {/* Class Image */}
                        <div className="relative h-48 overflow-hidden">
                          {classImageUrl ? (
                            <Image
                              src={classImageUrl}
                              alt={classItem.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-warning/20 to-warning/10 flex items-center justify-center">
                              <BookOpen className="w-16 h-16 text-warning/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          {classItem.categories && classItem.categories[0] && (
                            <div className="absolute top-4 left-4">
                              <span className="px-3 py-1 bg-warning text-white text-sm font-medium rounded-full">
                                {classItem.categories[0]}
                              </span>
                            </div>
                          )}
                          <div className="absolute bottom-4 left-4 right-4">
                            <div className="flex items-center gap-2 text-white/90 text-sm">
                              <Clock className="w-4 h-4" />
                              <span>
                                {classDaysText || classItem.eventTimeLiteral || "See details"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Class Details */}
                        <div className="p-5">
                          <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-warning transition-colors">
                            {classItem.name}
                          </h3>
                          {venueName && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="line-clamp-1">{venueName}</span>
                            </div>
                          )}
                          {classItem.organizerName && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                              <Users className="w-4 h-4 flex-shrink-0" />
                              <span className="line-clamp-1">{classItem.organizerName}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-warning font-semibold">
                              {classItem.ticketsVisible ? "Enrolling Now" : "Coming Soon"}
                            </span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {classItem.ticketsSold || 0} enrolled
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
                href="/classes"
                className="inline-flex items-center gap-2 px-8 py-4 bg-warning text-white font-bold rounded-xl hover:bg-warning/90 transition-all"
              >
                View All Classes
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Stop Being <span className="text-warning">Your Own Secretary</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No more spreadsheets. No more payment chasing. Just teaching.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Calendar,
                title: "Set It Once, Teach Forever",
                description: "Every Tuesday at 7PM? Done. Students always know when to show up.",
              },
              {
                icon: Users,
                title: "Know Your Students",
                description: "See who's enrolled, who shows up, and who's ready for the next level.",
              },
              {
                icon: CreditCard,
                title: "Get Paid Upfront, Every Time",
                description: "Students pay when they sign up. No awkward money conversations.",
              },
              {
                icon: Bell,
                title: "Fill Every Class",
                description: "Automatic reminders mean fewer no-shows and fuller dance floors.",
              },
              {
                icon: MapPin,
                title: "Students Find You",
                description: "Your studio on the map. No more \"where do I go?\" texts.",
              },
              {
                icon: Repeat,
                title: "Flexible Income Streams",
                description: "Single drop-ins or 8-week series. Stack your income your way.",
              },
              {
                icon: BarChart3,
                title: "See What's Working",
                description: "Know which classes make money and which students come back.",
              },
              {
                icon: Star,
                title: "Let Your Students Sell For You",
                description: "Reviews from happy students bring in new dancers automatically.",
              },
              {
                icon: MessageSquare,
                title: "One Message, All Students",
                description: "Class moved? Room change? Tell everyone in one click.",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="bg-card rounded-xl p-6 shadow-sm hover:shadow-lg transition-all border border-border"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center mb-4"
                >
                  <feature.icon className="w-6 h-6 text-warning" />
                </motion.div>
                <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Story */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Turn Your Passion into <span className="text-warning">Income</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join hundreds of instructors who are building sustainable businesses teaching dance.
              </p>

              <div className="space-y-6">
                {[
                  { metric: "$3,200/mo", label: "From teaching what you love" },
                  { metric: "24", label: "Students per class—that's community" },
                  { metric: "85%", label: "Come back—because you're that good" },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-16 h-16 bg-warning/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-8 h-8 text-warning" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-foreground">{stat.metric}</p>
                      <p className="text-muted-foreground">{stat.label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Instructor Card Preview */}
              <div className="bg-card rounded-2xl shadow-2xl p-8 border border-border">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center">
                    <span className="text-3xl font-bold text-warning">LM</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Lisa Martinez</h3>
                    <p className="text-muted-foreground">Stepping Instructor</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-warning fill-current" />
                      ))}
                      <span className="text-sm text-muted-foreground ml-1">(127 reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">3</p>
                    <p className="text-sm text-muted-foreground">Active Classes</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">72</p>
                    <p className="text-sm text-muted-foreground">Students</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-warning/5 rounded-lg">
                    <span className="font-medium text-foreground">Beginner Steppin</span>
                    <span className="text-warning font-semibold">Tuesdays 7PM</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-warning/5 rounded-lg">
                    <span className="font-medium text-foreground">Intermediate Steppin</span>
                    <span className="text-warning font-semibold">Thursdays 8PM</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-warning/5 rounded-lg">
                    <span className="font-medium text-foreground">Advanced Techniques</span>
                    <span className="text-warning font-semibold">Saturdays 2PM</span>
                  </div>
                </div>
              </div>

              {/* Floating Stats */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-6 -right-6 bg-success text-white px-4 py-2 rounded-full shadow-lg font-semibold"
              >
                +$800 this week
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Free to Start, <span className="text-warning">Grow as You Go</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto bg-card rounded-2xl p-8 shadow-lg border border-border text-center"
          >
            <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-warning" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Simple Pricing</h3>
            <p className="text-5xl font-bold text-warning mb-2">5%</p>
            <p className="text-muted-foreground mb-8">of class registration fees</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                "Unlimited classes",
                "Unlimited students",
                "Online payments",
                "Email reminders",
                "Analytics dashboard",
                "No monthly fees",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-foreground text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <Link
              href="/organizer/classes/create"
              className="inline-flex items-center gap-2 px-8 py-4 bg-warning text-white font-bold rounded-xl hover:bg-warning/90 transition-all"
            >
              Start Teaching Today
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto bg-gradient-to-br from-warning to-orange-500 rounded-2xl p-8 md:p-12 text-white text-center"
          >
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-8 h-8 text-white fill-current" />
              ))}
            </div>
            <blockquote className="text-2xl md:text-3xl font-medium mb-8">
              &ldquo;I went from teaching 2 classes a week to 6 classes with 80+ students. SteppersLife handles all the registration and payments so I can just teach.&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">DJ</span>
              </div>
              <div className="text-left">
                <p className="font-bold">David Johnson</p>
                <p className="text-white/80">Stepping Instructor, Atlanta</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-warning text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Your Future Students Are Already Looking
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Somewhere right now, someone wants to learn what you teach. Help them find you.
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="/organizer/classes/create"
                className="inline-flex items-center gap-2 px-10 py-5 bg-white text-warning font-bold text-xl rounded-xl hover:bg-white/90 transition-all shadow-2xl"
              >
                Create Your First Class
                <ArrowRight className="w-6 h-6" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
