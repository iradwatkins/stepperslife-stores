"use client";

import { useState, useMemo } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Ticket,
  Calendar,
  CreditCard,
  Users,
  Store,
  GraduationCap,
  Utensils,
  Wrench,
  Mail,
  MessageCircle,
  Phone,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

// FAQ Categories and Questions
const faqCategories = [
  {
    id: "tickets",
    name: "Tickets & Events",
    icon: Ticket,
    questions: [
      {
        q: "How do I purchase tickets?",
        a: "Browse events on our Events page, select the event you want to attend, choose your ticket type and quantity, then proceed to checkout. You can pay with credit card, PayPal, or other supported payment methods.",
      },
      {
        q: "Can I get a refund for my ticket?",
        a: "Refund policies vary by event and are set by the organizer. Check the event details for the specific refund policy. Generally, refunds may be available up to a certain date before the event.",
      },
      {
        q: "How do I access my tickets?",
        a: "After purchase, your tickets are available in your account under 'My Tickets'. You can view, download, or show the QR code at the event for entry.",
      },
      {
        q: "Can I transfer my ticket to someone else?",
        a: "Yes, if the event allows transfers. Go to 'My Tickets', select the ticket, and use the 'Transfer' option to send it to another person via email.",
      },
      {
        q: "What if my ticket doesn't scan at the event?",
        a: "Contact the event staff immediately. They can verify your purchase using your email or order confirmation. Make sure your phone screen is bright enough for the scanner.",
      },
    ],
  },
  {
    id: "events",
    name: "Attending Events",
    icon: Calendar,
    questions: [
      {
        q: "How do I find events near me?",
        a: "Use the Events page and filter by city or location. You can also enable location services for automatic nearby event suggestions.",
      },
      {
        q: "What should I bring to an event?",
        a: "Bring your digital ticket (on your phone or printed), a valid ID if required, and any items mentioned in the event details. Most venues have specific policies about outside food/drinks.",
      },
      {
        q: "Can I bring a guest?",
        a: "Only if you have a ticket for them. Each attendee needs their own ticket. Some events offer group packages or plus-one options.",
      },
      {
        q: "What if an event is cancelled?",
        a: "If an event is cancelled, you'll receive an email notification. Refunds are typically processed automatically within 5-10 business days.",
      },
    ],
  },
  {
    id: "classes",
    name: "Classes & Workshops",
    icon: GraduationCap,
    questions: [
      {
        q: "How do I enroll in a class?",
        a: "Find classes on the Classes page, select one you're interested in, and click 'Enroll'. Complete payment to secure your spot.",
      },
      {
        q: "What skill levels are available?",
        a: "Classes are labeled by skill level: Beginner, Intermediate, Advanced, or All Levels. Check the class description for specific requirements.",
      },
      {
        q: "Can I get a class package or bundle?",
        a: "Some instructors offer multi-class packages at discounted rates. Check the instructor's profile or class listings for bundle options.",
      },
      {
        q: "What if I miss a class?",
        a: "Contact the instructor directly about makeup classes or recordings. Policies vary by instructor and class type.",
      },
    ],
  },
  {
    id: "restaurants",
    name: "Food & Restaurants",
    icon: Utensils,
    questions: [
      {
        q: "How do I order food?",
        a: "Browse restaurants on the Restaurants page, select a restaurant, add items to your cart, choose pickup or delivery (if available), and checkout.",
      },
      {
        q: "What are the pickup hours?",
        a: "Pickup hours vary by restaurant and are shown on their page. Most restaurants have specific windows for order pickup.",
      },
      {
        q: "Can I modify my order after placing it?",
        a: "Contact the restaurant directly as soon as possible. Once an order starts being prepared, modifications may not be possible.",
      },
      {
        q: "How do I leave a review?",
        a: "After receiving your order, go to your order history and click 'Leave Review'. You can rate the food and service.",
      },
    ],
  },
  {
    id: "marketplace",
    name: "Marketplace & Shopping",
    icon: Store,
    questions: [
      {
        q: "How do I buy products?",
        a: "Browse the Marketplace, add items to your cart, and proceed to checkout. Enter shipping information and complete payment.",
      },
      {
        q: "What is the return policy?",
        a: "Return policies are set by individual vendors. Check the product listing or vendor page for their specific return policy.",
      },
      {
        q: "How do I track my order?",
        a: "Go to 'My Orders' in your account to view order status and tracking information once the vendor ships your items.",
      },
      {
        q: "Is my payment information secure?",
        a: "Yes, we use industry-standard encryption and never store your full credit card details. Payments are processed through secure payment providers.",
      },
    ],
  },
  {
    id: "account",
    name: "Account & Payments",
    icon: CreditCard,
    questions: [
      {
        q: "How do I create an account?",
        a: "Click 'Sign Up' or 'Register', enter your email and create a password, or sign up with Google for faster access.",
      },
      {
        q: "How do I reset my password?",
        a: "Click 'Forgot Password' on the login page, enter your email, and follow the reset link sent to your inbox.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept major credit/debit cards (Visa, Mastercard, American Express), PayPal, and other regional payment methods.",
      },
      {
        q: "How do I update my payment method?",
        a: "Go to your Profile > Payment Methods to add, update, or remove payment options.",
      },
    ],
  },
  {
    id: "organizers",
    name: "For Event Organizers",
    icon: Users,
    questions: [
      {
        q: "How do I create an event?",
        a: "Sign up as an organizer, go to your Organizer Dashboard, and click 'Create Event'. Fill in event details, ticket types, and publish.",
      },
      {
        q: "What are the platform fees?",
        a: "Platform fees vary based on your subscription tier. Free tier has a per-ticket fee, while paid plans offer reduced or no fees.",
      },
      {
        q: "How do I get paid for ticket sales?",
        a: "Payouts are processed according to your payout schedule. Go to Organizer Dashboard > Payouts to view your balance and request withdrawals.",
      },
      {
        q: "Can I customize my event page?",
        a: "Yes, add custom images, descriptions, venue details, and ticket tiers. Premium organizers get additional customization options.",
      },
    ],
  },
  {
    id: "services",
    name: "Services & Providers",
    icon: Wrench,
    questions: [
      {
        q: "How do I find a service provider?",
        a: "Browse the Services section, filter by category or location, and view provider profiles with reviews and pricing.",
      },
      {
        q: "How do I book a service?",
        a: "Visit the provider's page, check availability, and submit a booking request. The provider will confirm or suggest alternatives.",
      },
      {
        q: "How do I become a service provider?",
        a: "Apply to become a provider through the Services page. Complete your profile with credentials, portfolio, and service offerings.",
      },
      {
        q: "Are service providers verified?",
        a: "We verify provider credentials and reviews. Look for the 'Verified' badge for additional assurance.",
      },
    ],
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  // Filter FAQs based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqCategories;
    }

    const query = searchQuery.toLowerCase();
    return faqCategories
      .map((category) => ({
        ...category,
        questions: category.questions.filter(
          (q) =>
            q.q.toLowerCase().includes(query) || q.a.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.questions.length > 0);
  }, [searchQuery]);

  // Get questions for display
  const displayedQuestions = useMemo(() => {
    if (selectedCategory) {
      const category = filteredCategories.find((c) => c.id === selectedCategory);
      return category ? [category] : [];
    }
    return filteredCategories;
  }, [filteredCategories, selectedCategory]);

  const toggleQuestion = (categoryId: string, questionIndex: number) => {
    const key = `${categoryId}-${questionIndex}`;
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isQuestionExpanded = (categoryId: string, questionIndex: number) => {
    return expandedQuestions.has(`${categoryId}-${questionIndex}`);
  };

  return (
    <>
      <PublicHeader />

      {/* Breadcrumbs */}
      <div className="container mx-auto px-4 pt-4">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Help Center" },
          ]}
        />
      </div>

      <div className="min-h-screen bg-muted py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              How can we help you?
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions or contact our support team for personalized assistance.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-card border border-input shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              All Topics
            </button>
            {faqCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                <category.icon className="w-4 h-4" />
                {category.name}
              </button>
            ))}
          </div>

          {/* FAQ Content */}
          {displayedQuestions.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                No results found for &quot;{searchQuery}&quot;
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 text-primary hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {displayedQuestions.map((category) => (
                <div key={category.id} className="bg-card rounded-lg shadow-sm">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 p-4 border-b border-border">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <category.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {category.name}
                    </h2>
                  </div>

                  {/* Questions */}
                  <div className="divide-y divide-border">
                    {category.questions.map((question, index) => (
                      <div key={index}>
                        <button
                          onClick={() => toggleQuestion(category.id, index)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-medium text-foreground pr-4">
                            {question.q}
                          </span>
                          {isQuestionExpanded(category.id, index) ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </button>
                        {isQuestionExpanded(category.id, index) && (
                          <div className="px-4 pb-4 text-muted-foreground">
                            {question.a}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contact Section */}
          <div className="mt-12 bg-card rounded-lg shadow-sm p-6 md:p-8">
            <h2 className="text-xl font-semibold text-foreground text-center mb-2">
              Still need help?
            </h2>
            <p className="text-muted-foreground text-center mb-6">
              Our support team is here to assist you
            </p>

            <div className="grid sm:grid-cols-3 gap-4">
              {/* Email Support */}
              <a
                href="mailto:support@stepperslife.com"
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <span className="font-medium text-foreground">Email Us</span>
                <span className="text-sm text-muted-foreground">
                  support@stepperslife.com
                </span>
              </a>

              {/* Live Chat */}
              <Link
                href="/contact"
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <span className="font-medium text-foreground">Contact Form</span>
                <span className="text-sm text-muted-foreground">
                  Send us a message
                </span>
              </Link>

              {/* Phone Support */}
              <a
                href="tel:+18001234567"
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <span className="font-medium text-foreground">Call Us</span>
                <span className="text-sm text-muted-foreground">
                  Mon-Fri 9am-6pm EST
                </span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground mb-4">Quick Links</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/terms"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Terms of Service
                <ExternalLink className="w-3 h-3" />
              </Link>
              <Link
                href="/privacy"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Privacy Policy
                <ExternalLink className="w-3 h-3" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                About Us
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
