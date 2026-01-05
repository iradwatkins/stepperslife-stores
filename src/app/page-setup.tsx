"use client";

import Link from "next/link";
import { Calendar, Plus, Terminal, CheckCircle, XCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-card">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Calendar className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">SteppersLife Events</h1>
                <p className="text-sm text-muted-foreground">Discover amazing stepping events</p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/organizer/events/create"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Event</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Setup Status Card */}
          <div className="bg-white rounded-lg shadow-sm border border p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Terminal className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Setup Required</h2>
            </div>

            <p className="text-foreground mb-6">
              The frontend is ready, but the backend needs to be initialized. Complete the Convex
              setup to see the full application.
            </p>

            {/* Status Checklist */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Next.js Server Running</p>
                  <p className="text-sm text-muted-foreground">Development server on port 3004</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Frontend Components Built</p>
                  <p className="text-sm text-muted-foreground">
                    Homepage, search, filters, and masonry grid
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Backend Schema Created</p>
                  <p className="text-sm text-muted-foreground">10 tables with full relationships</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Convex Backend Connected</p>
                  <p className="text-sm text-muted-foreground">Requires interactive terminal setup</p>
                </div>
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-accent border border-border rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-3">Quick Setup (2 minutes)</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Step 1: Open New Terminal
                  </p>
                  <div className="bg-card text-foreground rounded p-3 font-mono text-sm">
                    cd "/Users/irawatkins/Desktop/File Cabinet/event.stepperslife.com"
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Step 2: Run Convex Setup
                  </p>
                  <div className="bg-card text-foreground rounded p-3 font-mono text-sm">
                    npx convex dev
                  </div>
                </div>

                <div>
                  <p className="text-sm text-accent-foreground">This will:</p>
                  <ul className="text-sm text-accent-foreground list-disc list-inside ml-2 mt-2 space-y-1">
                    <li>Connect to your Convex account</li>
                    <li>Generate API files in convex/_generated/</li>
                    <li>Push your schema and functions</li>
                    <li>Enable real-time data sync</li>
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Step 3: Keep Both Running
                  </p>
                  <p className="text-sm text-accent-foreground">
                    Terminal 1: <code className="bg-accent px-2 py-0.5 rounded">npm run dev</code>{" "}
                    (already running ✓)
                    <br />
                    Terminal 2:{" "}
                    <code className="bg-accent px-2 py-0.5 rounded">npx convex dev</code> (needs to
                    start)
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Step 4: Refresh Browser
                  </p>
                  <p className="text-sm text-accent-foreground">
                    Once Convex is running, refresh this page to see the full application
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* What's Built */}
          <div className="bg-white rounded-lg shadow-sm border border p-8">
            <h3 className="text-xl font-bold text-foreground mb-4">What's Already Built</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Backend (Convex)</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Complete database schema</li>
                  <li>✓ Credits system (200 free tickets)</li>
                  <li>✓ Dual payment models</li>
                  <li>✓ Staff & commissions</li>
                  <li>✓ Email/Password auth</li>
                  <li>✓ Public API queries</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Frontend (Next.js)</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Homepage with masonry grid</li>
                  <li>✓ Search & category filters</li>
                  <li>✓ Event cards</li>
                  <li>✓ Mobile-first responsive</li>
                  <li>✓ Sticky header & footer</li>
                  <li>✓ Loading states</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border">
              <h4 className="font-semibold text-foreground mb-2">Next Steps After Setup</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>1. Build Event Detail page</li>
                <li>2. Build My Tickets dashboard</li>
                <li>3. Payment model selection</li>
                <li>4. Staff management</li>
                <li>5. Stripe integration</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2025 SteppersLife Events. All rights reserved.</p>
            <p className="mt-2">
              See <code className="bg-muted px-2 py-1 rounded text-xs">SETUP_GUIDE.md</code> for
              detailed instructions
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
