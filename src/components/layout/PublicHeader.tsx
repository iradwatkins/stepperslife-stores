"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  LogOut,
  User,
  Ticket,
  Calendar,
  LogIn,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  ChefHat,
  Utensils,
  BookOpen,
  ShoppingBag,
  Package,
  Sparkles,
  Store,
  Wrench,
  Radio,
  GraduationCap,
  Bell,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications";
import Image from "next/image";
import { useTheme } from "next-themes";

interface PublicHeaderProps {
  showCreateButton?: boolean;
  showNavigation?: boolean;
}

export function PublicHeader({
  showCreateButton = true,
  showNavigation = true,
}: PublicHeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigationLinks = [
    { href: "/events", label: "Events" },
    { href: "/classes", label: "Classes" },
    { href: "/services", label: "Services" },
    { href: "/radio", label: "Radio" },
    { href: "/marketplace", label: "Stores" },
    { href: "/restaurants", label: "Restaurants" },
  ];

  const isActiveLink = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  // Context-aware CTA - changes based on current section
  const getHeaderCTA = () => {
    if (pathname?.startsWith("/restaurants") || pathname?.startsWith("/restaurateur")) {
      return {
        href: "/restaurateur/apply",
        label: "Add Restaurant",
        shortLabel: "Add",
        icon: ChefHat
      };
    }
    if (pathname?.startsWith("/marketplace") || pathname?.startsWith("/vendor")) {
      return {
        href: "/vendor/apply",
        label: "Create Store",
        shortLabel: "Store",
        icon: ShoppingBag
      };
    }
    if (pathname?.startsWith("/classes")) {
      return {
        href: "/organizer/classes/create",
        label: "Create Class",
        shortLabel: "Class",
        icon: BookOpen
      };
    }
    if (pathname?.startsWith("/services") || pathname?.startsWith("/service-provider")) {
      return {
        href: "/service-provider/apply",
        label: "Offer Services",
        shortLabel: "Apply",
        icon: Wrench
      };
    }
    if (pathname?.startsWith("/radio") || pathname?.startsWith("/dj")) {
      return {
        href: "/service-provider/apply?category=dj",
        label: "Become a DJ",
        shortLabel: "DJ",
        icon: Radio
      };
    }
    // Default: events and home
    return {
      href: "/organizer/events/create",
      label: "Create Event",
      shortLabel: "Create",
      icon: Plus
    };
  };

  const headerCTA = getHeaderCTA();

  return (
    <header data-testid="public-header" className="bg-card/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" data-testid="logo" className="flex items-center shrink-0">
            <div className="relative h-10 w-32 sm:h-12 sm:w-40">
              {mounted && (
                <Image
                  key={theme}
                  src={
                    theme === "dark"
                      ? "/logos/stepperslife-logo-dark.svg"
                      : "/logos/stepperslife-logo-light.svg"
                  }
                  alt="SteppersLife"
                  fill
                  className="object-contain object-left"
                  priority
                />
              )}
            </div>
          </Link>

          {/* Desktop Navigation - Centered */}
          {showNavigation && (
            <nav data-testid="desktop-nav" className="hidden md:flex items-center gap-1">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  data-testid={`nav-link-${link.label.toLowerCase()}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActiveLink(link.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full hover:bg-accent transition-colors"
                title={theme === "dark" ? "Light mode" : "Dark mode"}
                data-testid="theme-toggle"
              >
                {theme === "dark" ? (
                  <Sun className="w-[18px] h-[18px] text-muted-foreground" />
                ) : (
                  <Moon className="w-[18px] h-[18px] text-muted-foreground" />
                )}
              </button>
            )}

            {isAuthenticated ? (
              <>
                {/* Notification Bell */}
                <NotificationBell />

                {/* Context-Aware CTA Button - Only for organizers/admins */}
                {showCreateButton && headerCTA && (user?.role === "organizer" || user?.role === "admin") && (
                  <Link
                    href={headerCTA.href}
                    data-testid="header-cta"
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                  >
                    <headerCTA.icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{headerCTA.label}</span>
                  </Link>
                )}

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    data-testid="profile-dropdown-trigger"
                    className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-accent transition-colors border border-border/50"
                  >
                    {user?.image ? (
                      <Image
                        src={user.image}
                        alt="Profile"
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isProfileOpen && (
                    <div data-testid="profile-dropdown-menu" className="absolute right-0 mt-2 w-56 bg-card rounded-xl shadow-lg border border-border py-1.5 z-50">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user?.name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user?.email}
                        </p>
                      </div>

                      <div className="py-1">
                        {/* Consumer links - always visible */}
                        <Link
                          href="/user/notifications"
                          onClick={() => setIsProfileOpen(false)}
                          data-testid="menu-notifications"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          <Bell className="w-4 h-4 text-muted-foreground" />
                          Notifications
                        </Link>
                        <Link
                          href="/my-tickets"
                          onClick={() => setIsProfileOpen(false)}
                          data-testid="menu-my-tickets"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          <Ticket className="w-4 h-4 text-muted-foreground" />
                          My Tickets
                        </Link>
                        <Link
                          href="/restaurants/my-orders"
                          onClick={() => setIsProfileOpen(false)}
                          data-testid="menu-my-food-orders"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                          My Food Orders
                        </Link>
                        <Link
                          href="/marketplace/orders"
                          onClick={() => setIsProfileOpen(false)}
                          data-testid="menu-my-marketplace-orders"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          <Package className="w-4 h-4 text-muted-foreground" />
                          My Marketplace Orders
                        </Link>

                        {/* Organizer links - only for organizers/admins */}
                        {(user?.role === "organizer" || user?.role === "admin") && (
                          <>
                            <div className="border-t border-border my-1" />
                            <Link
                              href="/organizer/events"
                              onClick={() => setIsProfileOpen(false)}
                              data-testid="menu-my-events"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                            >
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              My Events
                            </Link>
                            <Link
                              href="/organizer/classes"
                              onClick={() => setIsProfileOpen(false)}
                              data-testid="menu-my-classes"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                            >
                              <BookOpen className="w-4 h-4 text-muted-foreground" />
                              My Classes
                            </Link>
                          </>
                        )}

                        {/* Instructor links - for instructors */}
                        {(user?.role as string) === "instructor" && (
                          <>
                            <div className="border-t border-border my-1" />
                            <Link
                              href="/instructor/classes"
                              onClick={() => setIsProfileOpen(false)}
                              data-testid="menu-instructor-classes"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                            >
                              <GraduationCap className="w-4 h-4 text-muted-foreground" />
                              My Classes
                            </Link>
                          </>
                        )}

                        {/* Vendor links - for vendors/admins */}
                        {((user?.role as string) === "vendor" || user?.role === "admin") && (
                          <>
                            <div className="border-t border-border my-1" />
                            <Link
                              href="/vendor/dashboard"
                              onClick={() => setIsProfileOpen(false)}
                              data-testid="menu-my-store"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                            >
                              <Store className="w-4 h-4 text-muted-foreground" />
                              My Store
                            </Link>
                          </>
                        )}

                        {/* Admin-only links */}
                        {user?.role === "admin" && (
                          <>
                            <Link
                              href="/restaurateur/dashboard"
                              onClick={() => setIsProfileOpen(false)}
                              data-testid="menu-my-restaurant"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                            >
                              <Utensils className="w-4 h-4 text-muted-foreground" />
                              My Restaurant
                            </Link>
                            <Link
                              href="/admin"
                              onClick={() => setIsProfileOpen(false)}
                              data-testid="menu-admin-panel"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                            >
                              <User className="w-4 h-4 text-muted-foreground" />
                              Admin Panel
                            </Link>
                          </>
                        )}

                        {/* For Creators link - only for non-organizers */}
                        {user?.role !== "organizer" && user?.role !== "admin" && (
                          <>
                            <div className="border-t border-border my-1" />
                            <Link
                              href="/create"
                              onClick={() => setIsProfileOpen(false)}
                              data-testid="menu-for-creators"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                            >
                              <Sparkles className="w-4 h-4 text-muted-foreground" />
                              For Creators
                            </Link>
                          </>
                        )}
                      </div>

                      <div className="border-t border-border pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            logout();
                          }}
                          data-testid="sign-out-button"
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/login"
                data-testid="sign-in-button"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-full hover:bg-accent transition-colors"
              aria-label="Toggle menu"
              data-testid="mobile-menu-button"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div data-testid="mobile-menu-panel" className="md:hidden border-t border-border py-4 space-y-1">
            {showNavigation &&
              navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-testid={`mobile-nav-${link.label.toLowerCase()}`}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActiveLink(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

            <div className="border-t border-border mt-3 pt-3">
              {mounted && (
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="w-4 h-4" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4" />
                      Dark Mode
                    </>
                  )}
                </button>
              )}

              {isAuthenticated ? (
                <>
                  <div className="px-4 py-2 mt-2">
                    <p className="text-sm font-medium text-foreground">{user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>

                  {/* Consumer links - always visible */}
                  <Link
                    href="/user/notifications"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <Bell className="w-4 h-4" />
                    Notifications
                  </Link>
                  <Link
                    href="/my-tickets"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <Ticket className="w-4 h-4" />
                    My Tickets
                  </Link>
                  <Link
                    href="/restaurants/my-orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    My Food Orders
                  </Link>
                  <Link
                    href="/marketplace/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <Package className="w-4 h-4" />
                    My Marketplace Orders
                  </Link>

                  {/* Organizer links - only for organizers/admins */}
                  {(user?.role === "organizer" || user?.role === "admin") && (
                    <>
                      <div className="border-t border-border my-2" />
                      <Link
                        href="/organizer/events"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        My Events
                      </Link>
                      <Link
                        href="/organizer/classes"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        <BookOpen className="w-4 h-4" />
                        My Classes
                      </Link>
                    </>
                  )}

                  {/* Instructor links - for instructors */}
                  {(user?.role as string) === "instructor" && (
                    <>
                      <div className="border-t border-border my-2" />
                      <Link
                        href="/instructor/classes"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        <GraduationCap className="w-4 h-4" />
                        My Classes
                      </Link>
                    </>
                  )}

                  {/* Vendor links - for vendors/admins */}
                  {((user?.role as string) === "vendor" || user?.role === "admin") && (
                    <>
                      <div className="border-t border-border my-2" />
                      <Link
                        href="/vendor/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        <Store className="w-4 h-4" />
                        My Store
                      </Link>
                    </>
                  )}

                  {/* Admin-only links */}
                  {user?.role === "admin" && (
                    <Link
                      href="/restaurateur/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                    >
                      <Utensils className="w-4 h-4" />
                      My Restaurant
                    </Link>
                  )}

                  {/* CTA button - only for organizers/admins */}
                  {showCreateButton && headerCTA && (user?.role === "organizer" || user?.role === "admin") && (
                    <Link
                      href={headerCTA.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                    >
                      <headerCTA.icon className="w-4 h-4" />
                      {headerCTA.label}
                    </Link>
                  )}

                  {/* For Creators link - only for non-organizers */}
                  {user?.role !== "organizer" && user?.role !== "admin" && (
                    <>
                      <div className="border-t border-border my-2" />
                      <Link
                        href="/create"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        For Creators
                      </Link>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 mx-4 mt-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
