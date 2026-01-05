"use client";

import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Calendar, Users, ShoppingBag, Utensils } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-muted">
        {/* Hero Section */}
        <div className="bg-primary text-primary-foreground py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">About SteppersLife</h1>
            <p className="text-xl opacity-90">
              Your complete platform for Chicago Steppin - events, classes, marketplace, and more.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Mission */}
            <div className="bg-card rounded-lg shadow-sm p-8 mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
              <p className="text-muted-foreground mb-4">
                SteppersLife is dedicated to connecting the Chicago Steppin community through technology.
                We provide a comprehensive platform where steppers can discover events, learn from the best
                instructors, shop for stepping gear, and enjoy great food at stepping venues.
              </p>
              <p className="text-muted-foreground">
                Whether you&apos;re a seasoned stepper or just starting your journey, SteppersLife is
                your home for everything stepping.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-card rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Events</h3>
                </div>
                <p className="text-muted-foreground">
                  Discover stepping events nationwide - from socials and workshops to
                  competitions and cruises. Buy tickets and manage your event calendar.
                </p>
              </div>

              <div className="bg-card rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Classes</h3>
                </div>
                <p className="text-muted-foreground">
                  Learn from experienced instructors. Find classes for all skill levels -
                  beginner, intermediate, and advanced. Enroll and track your progress.
                </p>
              </div>

              <div className="bg-card rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Marketplace</h3>
                </div>
                <p className="text-muted-foreground">
                  Shop for stepping attire, shoes, jewelry, and accessories from
                  community vendors. Support local businesses in the stepping culture.
                </p>
              </div>

              <div className="bg-card rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Utensils className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Restaurants</h3>
                </div>
                <p className="text-muted-foreground">
                  Order food from restaurants at stepping venues. Skip the line and
                  get back to the dance floor faster with convenient pickup orders.
                </p>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-card rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                Have questions or feedback? We&apos;d love to hear from you.
              </p>
              <p className="text-muted-foreground">
                <strong>Email:</strong> support@stepperslife.com
              </p>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
