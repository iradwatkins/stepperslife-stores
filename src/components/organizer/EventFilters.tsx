"use client";

import { useState } from "react";
import { Filter, X, ChevronDown } from "lucide-react";

export interface EventFiltersState {
  status: "all" | "published" | "draft";
  eventType: string;
  eventSubType: string;
  dressCode: string;
  beginnerFriendly: string;
}

interface EventFiltersProps {
  filters: EventFiltersState;
  onFiltersChange: (filters: EventFiltersState) => void;
}

const EVENT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "TICKETED_EVENT", label: "Ticketed Event" },
  { value: "FREE_EVENT", label: "Free Event" },
  { value: "SEATED_EVENT", label: "Seated Event" },
  { value: "SAVE_THE_DATE", label: "Save the Date" },
];

const EVENT_SUB_TYPES = [
  { value: "all", label: "All Subtypes" },
  { value: "weekender", label: "Weekender" },
  { value: "set", label: "Set" },
  { value: "ball", label: "Ball" },
  { value: "workshop", label: "Workshop" },
  { value: "social", label: "Social" },
];

const DRESS_CODES = [
  { value: "all", label: "All Dress Codes" },
  { value: "all_white", label: "All White" },
  { value: "black_tie", label: "Black Tie" },
  { value: "stepping_attire", label: "Stepping Attire" },
  { value: "casual", label: "Casual" },
  { value: "theme", label: "Theme" },
];

const BEGINNER_FRIENDLY = [
  { value: "all", label: "All Events" },
  { value: "yes", label: "Beginner Friendly" },
  { value: "no", label: "Not Beginner Friendly" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
];

export function EventFilters({
  filters,
  onFiltersChange,
}: EventFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Count active filters (excluding "all" values)
  const activeFilterCount = [
    filters.status !== "all",
    filters.eventType !== "all",
    filters.eventSubType !== "all",
    filters.dressCode !== "all",
    filters.beginnerFriendly !== "all",
  ].filter(Boolean).length;

  const handleFilterChange = (key: keyof EventFiltersState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: "all",
      eventType: "all",
      eventSubType: "all",
      dressCode: "all",
      beginnerFriendly: "all",
    });
  };

  // Compact Filter Select Component
  const FilterSelect = ({
    value,
    options,
    onChange,
    className = "",
  }: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    className?: string;
  }) => (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full px-3 py-2 pr-8 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Filter Toggle Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            activeFilterCount > 0
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-foreground hover:bg-muted"
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-primary text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Clear All Button - Show when filters are active */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-muted/50 rounded-lg border border-border">
          <FilterSelect
            value={filters.status}
            options={STATUS_OPTIONS}
            onChange={(value) => handleFilterChange("status", value)}
          />
          <FilterSelect
            value={filters.eventType}
            options={EVENT_TYPES}
            onChange={(value) => handleFilterChange("eventType", value)}
          />
          <FilterSelect
            value={filters.eventSubType}
            options={EVENT_SUB_TYPES}
            onChange={(value) => handleFilterChange("eventSubType", value)}
          />
          <FilterSelect
            value={filters.dressCode}
            options={DRESS_CODES}
            onChange={(value) => handleFilterChange("dressCode", value)}
          />
          <FilterSelect
            value={filters.beginnerFriendly}
            options={BEGINNER_FRIENDLY}
            onChange={(value) => handleFilterChange("beginnerFriendly", value)}
          />
        </div>
      )}
    </div>
  );
}

// Default filter state for initialization
export const defaultEventFilters: EventFiltersState = {
  status: "all",
  eventType: "all",
  eventSubType: "all",
  dressCode: "all",
  beginnerFriendly: "all",
};
