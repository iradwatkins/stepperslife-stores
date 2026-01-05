import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Seed test events for SteppersLife homepage
 * Run with: npx convex run events/seed:createTestEvents
 *
 * Creates:
 * - 3 Ballroom/Seated Events (formal galas)
 * - 3 Ticketed Events with Hotels attached
 */
export const createTestEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const createdEvents: string[] = [];
    const createdHotels: string[] = [];

    // Find an admin user to use as organizer
    const adminUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();

    if (!adminUser) {
      throw new Error("No admin user found. Create an admin user first.");
    }

    const organizerId = adminUser._id;

    // Helper to create timestamps
    const createDate = (year: number, month: number, day: number, hour: number = 19) => {
      return new Date(year, month - 1, day, hour, 0, 0).getTime();
    };

    // =========================================================================
    // BALLROOM / SEATED EVENTS
    // =========================================================================

    // Event 1: Chicago Winter Gala 2026
    const chicagoGalaId = await ctx.db.insert("events", {
      name: "Chicago Winter Gala 2026",
      description: "Join us for an elegant evening of Chicago-style steppin' at the prestigious Drake Hotel. This black-tie optional affair features live music, gourmet dinner, and dancing until midnight. Reserved table seating available.",
      eventType: "SEATED_EVENT",
      status: "PUBLISHED",
      location: {
        venueName: "The Drake Hotel Ballroom",
        address: "140 E Walton Pl",
        city: "Chicago",
        state: "IL",
        zipCode: "60611",
        country: "USA",
      },
      eventDateLiteral: "January 25, 2026",
      eventTimeLiteral: "7:00 PM - 12:00 AM",
      eventTimezone: "America/Chicago",
      startDate: createDate(2026, 1, 25, 19),
      endDate: createDate(2026, 1, 26, 0),
      timezone: "America/Chicago",
      imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
      categories: ["Steppin", "Formal"],
      capacity: 300,
      organizerId,
      ticketsVisible: true,
      allowWaitlist: true,
      allowTransfers: true,
      maxTicketsPerOrder: 10,
      createdAt: now,
      updatedAt: now,
    });
    createdEvents.push(`Chicago Winter Gala 2026 (${chicagoGalaId})`);

    // Event 2: Atlanta Valentine's Ball 2026
    const atlantaValentineId = await ctx.db.insert("events", {
      name: "Atlanta Valentine's Ball 2026",
      description: "Celebrate love and dance at our annual Valentine's Ball! The Westin Peachtree Plaza transforms into a romantic paradise with rose-decorated tables, champagne toast, and the best steppin' DJs in the South. Couples and singles welcome.",
      eventType: "SEATED_EVENT",
      status: "PUBLISHED",
      location: {
        venueName: "Westin Peachtree Plaza",
        address: "210 Peachtree St NW",
        city: "Atlanta",
        state: "GA",
        zipCode: "30303",
        country: "USA",
      },
      eventDateLiteral: "February 14, 2026",
      eventTimeLiteral: "8:00 PM - 1:00 AM",
      eventTimezone: "America/New_York",
      startDate: createDate(2026, 2, 14, 20),
      endDate: createDate(2026, 2, 15, 1),
      timezone: "America/New_York",
      imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
      categories: ["Steppin", "Formal"],
      capacity: 400,
      organizerId,
      ticketsVisible: true,
      allowWaitlist: true,
      allowTransfers: true,
      maxTicketsPerOrder: 8,
      createdAt: now,
      updatedAt: now,
    });
    createdEvents.push(`Atlanta Valentine's Ball 2026 (${atlantaValentineId})`);

    // Event 3: Detroit Black Tie Affair 2026
    const detroitBlackTieId = await ctx.db.insert("events", {
      name: "Detroit Black Tie Affair 2026",
      description: "The Motor City's most prestigious steppin' event returns! MGM Grand Detroit hosts this exclusive black-tie gala featuring top-tier entertainment, five-star dining, and a night of sophisticated dancing. Dress to impress.",
      eventType: "SEATED_EVENT",
      status: "PUBLISHED",
      location: {
        venueName: "MGM Grand Detroit",
        address: "1777 Third Ave",
        city: "Detroit",
        state: "MI",
        zipCode: "48226",
        country: "USA",
      },
      eventDateLiteral: "March 8, 2026",
      eventTimeLiteral: "7:00 PM - 12:00 AM",
      eventTimezone: "America/Detroit",
      startDate: createDate(2026, 3, 8, 19),
      endDate: createDate(2026, 3, 9, 0),
      timezone: "America/Detroit",
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
      categories: ["Steppin", "Formal"],
      capacity: 500,
      organizerId,
      ticketsVisible: true,
      allowWaitlist: true,
      allowTransfers: true,
      maxTicketsPerOrder: 10,
      createdAt: now,
      updatedAt: now,
    });
    createdEvents.push(`Detroit Black Tie Affair 2026 (${detroitBlackTieId})`);

    // =========================================================================
    // TICKETED EVENTS WITH HOTELS
    // =========================================================================

    // Event 4: New Year Steppin Celebration 2026
    const newYearEventId = await ctx.db.insert("events", {
      name: "New Year Steppin Celebration 2026",
      description: "Ring in the new year steppin' style! Our annual New Year celebration at the Hyatt Regency Chicago features three ballrooms of dancing, multiple DJs, a midnight countdown, and complimentary champagne toast. Hotel packages available.",
      eventType: "TICKETED_EVENT",
      status: "PUBLISHED",
      location: {
        venueName: "Hyatt Regency Chicago",
        address: "151 E Wacker Dr",
        city: "Chicago",
        state: "IL",
        zipCode: "60601",
        country: "USA",
      },
      eventDateLiteral: "January 18, 2026",
      eventTimeLiteral: "9:00 PM - 4:00 AM",
      eventTimezone: "America/Chicago",
      startDate: createDate(2026, 1, 18, 21),
      endDate: createDate(2026, 1, 19, 4),
      timezone: "America/Chicago",
      imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
      categories: ["Steppin", "Party"],
      capacity: 800,
      organizerId,
      ticketsVisible: true,
      allowWaitlist: true,
      allowTransfers: true,
      maxTicketsPerOrder: 10,
      createdAt: now,
      updatedAt: now,
    });
    createdEvents.push(`New Year Steppin Celebration 2026 (${newYearEventId})`);

    // Hotel for New Year Event - Hyatt Regency Chicago
    const hyattHotelId = await ctx.db.insert("hotelPackages", {
      eventId: newYearEventId,
      organizerId,
      hotelName: "Hyatt Regency Chicago",
      address: "151 E Wacker Dr",
      city: "Chicago",
      state: "IL",
      description: "Connected to the event venue! Wake up and walk downstairs to the party. Stunning views of the Chicago River and Magnificent Mile.",
      amenities: ["wifi", "parking", "gym", "restaurant"],
      starRating: 4,
      images: [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=800&fit=crop",
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop",
      ],
      roomTypes: [
        {
          id: "hyatt-standard",
          name: "Standard King",
          pricePerNightCents: 15900,
          quantity: 30,
          sold: 0,
          maxGuests: 2,
          description: "Comfortable room with king bed and city views",
        },
        {
          id: "hyatt-deluxe",
          name: "Deluxe River View",
          pricePerNightCents: 21900,
          quantity: 20,
          sold: 0,
          maxGuests: 2,
          description: "Premium room with stunning Chicago River views",
        },
        {
          id: "hyatt-suite",
          name: "Executive Suite",
          pricePerNightCents: 29900,
          quantity: 10,
          sold: 0,
          maxGuests: 4,
          description: "Spacious suite with separate living area and panoramic views",
        },
      ],
      checkInDate: createDate(2026, 1, 18, 15),
      checkOutDate: createDate(2026, 1, 19, 11),
      bookingCutoffHours: 48,
      specialInstructions: "Mention SteppersLife for group rate. Valet parking available $55/night.",
      contactName: "Hyatt Group Reservations",
      contactPhone: "(312) 555-1234",
      contactEmail: "groups@hyattchicago.example.com",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    createdHotels.push(`Hyatt Regency Chicago (${hyattHotelId})`);

    // Event 5: Spring Steppin Weekend 2026
    const springWeekendId = await ctx.db.insert("events", {
      name: "Spring Steppin Weekend 2026",
      description: "Two days of non-stop steppin' in Memphis! The legendary Peabody Hotel hosts workshops during the day and parties at night. Learn from master instructors and dance with steppers from across the country.",
      eventType: "TICKETED_EVENT",
      status: "PUBLISHED",
      location: {
        venueName: "The Peabody Memphis",
        address: "149 Union Ave",
        city: "Memphis",
        state: "TN",
        zipCode: "38103",
        country: "USA",
      },
      eventDateLiteral: "March 22-23, 2026",
      eventTimeLiteral: "All Day Events",
      eventTimezone: "America/Chicago",
      startDate: createDate(2026, 3, 22, 10),
      endDate: createDate(2026, 3, 24, 2),
      timezone: "America/Chicago",
      imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
      categories: ["Steppin", "Weekend"],
      capacity: 600,
      organizerId,
      ticketsVisible: true,
      allowWaitlist: true,
      allowTransfers: true,
      maxTicketsPerOrder: 8,
      createdAt: now,
      updatedAt: now,
    });
    createdEvents.push(`Spring Steppin Weekend 2026 (${springWeekendId})`);

    // Hotel for Spring Weekend - The Peabody Memphis
    const peabodyHotelId = await ctx.db.insert("hotelPackages", {
      eventId: springWeekendId,
      organizerId,
      hotelName: "The Peabody Memphis",
      address: "149 Union Ave",
      city: "Memphis",
      state: "TN",
      description: "The South's Grand Hotel! Home of the famous Peabody Ducks. Historic luxury in the heart of Beale Street. Event venue is on-site.",
      amenities: ["wifi", "parking", "pool", "gym", "restaurant"],
      starRating: 4,
      images: [
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&h=800&fit=crop",
        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop",
      ],
      roomTypes: [
        {
          id: "peabody-superior",
          name: "Superior Room",
          pricePerNightCents: 17900,
          quantity: 40,
          sold: 0,
          maxGuests: 2,
          description: "Elegant room with classic Southern charm",
        },
        {
          id: "peabody-deluxe",
          name: "Deluxe King",
          pricePerNightCents: 22900,
          quantity: 25,
          sold: 0,
          maxGuests: 2,
          description: "Spacious room with premium amenities and city views",
        },
        {
          id: "peabody-junior-suite",
          name: "Junior Suite",
          pricePerNightCents: 34900,
          quantity: 10,
          sold: 0,
          maxGuests: 4,
          description: "Luxurious suite with sitting area and marble bathroom",
        },
      ],
      checkInDate: createDate(2026, 3, 22, 15),
      checkOutDate: createDate(2026, 3, 24, 11),
      bookingCutoffHours: 72,
      specialInstructions: "Don't miss the famous Duck March at 11 AM and 5 PM daily! Valet parking $38/night.",
      contactName: "Peabody Reservations",
      contactPhone: "(901) 555-5678",
      contactEmail: "reservations@peabodymemphis.example.com",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    createdHotels.push(`The Peabody Memphis (${peabodyHotelId})`);

    // Event 6: Soul Steppers Convention 2026
    const conventionId = await ctx.db.insert("events", {
      name: "Soul Steppers Convention 2026",
      description: "The biggest steppin' convention in Texas! Three days of workshops, competitions, showcases, and social dancing at the Marriott Marquis Houston. Featuring world-renowned instructors and performers.",
      eventType: "TICKETED_EVENT",
      status: "PUBLISHED",
      location: {
        venueName: "Marriott Marquis Houston",
        address: "1777 Walker St",
        city: "Houston",
        state: "TX",
        zipCode: "77010",
        country: "USA",
      },
      eventDateLiteral: "April 12-13, 2026",
      eventTimeLiteral: "All Day Events",
      eventTimezone: "America/Chicago",
      startDate: createDate(2026, 4, 12, 9),
      endDate: createDate(2026, 4, 14, 2),
      timezone: "America/Chicago",
      imageUrl: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80",
      categories: ["Steppin", "Convention"],
      capacity: 1000,
      organizerId,
      ticketsVisible: true,
      allowWaitlist: true,
      allowTransfers: true,
      maxTicketsPerOrder: 10,
      createdAt: now,
      updatedAt: now,
    });
    createdEvents.push(`Soul Steppers Convention 2026 (${conventionId})`);

    // Hotel for Convention - Marriott Marquis Houston
    const marriottHotelId = await ctx.db.insert("hotelPackages", {
      eventId: conventionId,
      organizerId,
      hotelName: "Marriott Marquis Houston",
      address: "1777 Walker St",
      city: "Houston",
      state: "TX",
      description: "Home of the Texas-shaped lazy river rooftop pool! Ultra-modern luxury hotel connected to the George R. Brown Convention Center. Event venue is steps away.",
      amenities: ["wifi", "parking", "pool", "gym", "restaurant", "breakfast"],
      starRating: 4,
      images: [
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&h=800&fit=crop",
        "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop",
      ],
      roomTypes: [
        {
          id: "marriott-city",
          name: "City View Room",
          pricePerNightCents: 18900,
          quantity: 50,
          sold: 0,
          maxGuests: 2,
          description: "Modern room with floor-to-ceiling windows and Houston skyline views",
        },
        {
          id: "marriott-skyline",
          name: "Skyline King",
          pricePerNightCents: 24900,
          quantity: 30,
          sold: 0,
          maxGuests: 2,
          description: "Premium room with enhanced views and luxury amenities",
        },
        {
          id: "marriott-executive",
          name: "Executive Suite",
          pricePerNightCents: 39900,
          quantity: 15,
          sold: 0,
          maxGuests: 4,
          description: "Stunning suite with separate living room and panoramic views",
        },
      ],
      checkInDate: createDate(2026, 4, 12, 15),
      checkOutDate: createDate(2026, 4, 14, 11),
      bookingCutoffHours: 48,
      specialInstructions: "Rooftop pool access included! Convention attendees receive complimentary WiFi upgrade. Self-parking $42/night.",
      contactName: "Marriott Groups",
      contactPhone: "(713) 555-9012",
      contactEmail: "groups@marriotthouston.example.com",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    createdHotels.push(`Marriott Marquis Houston (${marriottHotelId})`);

    return {
      success: true,
      message: `Created ${createdEvents.length} events and ${createdHotels.length} hotel packages`,
      events: createdEvents,
      hotels: createdHotels,
    };
  },
});

/**
 * Update existing test events to use 2026 dates
 * Run with: npx convex run events/seed:updateEventDates
 */
export const updateEventDates = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const createDate = (year: number, month: number, day: number, hour: number = 19) => {
      return new Date(year, month - 1, day, hour, 0, 0).getTime();
    };

    const updates = [
      {
        oldName: "Chicago Winter Gala 2025",
        newName: "Chicago Winter Gala 2026",
        eventDateLiteral: "January 25, 2026",
        startDate: createDate(2026, 1, 25, 19),
        endDate: createDate(2026, 1, 26, 0),
      },
      {
        oldName: "Atlanta Valentine's Ball 2025",
        newName: "Atlanta Valentine's Ball 2026",
        eventDateLiteral: "February 14, 2026",
        startDate: createDate(2026, 2, 14, 20),
        endDate: createDate(2026, 2, 15, 1),
      },
      {
        oldName: "Detroit Black Tie Affair 2025",
        newName: "Detroit Black Tie Affair 2026",
        eventDateLiteral: "March 8, 2026",
        startDate: createDate(2026, 3, 8, 19),
        endDate: createDate(2026, 3, 9, 0),
      },
      {
        oldName: "New Year Steppin Celebration 2025",
        newName: "New Year Steppin Celebration 2026",
        eventDateLiteral: "January 18, 2026",
        startDate: createDate(2026, 1, 18, 21),
        endDate: createDate(2026, 1, 19, 4),
      },
      {
        oldName: "Spring Steppin Weekend 2025",
        newName: "Spring Steppin Weekend 2026",
        eventDateLiteral: "March 22-23, 2026",
        startDate: createDate(2026, 3, 22, 10),
        endDate: createDate(2026, 3, 24, 2),
      },
      {
        oldName: "Soul Steppers Convention 2025",
        newName: "Soul Steppers Convention 2026",
        eventDateLiteral: "April 12-13, 2026",
        startDate: createDate(2026, 4, 12, 9),
        endDate: createDate(2026, 4, 14, 2),
      },
    ];

    const hotelUpdates = [
      {
        hotelName: "Hyatt Regency Chicago",
        checkInDate: createDate(2026, 1, 18, 15),
        checkOutDate: createDate(2026, 1, 19, 11),
      },
      {
        hotelName: "The Peabody Memphis",
        checkInDate: createDate(2026, 3, 22, 15),
        checkOutDate: createDate(2026, 3, 24, 11),
      },
      {
        hotelName: "Marriott Marquis Houston",
        checkInDate: createDate(2026, 4, 12, 15),
        checkOutDate: createDate(2026, 4, 14, 11),
      },
    ];

    let updatedEvents = 0;
    let updatedHotels = 0;

    // Update events
    for (const update of updates) {
      const event = await ctx.db
        .query("events")
        .filter((q) => q.eq(q.field("name"), update.oldName))
        .first();

      if (event) {
        await ctx.db.patch(event._id, {
          name: update.newName,
          eventDateLiteral: update.eventDateLiteral,
          startDate: update.startDate,
          endDate: update.endDate,
          updatedAt: now,
        });
        updatedEvents++;
      }
    }

    // Update hotels
    for (const update of hotelUpdates) {
      const hotel = await ctx.db
        .query("hotelPackages")
        .filter((q) => q.eq(q.field("hotelName"), update.hotelName))
        .first();

      if (hotel) {
        await ctx.db.patch(hotel._id, {
          checkInDate: update.checkInDate,
          checkOutDate: update.checkOutDate,
          updatedAt: now,
        });
        updatedHotels++;
      }
    }

    return {
      success: true,
      message: `Updated ${updatedEvents} events and ${updatedHotels} hotels to 2026 dates`,
    };
  },
});

/**
 * Delete all test events (cleanup)
 * Run with: npx convex run events/seed:deleteTestEvents
 */
export const deleteTestEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const testEventNames = [
      "Chicago Winter Gala 2026",
      "Atlanta Valentine's Ball 2026",
      "Detroit Black Tie Affair 2026",
      "New Year Steppin Celebration 2026",
      "Spring Steppin Weekend 2026",
      "Soul Steppers Convention 2026",
    ];

    const testHotelNames = [
      "Hyatt Regency Chicago",
      "The Peabody Memphis",
      "Marriott Marquis Houston",
    ];

    let deletedEvents = 0;
    let deletedHotels = 0;

    // Delete hotels first (they reference events)
    for (const hotelName of testHotelNames) {
      const hotels = await ctx.db
        .query("hotelPackages")
        .filter((q) => q.eq(q.field("hotelName"), hotelName))
        .collect();

      for (const hotel of hotels) {
        await ctx.db.delete(hotel._id);
        deletedHotels++;
      }
    }

    // Then delete events
    for (const eventName of testEventNames) {
      const events = await ctx.db
        .query("events")
        .filter((q) => q.eq(q.field("name"), eventName))
        .collect();

      for (const event of events) {
        await ctx.db.delete(event._id);
        deletedEvents++;
      }
    }

    return {
      success: true,
      message: `Deleted ${deletedEvents} events and ${deletedHotels} hotel packages`,
    };
  },
});
