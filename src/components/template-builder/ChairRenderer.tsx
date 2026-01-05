"use client";

import React from "react";
import { ChairPosition } from "./chairUtils";

interface ChairRendererProps {
  chair: ChairPosition;
  isSelected?: boolean;
  showSeatNumber?: boolean;
  chairColor?: string;
}

/**
 * Renders a single chair at the specified position
 * Chair is a small rectangle that represents a seat
 */
export default function ChairRenderer({
  chair,
  isSelected = false,
  showSeatNumber = false,
  chairColor,
}: ChairRendererProps) {
  return (
    <div
      className="absolute transition-all"
      style={{
        left: chair.x,
        top: chair.y,
        width: 20,
        height: 14,
        transform: `rotate(${chair.rotation}deg)`,
        transformOrigin: "center",
      }}
    >
      {/* Chair seat */}
      <div
        className={`w-full h-full rounded border-2 transition-all ${
          isSelected
            ? "ring-2 ring-warning border-warning shadow-lg"
            : "border-muted-foreground shadow-sm"
        } ${chairColor ? "" : "bg-muted"}`}
        style={{
          backgroundColor: chairColor,
        }}
      />

      {/* Seat number (shown on hover or selection) */}
      {showSeatNumber && (
        <div
          className="absolute top-1/2 left-1/2 text-[8px] font-bold text-foreground pointer-events-none"
          style={{
            transform: `translate(-50%, -50%) rotate(-${chair.rotation}deg)`,
          }}
        >
          {chair.seatNumber}
        </div>
      )}
    </div>
  );
}
