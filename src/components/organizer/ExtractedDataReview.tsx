"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Tag,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Image as ImageIcon
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ExtractedEventData } from "./FlyerUploadHero";

// Event categories from schema
const AVAILABLE_CATEGORIES = [
  "Steppers Set",
  "Line Dance",
  "Workshop",
  "Competition",
  "Social",
  "Concert",
  "Festival",
  "Conference",
  "Networking",
  "Fundraiser",
  "Private Party",
  "Other",
];

type EventType = "FREE_EVENT" | "TICKETED_EVENT" | "SAVE_THE_DATE" | "SEATED_EVENT";

interface ExtractedDataReviewProps {
  extractedData: ExtractedEventData;
  flyerPreviewUrl?: string;
  onConfirm: (data: ExtractedEventData & { eventType: EventType }) => void;
  onRescan: () => void;
}

interface FieldStatus {
  filled: boolean;
  value: string;
}

export function ExtractedDataReview({
  extractedData,
  flyerPreviewUrl,
  onConfirm,
  onRescan,
}: ExtractedDataReviewProps) {
  // Form state
  const [eventName, setEventName] = useState(extractedData.eventName || "");
  const [description, setDescription] = useState(extractedData.description || "");
  const [eventDate, setEventDate] = useState(extractedData.eventDate || "");
  const [eventEndDate, setEventEndDate] = useState(extractedData.eventEndDate || "");
  const [eventTime, setEventTime] = useState(extractedData.eventTime || "");
  const [eventEndTime, setEventEndTime] = useState(extractedData.eventEndTime || "");
  const [venueName, setVenueName] = useState(extractedData.venueName || "");
  const [address, setAddress] = useState(extractedData.address || "");
  const [city, setCity] = useState(extractedData.city || "");
  const [state, setState] = useState(extractedData.state || "");
  const [zipCode, setZipCode] = useState(extractedData.zipCode || "");
  const [categories, setCategories] = useState<string[]>(extractedData.categories || []);
  const [eventType, setEventType] = useState<EventType>(extractedData.eventType || "TICKETED_EVENT");

  // Calculate field status
  const getFieldStatus = (): Record<string, FieldStatus> => ({
    eventName: { filled: !!eventName, value: eventName },
    description: { filled: !!description, value: description },
    eventDate: { filled: !!eventDate, value: eventDate },
    eventTime: { filled: !!eventTime, value: eventTime },
    venueName: { filled: !!venueName, value: venueName },
    city: { filled: !!city, value: city },
    state: { filled: !!state, value: state },
  });

  const fieldStatus = getFieldStatus();
  const filledCount = Object.values(fieldStatus).filter((f) => f.filled).length;
  const totalFields = Object.keys(fieldStatus).length;

  const toggleCategory = (category: string) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = () => {
    const data: ExtractedEventData & { eventType: EventType } = {
      eventName,
      description,
      eventDate,
      eventEndDate: eventEndDate || null,
      eventTime,
      eventEndTime: eventEndTime || null,
      venueName,
      address: address || null,
      city,
      state,
      zipCode: zipCode || null,
      categories,
      eventType,
      imageStorageId: extractedData.imageStorageId,
    };
    onConfirm(data);
  };

  const isValid = eventName && eventDate && eventTime && city && state;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">Review Event Details</h1>
        <p className="text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            AI extracted {filledCount} of {totalFields} fields
          </span>
          {" — "}Edit any details below
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-[350px_1fr] gap-8">
        {/* Left: Flyer Preview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4"
        >
          <div className="sticky top-4">
            <div className="rounded-xl overflow-hidden border bg-muted/50 aspect-[3/4] relative">
              {flyerPreviewUrl ? (
                <img
                  src={flyerPreviewUrl}
                  alt="Event flyer"
                  className="w-full h-full object-cover"
                />
              ) : extractedData.imageStorageId ? (
                <img
                  src={`/api/storage/${extractedData.imageStorageId}`}
                  alt="Event flyer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mb-2" />
                  <span>No preview available</span>
                </div>
              )}
            </div>

            <button
              onClick={onRescan}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Upload Different Flyer
            </button>
          </div>
        </motion.div>

        {/* Right: Form Fields */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Event Name */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <FileText className="w-4 h-4" />
              Event Name
              <StatusBadge filled={!!eventName} />
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Enter event name"
              className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="w-4 h-4" />
                Start Date
                <StatusBadge filled={!!eventDate} />
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4" />
                Start Time
                <StatusBadge filled={!!eventTime} />
              </label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* End Date & Time (Optional) */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="w-4 h-4" />
                End Date (Optional)
              </label>
              <input
                type="date"
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="w-4 h-4" />
                End Time (Optional)
              </label>
              <input
                type="time"
                value={eventEndTime}
                onChange={(e) => setEventEndTime(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Venue */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4" />
              Venue Name
              <StatusBadge filled={!!venueName} />
            </label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Enter venue name"
              className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Street Address (Optional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                City
                <StatusBadge filled={!!city} />
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                State
                <StatusBadge filled={!!state} />
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                ZIP Code
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="ZIP"
                className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <FileText className="w-4 h-4" />
              Description
              <StatusBadge filled={!!description} />
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your event..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
            />
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Tag className="w-4 h-4" />
              Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-all",
                    categories.includes(category)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Event Type Selector */}
          <div className="space-y-3 pt-4 border-t">
            <label className="text-sm font-medium">
              What type of event is this?
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <EventTypeCard
                type="TICKETED_EVENT"
                title="Ticketed Event"
                description="Sell tickets with general admission or tiers"
                icon="🎫"
                selected={eventType === "TICKETED_EVENT"}
                onClick={() => setEventType("TICKETED_EVENT")}
              />
              <EventTypeCard
                type="SEATED_EVENT"
                title="Seated Event"
                description="Reserved seating with table/seat selection"
                icon="🪑"
                selected={eventType === "SEATED_EVENT"}
                onClick={() => setEventType("SEATED_EVENT")}
              />
              <EventTypeCard
                type="FREE_EVENT"
                title="Free Event"
                description="Free RSVP, track attendance without payment"
                icon="🎉"
                selected={eventType === "FREE_EVENT"}
                onClick={() => setEventType("FREE_EVENT")}
              />
              <EventTypeCard
                type="SAVE_THE_DATE"
                title="Save the Date"
                description="Announce your event, tickets coming soon"
                icon="📅"
                selected={eventType === "SAVE_THE_DATE"}
                onClick={() => setEventType("SAVE_THE_DATE")}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-lg transition-all",
                isValid
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              Continue to {eventType === "SEATED_EVENT" ? "Seating Setup" : eventType === "TICKETED_EVENT" ? "Ticket Setup" : "Event Details"}
              <ChevronRight className="w-5 h-5" />
            </button>
            {!isValid && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Please fill in all required fields (Event Name, Date, Time, City, State)
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Helper Components
function StatusBadge({ filled }: { filled: boolean }) {
  return filled ? (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" />
      extracted
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
      <AlertCircle className="w-3 h-3" />
      required
    </span>
  );
}

interface EventTypeCardProps {
  type: EventType;
  title: string;
  description: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
}

function EventTypeCard({ title, description, icon, selected, onClick }: EventTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border-2 text-left transition-all",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}
