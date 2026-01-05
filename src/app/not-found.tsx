import Link from "next/link";
import { Home, Calendar, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary/20">404</h1>
          <h2 className="text-2xl font-bold text-foreground mt-4 mb-2">Page Not Found</h2>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Browse Events
          </Link>
        </div>
        
        <p className="text-sm text-muted-foreground mt-8">
          Need help? <Link href="/help" className="text-primary hover:underline">Contact Support</Link>
        </p>
      </div>
    </div>
  );
}
