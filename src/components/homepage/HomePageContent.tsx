"use client";

import { useState, useMemo } from "react";
import { GridView } from "@/components/events/GridView";
import { ListView } from "@/components/events/ListView";
import { SearchFilters } from "@/components/events/SearchFilters";
import { ViewToggle } from "@/components/events/ViewToggle";
import { PortfolioGrid } from "@/components/shadcn-studio/blocks/portfolio-01/portfolio-01";
import { MasonryEventCard } from "@/components/events/MasonryEventCard";

interface Event {
  _id: string;
  name: string;
  description: string;
  location?: string | { city?: string; state?: string };
  categories?: string[];
  [key: string]: any;
}

interface HomePageContentProps {
  initialEvents: Event[];
}

export function HomePageContent({ initialEvents }: HomePageContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "masonry">("masonry");
  const [showPastEvents, setShowPastEvents] = useState(false);

  // Filter events based on search and category
  const filteredEvents = useMemo(() => {
    let filtered = initialEvents;

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.name.toLowerCase().includes(searchLower) ||
          event.description.toLowerCase().includes(searchLower) ||
          (event.location &&
            typeof event.location === "object" &&
            event.location.city &&
            event.location.city.toLowerCase().includes(searchLower)) ||
          (event.location &&
            typeof event.location === "object" &&
            event.location.state &&
            event.location.state.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter((event) => event.categories?.includes(selectedCategory));
    }

    return filtered;
  }, [initialEvents, searchQuery, selectedCategory]);

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Search & Filters */}
      <div className="mb-8">
        <SearchFilters
          onSearchChange={setSearchQuery}
          onCategoryChange={setSelectedCategory}
          selectedCategory={selectedCategory}
          showPastEvents={showPastEvents}
          onTogglePastEvents={setShowPastEvents}
        />
      </div>

      {/* Results Count and View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground">
          {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"} found
        </p>
        <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
      </div>

      {/* Event Views */}
      {viewMode === "masonry" && (
        <PortfolioGrid
          items={filteredEvents}
          getKey={(event) => event._id}
          renderItem={(event) => (
            <MasonryEventCard event={event as any} />
          )}
          emptyState={
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No events found</p>
              <p className="text-muted-foreground text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          }
        />
      )}
      {viewMode === "grid" && <GridView events={filteredEvents} />}
      {viewMode === "list" && <ListView events={filteredEvents} />}
    </main>
  );
}
