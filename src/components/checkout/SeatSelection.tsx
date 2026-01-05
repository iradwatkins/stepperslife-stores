"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Accessibility, AlertCircle, Check, Crown, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SeatSelectionProps {
  eventId: Id<"events">;
  ticketTierId?: Id<"ticketTiers">;
  requiredSeats: number;
  onSeatsSelected: (seats: SelectedSeat[]) => void;
}

export interface SelectedSeat {
  sectionId: string;
  sectionName: string;
  rowId?: string;
  rowLabel?: string;
  tableId?: string;
  tableNumber?: string | number;
  seatId: string;
  seatNumber: string;
}

export default function SeatSelection({
  eventId,
  ticketTierId,
  requiredSeats,
  onSeatsSelected,
}: SeatSelectionProps) {
  const seatingChart = useQuery(api.seating.queries.getPublicSeatingChart, { eventId });
  const ticketTier = useQuery(
    api.tickets.queries.getTicketTier,
    ticketTierId ? { tierId: ticketTierId } : "skip"
  );
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);

  // Check if this is a table package tier
  const isTablePackage = ticketTier?.isTablePackage || false;
  const tableCapacity = ticketTier?.tableCapacity;

  // Auto-submit when required seats are selected
  useEffect(() => {
    if (selectedSeats.length === requiredSeats) {
      onSeatsSelected(selectedSeats);
    } else if (selectedSeats.length < requiredSeats) {
      onSeatsSelected([]);
    }
  }, [selectedSeats, requiredSeats, onSeatsSelected]);

  if (!seatingChart) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">Loading seating chart...</p>
      </div>
    );
  }

  // Filter sections by ticket tier if specified
  const availableSections = seatingChart.sections.filter((section) => {
    if (!ticketTierId) return true;
    return section.ticketTierId === ticketTierId || !section.ticketTierId;
  });

  if (availableSections.length === 0) {
    return (
      <div className="bg-warning/10 border border-warning rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">No Seating Available</p>
            <p className="text-sm text-muted-foreground mt-1">
              There are no seats available for this ticket tier.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const toggleSeat = (
    sectionId: string,
    sectionName: string,
    seatId: string,
    seatNumber: string,
    rowId?: string,
    rowLabel?: string,
    tableId?: string,
    tableNumber?: string | number
  ) => {
    const seatKey = rowId
      ? `${sectionId}-row-${rowId}-${seatId}`
      : `${sectionId}-table-${tableId}-${seatId}`;

    const isSelected = selectedSeats.some((s) => {
      if (s.rowId) {
        return `${s.sectionId}-row-${s.rowId}-${s.seatId}` === seatKey;
      } else {
        return `${s.sectionId}-table-${s.tableId}-${s.seatId}` === seatKey;
      }
    });

    if (isSelected) {
      setSelectedSeats(
        selectedSeats.filter((s) => {
          if (s.rowId) {
            return `${s.sectionId}-row-${s.rowId}-${s.seatId}` !== seatKey;
          } else {
            return `${s.sectionId}-table-${s.tableId}-${s.seatId}` !== seatKey;
          }
        })
      );
    } else {
      if (selectedSeats.length < requiredSeats) {
        setSelectedSeats([
          ...selectedSeats,
          { sectionId, sectionName, rowId, rowLabel, tableId, tableNumber, seatId, seatNumber },
        ]);
      }
    }
  };

  const isSeatSelected = (sectionId: string, seatId: string, rowId?: string, tableId?: string) => {
    const seatKey = rowId
      ? `${sectionId}-row-${rowId}-${seatId}`
      : `${sectionId}-table-${tableId}-${seatId}`;

    return selectedSeats.some((s) => {
      if (s.rowId) {
        return `${s.sectionId}-row-${s.rowId}-${s.seatId}` === seatKey;
      } else {
        return `${s.sectionId}-table-${s.tableId}-${s.seatId}` === seatKey;
      }
    });
  };

  // Select all seats at a table (for table package purchases)
  const selectEntireTable = (
    sectionId: string,
    sectionName: string,
    tableId: string,
    tableNumber: string | number,
    seats: any[]
  ) => {
    const availableSeats = seats.filter((s) => s.status === "AVAILABLE");

    if (availableSeats.length === 0) {
      return; // No available seats
    }

    // Check if all seats at this table are already selected
    const allSeatsSelected = availableSeats.every((seat) =>
      isSeatSelected(sectionId, seat.id, undefined, tableId)
    );

    if (allSeatsSelected) {
      // Deselect all seats at this table
      setSelectedSeats(
        selectedSeats.filter((s) => s.tableId !== tableId || s.sectionId !== sectionId)
      );
    } else {
      // Select all available seats at this table
      const tableSeats: SelectedSeat[] = availableSeats.map((seat) => ({
        sectionId,
        sectionName,
        tableId,
        tableNumber,
        seatId: seat.id,
        seatNumber: seat.number,
      }));

      // Replace any existing selections with this table's seats
      setSelectedSeats(tableSeats);
    }
  };

  // Check if entire table is selected
  const isEntireTableSelected = (sectionId: string, tableId: string, seats: any[]) => {
    const availableSeats = seats.filter((s) => s.status === "AVAILABLE");
    if (availableSeats.length === 0) return false;

    return availableSeats.every((seat) => isSeatSelected(sectionId, seat.id, undefined, tableId));
  };

  const getAvailableSeatCount = () => {
    return availableSections.reduce((total, section) => {
      let sectionTotal = 0;

      // Count row seats
      if (section.rows) {
        sectionTotal += section.rows.reduce((rowTotal, row) => {
          return rowTotal + row.seats.filter((s) => s.status === "AVAILABLE").length;
        }, 0);
      }

      // Count table seats
      if (section.tables) {
        sectionTotal += section.tables.reduce((tableTotal, table) => {
          return tableTotal + table.seats.filter((s) => s.status === "AVAILABLE").length;
        }, 0);
      }

      return total + sectionTotal;
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Selection Progress */}
      <div className="bg-muted border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-foreground">
            Select {requiredSeats} {requiredSeats === 1 ? "seat" : "seats"}
          </span>
          <span className="text-sm text-muted-foreground">
            {selectedSeats.length} / {requiredSeats} selected
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-success h-2 rounded-full transition-all duration-300"
            style={{ width: `${(selectedSeats.length / requiredSeats) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Selected Seats Summary */}
      <AnimatePresence>
        {selectedSeats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-success/10 border border-success rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-success mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-2">Selected Seats:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSeats.map((seat, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium"
                    >
                      {seat.sectionName} -{" "}
                      {seat.rowId ? (
                        <>
                          Row {seat.rowLabel}, Seat {seat.seatNumber}
                        </>
                      ) : (
                        <>
                          Table {seat.tableNumber}, Seat {seat.seatNumber}
                        </>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seating Chart */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="space-y-8">
          {availableSections.map((section) => (
            <div key={section.id}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: section.color || "#3B82F6" }}
                ></div>
                <h3 className="text-lg font-bold text-foreground">{section.name}</h3>
                <span className="text-sm text-muted-foreground">
                  (
                  {(() => {
                    let available = 0;
                    if (section.rows) {
                      available += section.rows.reduce(
                        (total, row) =>
                          total + row.seats.filter((s) => s.status === "AVAILABLE").length,
                        0
                      );
                    }
                    if (section.tables) {
                      available += section.tables.reduce(
                        (total, table) =>
                          total + table.seats.filter((s) => s.status === "AVAILABLE").length,
                        0
                      );
                    }
                    return available;
                  })()}{" "}
                  available)
                </span>
              </div>

              {/* Row-based seating */}
              {section.rows && section.rows.length > 0 && (
                <div className="space-y-2 overflow-x-auto pb-2">
                  {section.rows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2 min-w-max">
                      <span className="w-12 text-sm font-medium text-muted-foreground text-right flex-shrink-0">
                        Row {row.label}
                      </span>
                      <div className="flex gap-1">
                        {row.seats.map((seat) => {
                          const isSelected = isSeatSelected(section.id, seat.id, row.id);
                          const isAvailable = seat.status === "AVAILABLE";
                          const isReserved = seat.status === "RESERVED";
                          const isWheelchair = seat.type === "WHEELCHAIR";

                          const isVIP = seat.type === "VIP";
                          const isCompanion = seat.type === "COMPANION";

                          return (
                            <button
                              type="button"
                              key={seat.id}
                              onClick={() => {
                                if (isAvailable) {
                                  toggleSeat(
                                    section.id,
                                    section.name,
                                    seat.id,
                                    seat.number,
                                    row.id,
                                    row.label
                                  );
                                }
                              }}
                              disabled={!isAvailable}
                              className={`w-10 h-10 rounded flex items-center justify-center text-xs font-medium transition-all border-2 ${
                                isSelected
                                  ? "bg-success text-white border-success scale-110"
                                  : isReserved
                                    ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                                    : isWheelchair
                                      ? "bg-card text-foreground border-foreground hover:bg-success/10 cursor-pointer"
                                      : isVIP
                                        ? "bg-card text-foreground border-warning hover:bg-success/10 cursor-pointer"
                                        : isCompanion
                                          ? "bg-card text-foreground border-foreground hover:bg-success/10 cursor-pointer"
                                          : "bg-card text-foreground border-foreground hover:bg-success/10 cursor-pointer"
                              }`}
                              title={
                                isReserved
                                  ? "Reserved"
                                  : isWheelchair
                                    ? `Wheelchair Accessible Seat ${seat.number}`
                                    : isVIP
                                      ? `VIP Seat ${seat.number}`
                                      : isCompanion
                                        ? `Companion Seat ${seat.number}`
                                        : `Seat ${seat.number}`
                              }
                            >
                              {isWheelchair ? (
                                <Accessibility className="w-4 h-4" />
                              ) : isVIP ? (
                                <Crown className="w-4 h-4" />
                              ) : isCompanion ? (
                                <Users className="w-4 h-4" />
                              ) : (
                                <span>{seat.number}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Table-based seating */}
              {section.tables && section.tables.length > 0 && (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    {isTablePackage
                      ? `Purchase entire tables (${tableCapacity} seats each)`
                      : "Click on a seat at any table to select it"}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {section.tables.map((table) => {
                      const availableSeatsAtTable = table.seats.filter(
                        (s) => s.status === "AVAILABLE"
                      ).length;
                      const tableSelected = isEntireTableSelected(
                        section.id,
                        table.id,
                        table.seats
                      );
                      const tableFullyAvailable = availableSeatsAtTable === table.seats.length;

                      return (
                        <div
                          key={table.id}
                          className={`border-2 rounded-lg p-4 transition-all ${
                            isTablePackage
                              ? tableSelected
                                ? "border-success bg-success/10"
                                : "border-border bg-muted hover:border-primary/40"
                              : "border-border bg-muted hover:border-border"
                          }`}
                        >
                          <h4 className="font-semibold text-foreground mb-3 text-center">
                            Table {table.number}
                          </h4>

                          {isTablePackage ? (
                            /* Table Package Mode - Show "Buy This Table" Button */
                            <div className="space-y-3">
                              <div className="bg-card rounded-lg p-3 border border-border">
                                <p className="text-sm text-muted-foreground text-center mb-1">
                                  {table.seats.length} seats
                                </p>
                                <p className="text-xs text-center">
                                  {availableSeatsAtTable === table.seats.length ? (
                                    <span className="text-success font-medium">
                                      All seats available
                                    </span>
                                  ) : availableSeatsAtTable === 0 ? (
                                    <span className="text-destructive font-medium">
                                      No seats available
                                    </span>
                                  ) : (
                                    <span className="text-warning font-medium">
                                      Only {availableSeatsAtTable} seats available
                                    </span>
                                  )}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (tableFullyAvailable) {
                                    selectEntireTable(
                                      section.id,
                                      section.name,
                                      table.id,
                                      table.number,
                                      table.seats
                                    );
                                  }
                                }}
                                disabled={!tableFullyAvailable}
                                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                                  tableFullyAvailable
                                    ? tableSelected
                                      ? "bg-success text-white hover:bg-success/90"
                                      : "bg-primary text-white hover:bg-primary/90"
                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                                }`}
                              >
                                {tableSelected ? (
                                  <>
                                    <Check className="w-4 h-4 inline mr-2" />
                                    Table Selected
                                  </>
                                ) : tableFullyAvailable ? (
                                  `Buy This Table`
                                ) : (
                                  "Table Unavailable"
                                )}
                              </button>

                              {ticketTier?.price && tableFullyAvailable && (
                                <p className="text-xs text-center text-muted-foreground">
                                  ${(ticketTier.price / 100).toFixed(2)} for {table.seats.length}{" "}
                                  seats
                                  <br />
                                  (${(ticketTier.price / 100 / table.seats.length).toFixed(2)} per
                                  seat)
                                </p>
                              )}
                            </div>
                          ) : (
                            /* Normal Mode - Show Individual Seats */
                            <div className="flex flex-wrap gap-2 justify-center">
                              {table.seats.map((seat) => {
                                const isSelected = isSeatSelected(
                                  section.id,
                                  seat.id,
                                  undefined,
                                  table.id
                                );
                                const isAvailable = seat.status === "AVAILABLE";
                                const isReserved = seat.status === "RESERVED";
                                const isWheelchair = seat.type === "WHEELCHAIR";
                                const isVIP = seat.type === "VIP";
                                const isCompanion = seat.type === "COMPANION";

                                return (
                                  <button
                                    type="button"
                                    key={seat.id}
                                    onClick={() => {
                                      if (isAvailable) {
                                        toggleSeat(
                                          section.id,
                                          section.name,
                                          seat.id,
                                          seat.number,
                                          undefined,
                                          undefined,
                                          table.id,
                                          table.number
                                        );
                                      }
                                    }}
                                    disabled={!isAvailable}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-medium transition-all border-2 ${
                                      isSelected
                                        ? "bg-success text-white border-success scale-110"
                                        : isReserved
                                          ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                                          : isWheelchair
                                            ? "bg-card text-foreground border-foreground hover:bg-success/10 cursor-pointer"
                                            : isVIP
                                              ? "bg-card text-foreground border-warning hover:bg-success/10 cursor-pointer"
                                              : isCompanion
                                                ? "bg-card text-foreground border-foreground hover:bg-success/10 cursor-pointer"
                                                : "bg-card text-foreground border-foreground hover:bg-success/10 cursor-pointer"
                                    }`}
                                    title={
                                      isReserved
                                        ? "Reserved"
                                        : isWheelchair
                                          ? `Wheelchair Accessible Seat ${seat.number}`
                                          : isVIP
                                            ? `VIP Seat ${seat.number}`
                                            : isCompanion
                                              ? `Companion Seat ${seat.number}`
                                              : `Seat ${seat.number}`
                                    }
                                  >
                                    {isWheelchair ? (
                                      <Accessibility className="w-4 h-4" />
                                    ) : isVIP ? (
                                      <Crown className="w-4 h-4" />
                                    ) : isCompanion ? (
                                      <Users className="w-4 h-4" />
                                    ) : (
                                      <span>{seat.number}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {!isTablePackage && (
                            <p className="text-xs text-muted-foreground text-center mt-3">
                              {table.seats.filter((s) => s.status === "AVAILABLE").length} of{" "}
                              {table.seats.length} available
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-muted rounded-lg p-4 border border-border">
        <h4 className="font-semibold text-foreground mb-3 text-sm">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-card border-2 border-foreground rounded"></div>
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-success border-2 border-success rounded"></div>
            <span className="text-muted-foreground">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-muted border-2 border-border rounded"></div>
            <span className="text-muted-foreground">Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-card border-2 border-foreground rounded flex items-center justify-center">
              <Accessibility className="w-4 h-4 text-foreground" />
            </div>
            <span className="text-muted-foreground">Wheelchair</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-card border-2 border-warning rounded flex items-center justify-center">
              <Crown className="w-4 h-4 text-warning" />
            </div>
            <span className="text-muted-foreground">VIP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-card border-2 border-foreground rounded flex items-center justify-center">
              <Users className="w-4 h-4 text-foreground" />
            </div>
            <span className="text-muted-foreground">Companion</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          {getAvailableSeatCount()} seats available • {selectedSeats.length} of {requiredSeats}{" "}
          required seats selected
        </p>
      </div>
    </div>
  );
}
