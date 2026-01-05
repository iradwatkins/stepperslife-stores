import { internalMutation, mutation } from "../_generated/server";
import { requireAdmin } from "../lib/auth";
import { Id } from "../_generated/dataModel";

/**
 * Seed test hotel packages for viewing the hotel UI
 * Run with: npx convex run hotels/seed:createTestHotels
 */
export const createTestHotels = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find published ticketed events to attach hotels to
    const events = await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "PUBLISHED"),
          q.eq(q.field("eventType"), "TICKETED_EVENT")
        )
      )
      .take(3);

    if (events.length === 0) {
      throw new Error("No published ticketed events found. Create some events first.");
    }

    const now = Date.now();
    const createdHotels: string[] = [];

    // Hotel 1: Marriott Downtown (Luxury) - attached to first event
    if (events[0] && events[0].organizerId) {
      const event = events[0];
      const organizerId = event.organizerId as Id<"users">;
      const checkInDate = event.startDate
        ? event.startDate - 24 * 60 * 60 * 1000 // Day before event
        : now + 7 * 24 * 60 * 60 * 1000;
      const checkOutDate = event.endDate
        ? event.endDate + 24 * 60 * 60 * 1000 // Day after event
        : now + 10 * 24 * 60 * 60 * 1000;

      const hotelId = await ctx.db.insert("hotelPackages", {
        eventId: event._id,
        organizerId,
        hotelName: "Marriott Downtown Chicago",
        address: "540 N Michigan Ave",
        city: "Chicago",
        state: "IL",
        description:
          "Experience luxury in the heart of downtown Chicago. Our 4-star hotel offers stunning views of the Magnificent Mile, world-class dining, and first-class amenities for the discerning traveler.",
        amenities: ["wifi", "parking", "breakfast", "pool", "gym", "restaurant"],
        starRating: 4,
        images: [
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=800&fit=crop",
          "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop",
        ],
        roomTypes: [
          {
            id: "marriott-std-king",
            name: "Standard King",
            pricePerNightCents: 14900,
            quantity: 15,
            sold: 0,
            maxGuests: 2,
            description: "Spacious room with king bed, city views, and luxury linens",
          },
          {
            id: "marriott-deluxe-suite",
            name: "Deluxe Suite",
            pricePerNightCents: 24900,
            quantity: 8,
            sold: 0,
            maxGuests: 4,
            description: "Elegant suite with separate living area, king bed, and panoramic views",
          },
          {
            id: "marriott-presidential",
            name: "Presidential Suite",
            pricePerNightCents: 44900,
            quantity: 2,
            sold: 0,
            maxGuests: 6,
            description: "Ultimate luxury with 2 bedrooms, dining room, and private terrace",
          },
        ],
        checkInDate,
        checkOutDate,
        bookingCutoffHours: 48,
        specialInstructions:
          "Check-in starts at 3 PM. Early check-in available upon request. Valet parking available for $45/night.",
        contactName: "Marriott Reservations",
        contactPhone: "(312) 555-0100",
        contactEmail: "reservations@marriott-chi.example.com",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      createdHotels.push(`Marriott Downtown Chicago (${hotelId}) → ${event.name}`);
    }

    // Hotel 2: Hampton Inn (Mid-Range) - attached to second event
    if (events[1] && events[1].organizerId) {
      const event = events[1];
      const organizerId = event.organizerId as Id<"users">;
      const checkInDate = event.startDate
        ? event.startDate - 24 * 60 * 60 * 1000
        : now + 14 * 24 * 60 * 60 * 1000;
      const checkOutDate = event.endDate
        ? event.endDate + 24 * 60 * 60 * 1000
        : now + 17 * 24 * 60 * 60 * 1000;

      const hotelId = await ctx.db.insert("hotelPackages", {
        eventId: event._id,
        organizerId,
        hotelName: "Hampton Inn & Suites Atlanta",
        address: "225 Peachtree St NE",
        city: "Atlanta",
        state: "GA",
        description:
          "Comfortable and convenient accommodations in the heart of Atlanta. Perfect for event attendees looking for value without sacrificing quality. Free hot breakfast included!",
        amenities: ["wifi", "parking", "breakfast"],
        starRating: 3,
        images: [
          "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&h=800&fit=crop",
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop",
        ],
        roomTypes: [
          {
            id: "hampton-std-queen",
            name: "Standard Queen",
            pricePerNightCents: 9900,
            quantity: 20,
            sold: 0,
            maxGuests: 2,
            description: "Cozy room with queen bed, work desk, and free WiFi",
          },
          {
            id: "hampton-dbl-queen",
            name: "Double Queen",
            pricePerNightCents: 11900,
            quantity: 15,
            sold: 0,
            maxGuests: 4,
            description: "Spacious room with two queen beds, perfect for families or groups",
          },
        ],
        checkInDate,
        checkOutDate,
        bookingCutoffHours: 24,
        specialInstructions:
          "Free hot breakfast served 6-10 AM daily. Free self-parking included. Check-in at 3 PM.",
        contactName: "Hampton Inn Front Desk",
        contactPhone: "(404) 555-0200",
        contactEmail: "atlanta@hamptoninn.example.com",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      createdHotels.push(`Hampton Inn & Suites Atlanta (${hotelId}) → ${event.name}`);
    }

    // Hotel 3: Holiday Inn Express (Budget-Friendly) - attached to third event
    if (events[2] && events[2].organizerId) {
      const event = events[2];
      const organizerId = event.organizerId as Id<"users">;
      const checkInDate = event.startDate
        ? event.startDate - 24 * 60 * 60 * 1000
        : now + 21 * 24 * 60 * 60 * 1000;
      const checkOutDate = event.endDate
        ? event.endDate + 24 * 60 * 60 * 1000
        : now + 24 * 24 * 60 * 60 * 1000;

      const hotelId = await ctx.db.insert("hotelPackages", {
        eventId: event._id,
        organizerId,
        hotelName: "Holiday Inn Express Detroit",
        address: "1020 Washington Blvd",
        city: "Detroit",
        state: "MI",
        description:
          "Smart, simple, and affordable. Our Holiday Inn Express offers everything you need for a comfortable stay - including complimentary breakfast and an indoor pool.",
        amenities: ["wifi", "breakfast", "pool"],
        starRating: 3,
        images: [
          "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&h=800&fit=crop",
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop",
        ],
        roomTypes: [
          {
            id: "hiex-standard",
            name: "Standard Room",
            pricePerNightCents: 7900,
            quantity: 25,
            sold: 0,
            maxGuests: 2,
            description: "Clean, comfortable room with choice of king or two double beds",
          },
          {
            id: "hiex-suite",
            name: "Junior Suite",
            pricePerNightCents: 12900,
            quantity: 10,
            sold: 0,
            maxGuests: 4,
            description: "Extra space with sitting area, mini-fridge, and microwave",
          },
        ],
        checkInDate,
        checkOutDate,
        bookingCutoffHours: 12,
        specialInstructions:
          "Express Start Breakfast Bar opens at 6 AM. Indoor pool hours: 7 AM - 10 PM. Free parking available.",
        contactName: "Holiday Inn Express Reservations",
        contactPhone: "(313) 555-0300",
        contactEmail: "detroit@hiexpress.example.com",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      createdHotels.push(`Holiday Inn Express Detroit (${hotelId}) → ${event.name}`);
    }

    return {
      success: true,
      message: `Created ${createdHotels.length} test hotel packages`,
      hotels: createdHotels,
      eventsUsed: events.map((e) => ({ id: e._id, name: e.name })),
    };
  },
});

/**
 * Admin-callable version of createTestHotels
 * Call this from the browser while logged in as admin
 */
export const seedTestHotels = mutation({
  args: {},
  handler: async (ctx) => {
    // Require admin access
    await requireAdmin(ctx);

    // Find published ticketed events to attach hotels to
    const events = await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "PUBLISHED"),
          q.eq(q.field("eventType"), "TICKETED_EVENT")
        )
      )
      .take(3);

    if (events.length === 0) {
      throw new Error("No published ticketed events found. Create some events first.");
    }

    const now = Date.now();
    const createdHotels: string[] = [];

    // Hotel 1: Marriott Downtown (Luxury) - attached to first event
    if (events[0] && events[0].organizerId) {
      const event = events[0];
      const organizerId = event.organizerId as Id<"users">;
      const checkInDate = event.startDate
        ? event.startDate - 24 * 60 * 60 * 1000
        : now + 7 * 24 * 60 * 60 * 1000;
      const checkOutDate = event.endDate
        ? event.endDate + 24 * 60 * 60 * 1000
        : now + 10 * 24 * 60 * 60 * 1000;

      const hotelId = await ctx.db.insert("hotelPackages", {
        eventId: event._id,
        organizerId,
        hotelName: "Marriott Downtown Chicago",
        address: "540 N Michigan Ave",
        city: "Chicago",
        state: "IL",
        description:
          "Experience luxury in the heart of downtown Chicago. Our 4-star hotel offers stunning views of the Magnificent Mile, world-class dining, and first-class amenities for the discerning traveler.",
        amenities: ["wifi", "parking", "breakfast", "pool", "gym", "restaurant"],
        starRating: 4,
        images: [
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=800&fit=crop",
          "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop",
        ],
        roomTypes: [
          {
            id: "marriott-std-king",
            name: "Standard King",
            pricePerNightCents: 14900,
            quantity: 15,
            sold: 0,
            maxGuests: 2,
            description: "Spacious room with king bed, city views, and luxury linens",
          },
          {
            id: "marriott-deluxe-suite",
            name: "Deluxe Suite",
            pricePerNightCents: 24900,
            quantity: 8,
            sold: 0,
            maxGuests: 4,
            description: "Elegant suite with separate living area, king bed, and panoramic views",
          },
          {
            id: "marriott-presidential",
            name: "Presidential Suite",
            pricePerNightCents: 44900,
            quantity: 2,
            sold: 0,
            maxGuests: 6,
            description: "Ultimate luxury with 2 bedrooms, dining room, and private terrace",
          },
        ],
        checkInDate,
        checkOutDate,
        bookingCutoffHours: 48,
        specialInstructions:
          "Check-in starts at 3 PM. Early check-in available upon request. Valet parking available for $45/night.",
        contactName: "Marriott Reservations",
        contactPhone: "(312) 555-0100",
        contactEmail: "reservations@marriott-chi.example.com",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      createdHotels.push(`Marriott Downtown Chicago (${hotelId}) → ${event.name}`);
    }

    // Hotel 2: Hampton Inn (Mid-Range) - attached to second event
    if (events[1] && events[1].organizerId) {
      const event = events[1];
      const organizerId = event.organizerId as Id<"users">;
      const checkInDate = event.startDate
        ? event.startDate - 24 * 60 * 60 * 1000
        : now + 14 * 24 * 60 * 60 * 1000;
      const checkOutDate = event.endDate
        ? event.endDate + 24 * 60 * 60 * 1000
        : now + 17 * 24 * 60 * 60 * 1000;

      const hotelId = await ctx.db.insert("hotelPackages", {
        eventId: event._id,
        organizerId,
        hotelName: "Hampton Inn & Suites Atlanta",
        address: "225 Peachtree St NE",
        city: "Atlanta",
        state: "GA",
        description:
          "Comfortable and convenient accommodations in the heart of Atlanta. Perfect for event attendees looking for value without sacrificing quality. Free hot breakfast included!",
        amenities: ["wifi", "parking", "breakfast"],
        starRating: 3,
        images: [
          "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&h=800&fit=crop",
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop",
        ],
        roomTypes: [
          {
            id: "hampton-std-queen",
            name: "Standard Queen",
            pricePerNightCents: 9900,
            quantity: 20,
            sold: 0,
            maxGuests: 2,
            description: "Cozy room with queen bed, work desk, and free WiFi",
          },
          {
            id: "hampton-dbl-queen",
            name: "Double Queen",
            pricePerNightCents: 11900,
            quantity: 15,
            sold: 0,
            maxGuests: 4,
            description: "Spacious room with two queen beds, perfect for families or groups",
          },
        ],
        checkInDate,
        checkOutDate,
        bookingCutoffHours: 24,
        specialInstructions:
          "Free hot breakfast served 6-10 AM daily. Free self-parking included. Check-in at 3 PM.",
        contactName: "Hampton Inn Front Desk",
        contactPhone: "(404) 555-0200",
        contactEmail: "atlanta@hamptoninn.example.com",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      createdHotels.push(`Hampton Inn & Suites Atlanta (${hotelId}) → ${event.name}`);
    }

    // Hotel 3: Holiday Inn Express (Budget-Friendly) - attached to third event
    if (events[2] && events[2].organizerId) {
      const event = events[2];
      const organizerId = event.organizerId as Id<"users">;
      const checkInDate = event.startDate
        ? event.startDate - 24 * 60 * 60 * 1000
        : now + 21 * 24 * 60 * 60 * 1000;
      const checkOutDate = event.endDate
        ? event.endDate + 24 * 60 * 60 * 1000
        : now + 24 * 24 * 60 * 60 * 1000;

      const hotelId = await ctx.db.insert("hotelPackages", {
        eventId: event._id,
        organizerId,
        hotelName: "Holiday Inn Express Detroit",
        address: "1020 Washington Blvd",
        city: "Detroit",
        state: "MI",
        description:
          "Smart, simple, and affordable. Our Holiday Inn Express offers everything you need for a comfortable stay - including complimentary breakfast and an indoor pool.",
        amenities: ["wifi", "breakfast", "pool"],
        starRating: 3,
        images: [
          "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&h=800&fit=crop",
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop",
        ],
        roomTypes: [
          {
            id: "hiex-standard",
            name: "Standard Room",
            pricePerNightCents: 7900,
            quantity: 25,
            sold: 0,
            maxGuests: 2,
            description: "Clean, comfortable room with choice of king or two double beds",
          },
          {
            id: "hiex-suite",
            name: "Junior Suite",
            pricePerNightCents: 12900,
            quantity: 10,
            sold: 0,
            maxGuests: 4,
            description: "Extra space with sitting area, mini-fridge, and microwave",
          },
        ],
        checkInDate,
        checkOutDate,
        bookingCutoffHours: 12,
        specialInstructions:
          "Express Start Breakfast Bar opens at 6 AM. Indoor pool hours: 7 AM - 10 PM. Free parking available.",
        contactName: "Holiday Inn Express Reservations",
        contactPhone: "(313) 555-0300",
        contactEmail: "detroit@hiexpress.example.com",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      createdHotels.push(`Holiday Inn Express Detroit (${hotelId}) → ${event.name}`);
    }

    return {
      success: true,
      message: `Created ${createdHotels.length} test hotel packages`,
      hotels: createdHotels,
      eventsUsed: events.map((e) => ({ id: e._id, name: e.name })),
    };
  },
});

/**
 * Update existing hotels with images
 * Run with: npx convex run hotels/seed:updateHotelImages
 */
export const updateHotelImages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const hotelImages: Record<string, string[]> = {
      "Marriott Downtown Chicago": [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=800&fit=crop",
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop",
      ],
      "Hampton Inn & Suites Atlanta": [
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&h=800&fit=crop",
        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=600&fit=crop",
      ],
      "Holiday Inn Express Detroit": [
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&h=800&fit=crop",
        "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&h=600&fit=crop",
      ],
    };

    const updated: string[] = [];

    for (const [hotelName, images] of Object.entries(hotelImages)) {
      const hotels = await ctx.db
        .query("hotelPackages")
        .filter((q) => q.eq(q.field("hotelName"), hotelName))
        .collect();

      for (const hotel of hotels) {
        await ctx.db.patch(hotel._id, { images, updatedAt: Date.now() });
        updated.push(`${hotelName} (${hotel._id})`);
      }
    }

    return {
      success: true,
      message: `Updated ${updated.length} hotels with images`,
      hotels: updated,
    };
  },
});

/**
 * Delete all test hotels (cleanup)
 * Run with: npx convex run hotels/seed:deleteTestHotels
 */
export const deleteTestHotels = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Delete hotels with test names
    const testHotelNames = [
      "Marriott Downtown Chicago",
      "Hampton Inn & Suites Atlanta",
      "Holiday Inn Express Detroit",
    ];

    let deleted = 0;
    for (const hotelName of testHotelNames) {
      const hotels = await ctx.db
        .query("hotelPackages")
        .filter((q) => q.eq(q.field("hotelName"), hotelName))
        .collect();

      for (const hotel of hotels) {
        await ctx.db.delete(hotel._id);
        deleted++;
      }
    }

    return {
      success: true,
      message: `Deleted ${deleted} test hotel packages`,
    };
  },
});
