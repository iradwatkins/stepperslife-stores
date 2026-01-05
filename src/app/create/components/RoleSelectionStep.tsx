"use client";

import Image from "next/image";
import { Calendar, ChefHat, ShoppingBag, GraduationCap, Wrench, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { SelectedRole, RoleOption } from "../types";

const roleOptions: RoleOption[] = [
  {
    id: "organizer",
    title: "Create an Event",
    description: "Host stepping events, dance classes, or workshops. Get 1,000 free ticket credits to start.",
    icon: Calendar,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    buttonColor: "bg-purple-600 hover:bg-purple-700",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
    features: [
      "1,000 free ticket credits",
      "Sell tickets online",
      "Manage attendees & check-ins",
      "Track earnings & analytics",
    ],
  },
  {
    id: "instructor",
    title: "Teach Dance Classes",
    description: "Share your expertise teaching stepping, line dance, or walking classes.",
    icon: GraduationCap,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    image: "https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=800&q=80",
    features: [
      "Create class schedules",
      "Manage enrollments",
      "Track earnings",
      "Build your reputation",
    ],
  },
  {
    id: "service-provider",
    title: "Offer Your Services",
    description: "List your services - DJs, photographers, beauty, and more.",
    icon: Wrench,
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    buttonColor: "bg-teal-600 hover:bg-teal-700",
    image: "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800&q=80",
    features: [
      "Service listings",
      "Booking management",
      "Client reviews",
      "Local visibility",
    ],
  },
  {
    id: "restaurateur",
    title: "Add Your Restaurant",
    description: "Partner with SteppersLife to reach stepping event attendees with your food.",
    icon: ChefHat,
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    buttonColor: "bg-orange-600 hover:bg-orange-700",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    features: [
      "Reach event attendees",
      "Online ordering system",
      "Real-time order management",
      "Analytics dashboard",
    ],
  },
  {
    id: "vendor",
    title: "Sell on Marketplace",
    description: "Sell stepping-related products, apparel, and accessories to our community.",
    icon: ShoppingBag,
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
    buttonColor: "bg-green-600 hover:bg-green-700",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
    features: [
      "Your own storefront",
      "Product management tools",
      "Secure payments",
      "85% commission to you",
    ],
  },
];

interface RoleSelectionStepProps {
  onSelectRole: (role: SelectedRole) => void;
}

export function RoleSelectionStep({ onSelectRole }: RoleSelectionStepProps) {
  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          What would you like to do?
        </h2>
        <p className="text-muted-foreground">
          Choose your role to get started on SteppersLife
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {roleOptions.map((option, index) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <button
              onClick={() => onSelectRole(option.id)}
              className="w-full text-left bg-card border border-border rounded-2xl overflow-hidden flex flex-col hover:shadow-lg hover:border-primary/50 transition-all group"
            >
              {/* Image */}
              <div className="relative h-40 w-full overflow-hidden">
                <Image
                  src={option.image}
                  alt={option.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div
                  className={`absolute bottom-4 left-4 w-12 h-12 rounded-xl flex items-center justify-center ${option.color} backdrop-blur-sm`}
                >
                  <option.icon className="w-6 h-6" />
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {option.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {option.description}
                </p>

                <ul className="space-y-1.5 mb-4 flex-1">
                  {option.features.slice(0, 3).map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-xs text-foreground"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div
                  className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white font-medium transition-colors ${option.buttonColor}`}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
