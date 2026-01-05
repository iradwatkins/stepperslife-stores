"use client";

import { useRouter } from "next/navigation";
import { CheckCircle, Calendar, GraduationCap, Wrench, ChefHat, ShoppingBag, ArrowRight, Home } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SelectedRole } from "../types";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface SuccessStepProps {
  selectedRole: SelectedRole;
}

const roleConfig: Record<SelectedRole, {
  title: string;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  primaryAction: {
    label: string;
    href: string;
  };
  secondaryAction: {
    label: string;
    href: string;
  };
}> = {
  organizer: {
    title: "You're Ready to Create Events!",
    message: "Your organizer account is set up. Start by creating your first event and get 1,000 free ticket credits!",
    icon: Calendar,
    color: "text-purple-600",
    primaryAction: {
      label: "Create Your First Event",
      href: "/organizer/events/create",
    },
    secondaryAction: {
      label: "Go to Organizer Dashboard",
      href: "/organizer/dashboard",
    },
  },
  instructor: {
    title: "Welcome, Instructor!",
    message: "Your instructor profile has been submitted for review. Once approved, you can start creating dance classes!",
    icon: GraduationCap,
    color: "text-blue-600",
    primaryAction: {
      label: "View Instructor Dashboard",
      href: "/instructor/dashboard",
    },
    secondaryAction: {
      label: "Browse Existing Classes",
      href: "/classes",
    },
  },
  "service-provider": {
    title: "Application Submitted!",
    message: "Your service provider profile has been submitted for review. Once approved, you can add your services to reach the stepping community!",
    icon: Wrench,
    color: "text-teal-600",
    primaryAction: {
      label: "View Provider Dashboard",
      href: "/service-provider/dashboard",
    },
    secondaryAction: {
      label: "Browse Other Services",
      href: "/services",
    },
  },
  restaurateur: {
    title: "Restaurant Partner Activated!",
    message: "Your restaurant is set up! Complete your menu and enable 'accepting orders' in your dashboard to start receiving orders from event attendees.",
    icon: ChefHat,
    color: "text-orange-600",
    primaryAction: {
      label: "Complete Restaurant Setup",
      href: "/restaurateur/dashboard",
    },
    secondaryAction: {
      label: "View Restaurant Directory",
      href: "/restaurants",
    },
  },
  vendor: {
    title: "Your Store is Ready!",
    message: "Your vendor profile is set up. Start listing your products on the SteppersLife Marketplace!",
    icon: ShoppingBag,
    color: "text-green-600",
    primaryAction: {
      label: "Add Your First Product",
      href: "/vendor/dashboard/products/create",
    },
    secondaryAction: {
      label: "Visit Marketplace",
      href: "/marketplace",
    },
  },
};

export function SuccessStep({ selectedRole }: SuccessStepProps) {
  const router = useRouter();
  const config = roleConfig[selectedRole];
  const Icon = config.icon;

  // Trigger confetti on mount
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#9333ea", "#3b82f6", "#22c55e", "#f97316", "#14b8a6"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#9333ea", "#3b82f6", "#22c55e", "#f97316", "#14b8a6"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="mb-6"
      >
        <div className="w-24 h-24 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {config.title}
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          {config.message}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card border border-border rounded-2xl p-6 mb-8"
      >
        <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center bg-muted mb-4`}>
          <Icon className={`w-8 h-8 ${config.color}`} />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          What&apos;s Next?
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Get started with your new role on SteppersLife
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3"
      >
        <Button
          size="lg"
          className="w-full"
          onClick={() => router.push(config.primaryAction.href)}
        >
          {config.primaryAction.label}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={() => router.push(config.secondaryAction.href)}
        >
          {config.secondaryAction.label}
        </Button>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => router.push("/")}
        >
          <Home className="w-4 h-4 mr-2" />
          Return to Homepage
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-xs text-muted-foreground"
      >
        Need help getting started?{" "}
        <a href="/help" className="text-primary hover:underline">
          Visit our Help Center
        </a>
      </motion.p>
    </div>
  );
}
