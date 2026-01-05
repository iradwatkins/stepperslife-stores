"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, ChevronDown } from "lucide-react";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const footerSections = [
    {
      id: "about",
      title: "About",
      content: (
        <p className="text-sm text-muted-foreground">
          SteppersLife Events is your premier platform for discovering and attending stepping
          events.
        </p>
      ),
    },
    {
      id: "organizers",
      title: "For Organizers",
      links: [
        { href: "/organizer/events/create", label: "Create Event" },
        { href: "/pricing", label: "Pricing" },
        { href: "/help", label: "Help Center" },
      ],
    },
    {
      id: "resources",
      title: "Resources",
      links: [
        { href: "/events", label: "Browse Events" },
        { href: "/marketplace", label: "Stores" },
        { href: "/restaurants", label: "Restaurants" },
        { href: "/my-tickets", label: "My Tickets" },
      ],
    },
    {
      id: "legal",
      title: "Legal",
      links: [
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms of Service" },
      ],
    },
  ];

  return (
    <footer className="bg-card border-t border-border pb-20 md:pb-0">
      <div className="container mx-auto px-4 py-8">
        {/* Mobile Collapsible Sections */}
        <div className="md:hidden space-y-2">
          {footerSections.map((section) => (
            <div key={section.id} className="border-b border-border">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between py-3 text-left"
                aria-expanded={openSection === section.id}
                aria-label={`Toggle ${section.title} section`}
              >
                <h3 className="font-semibold text-foreground">{section.title}</h3>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    openSection === section.id ? "rotate-180" : ""
                  }`}
                />
              </button>
              <React.Fragment>
                {openSection === section.id && (
                  <div className="overflow-hidden">
                    <div className="pb-3">
                      {section.content ? (
                        section.content
                      ) : (
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {section.links?.map((link) => (
                            <li key={link.href}>
                              <Link
                                href={link.href}
                                className="hover:text-primary transition-colors block"
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            </div>
          ))}
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">About</h3>
            <p className="text-sm text-muted-foreground">
              SteppersLife Events is your premier platform for discovering and attending stepping
              events.
            </p>
          </div>

          {/* For Organizers */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">For Organizers</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/organizer/events/create"
                  className="hover:text-primary transition-colors"
                >
                  Create Event
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-primary transition-colors">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/events" className="hover:text-primary transition-colors">
                  Browse Events
                </Link>
              </li>
              <li>
                <Link href="/classes" className="hover:text-primary transition-colors">
                  Classes
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-primary transition-colors">
                  Stores
                </Link>
              </li>
              <li>
                <Link href="/restaurants" className="hover:text-primary transition-colors">
                  Restaurants
                </Link>
              </li>
              <li>
                <Link href="/my-tickets" className="hover:text-primary transition-colors">
                  My Tickets
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              &copy; {currentYear} SteppersLife Events. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Made with <Heart className="w-4 h-4 text-destructive fill-current" /> for the stepping
              community
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
