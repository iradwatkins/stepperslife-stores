"use client";

import { useState } from "react";
import { Filter, X, ChevronDown } from "lucide-react";

export interface ClassFiltersState {
  status: "all" | "published" | "draft";
  danceStyle: string;
  level: string;
  day: string;
}

interface ClassFiltersProps {
  filters: ClassFiltersState;
  onFiltersChange: (filters: ClassFiltersState) => void;
  availableDanceStyles?: string[];
}

const DAYS = [
  { value: "all", label: "All Days" },
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const LEVELS = [
  { value: "all", label: "All Levels" },
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "ALL_LEVELS", label: "All Levels (class)" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
];

const DEFAULT_DANCE_STYLES = [
  { value: "all", label: "All Styles" },
  { value: "STEPPIN", label: "Steppin'" },
  { value: "LINE_DANCING", label: "Line Dancing" },
  { value: "WALKIN", label: "Walkin'" },
  { value: "CHA_CHA", label: "Cha Cha" },
  { value: "SALSA", label: "Salsa" },
  { value: "BALLROOM", label: "Ballroom" },
];

export function ClassFilters({
  filters,
  onFiltersChange,
  availableDanceStyles,
}: ClassFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Count active filters (excluding "all" values)
  const activeFilterCount = [
    filters.status !== "all",
    filters.danceStyle !== "all",
    filters.level !== "all",
    filters.day !== "all",
  ].filter(Boolean).length;

  const handleFilterChange = (key: keyof ClassFiltersState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: "all",
      danceStyle: "all",
      level: "all",
      day: "all",
    });
  };

  const danceStyleOptions = availableDanceStyles
    ? [
        { value: "all", label: "All Styles" },
        ...availableDanceStyles.map((style) => ({
          value: style,
          label: style.replace(/_/g, " "),
        })),
      ]
    : DEFAULT_DANCE_STYLES;

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
      {/* Filter Toggle Button (Mobile) */}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-muted/50 rounded-lg border border-border">
          <FilterSelect
            value={filters.status}
            options={STATUS_OPTIONS}
            onChange={(value) => handleFilterChange("status", value)}
          />
          <FilterSelect
            value={filters.danceStyle}
            options={danceStyleOptions}
            onChange={(value) => handleFilterChange("danceStyle", value)}
          />
          <FilterSelect
            value={filters.level}
            options={LEVELS}
            onChange={(value) => handleFilterChange("level", value)}
          />
          <FilterSelect
            value={filters.day}
            options={DAYS}
            onChange={(value) => handleFilterChange("day", value)}
          />
        </div>
      )}
    </div>
  );
}

// Default filter state for initialization
export const defaultClassFilters: ClassFiltersState = {
  status: "all",
  danceStyle: "all",
  level: "all",
  day: "all",
};
