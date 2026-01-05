import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Helper to create dates for test events
function createEventDate(year: number, month: number, day: number, hour: number = 20): number {
  const date = new Date(year, month - 1, day, hour, 0, 0, 0);
  return date.getTime();
}

// Seed test events
export const seedEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get organizer user IDs
    const organizer1 = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "organizer@thestepperslife.com"))
      .unique();

    const organizer2 = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "organizer2@thestepperslife.com"))
      .unique();

    if (!organizer1 || !organizer2) {
      throw new Error("Organizers not found. Run seedUsers first.");
    }

    const events = [
      // 1. Chicago Winter Steppers Ball - TICKETED_EVENT (ball)
      {
        name: "Chicago Winter Steppers Ball",
        description: "Join us for the premier stepping event of the winter season. Featuring live music, competitions, and an unforgettable night of elegant dancing. This formal ball showcases the best steppers from across the Midwest.",
        organizerId: organizer1._id,
        organizerName: "Event Organizer",
        eventType: "TICKETED_EVENT" as const,
        eventSubType: "ball" as const,
        eventDateLiteral: "Saturday, January 25, 2026",
        eventTimeLiteral: "8:00 PM - 2:00 AM",
        eventTimezone: "America/Chicago",
        startDate: createEventDate(2026, 1, 25, 20),
        endDate: createEventDate(2026, 1, 26, 2),
        location: {
          venueName: "The Grand Ballroom",
          address: "500 N Michigan Ave",
          city: "Chicago",
          state: "IL",
          zipCode: "60611",
          country: "USA",
        },
        categories: ["Ball", "Competition", "Formal"],
        dressCode: "black_tie" as const,
        beginnerFriendly: false,
        status: "PUBLISHED" as const,
        ticketsVisible: true,
        paymentModelSelected: true,
        capacity: 500,
        ticketsSold: 0,
        allowWaitlist: true,
        allowTransfers: true,
        maxTicketsPerOrder: 10,
        minTicketsPerOrder: 1,
        imageUrl: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800",
        createdAt: now,
        updatedAt: now,
        ticketTiers: [
          { name: "VIP", description: "VIP seating with premium view and complimentary champagne", price: 10000, quantity: 50 },
          { name: "General Admission", description: "Standard entry to the ball", price: 6000, quantity: 300 },
          { name: "Early Bird", description: "Early bird special - limited availability", price: 4500, quantity: 100 },
        ],
      },

      // 2. MLK Weekend Set - TICKETED_EVENT (set)
      {
        name: "MLK Weekend Set",
        description: "Celebrate the legacy of Dr. Martin Luther King Jr. with an evening of soulful stepping. This beginner-friendly set includes a free lesson before the party. Come learn and dance with the Atlanta stepping community.",
        organizerId: organizer1._id,
        organizerName: "Event Organizer",
        eventType: "TICKETED_EVENT" as const,
        eventSubType: "set" as const,
        eventDateLiteral: "Saturday, January 18, 2026",
        eventTimeLiteral: "7:00 PM - 1:00 AM",
        eventTimezone: "America/New_York",
        startDate: createEventDate(2026, 1, 18, 19),
        endDate: createEventDate(2026, 1, 19, 1),
        location: {
          venueName: "The Velvet Room",
          address: "1021 Peachtree St NE",
          city: "Atlanta",
          state: "GA",
          zipCode: "30309",
          country: "USA",
        },
        categories: ["Set", "Beginner Friendly", "MLK Weekend"],
        dressCode: "stepping_attire" as const,
        beginnerFriendly: true,
        hasBeginnerLesson: true,
        beginnerLessonTime: "7:00 PM - 8:00 PM",
        status: "PUBLISHED" as const,
        ticketsVisible: true,
        paymentModelSelected: true,
        capacity: 300,
        ticketsSold: 0,
        allowWaitlist: true,
        allowTransfers: true,
        maxTicketsPerOrder: 8,
        minTicketsPerOrder: 1,
        imageUrl: "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800",
        createdAt: now,
        updatedAt: now,
        ticketTiers: [
          { name: "VIP", description: "VIP access with reserved seating", price: 7500, quantity: 30 },
          { name: "General Admission", description: "Standard entry with beginner lesson included", price: 4000, quantity: 200 },
        ],
      },

      // 3. Valentine's All White Affair - TICKETED_EVENT (set)
      {
        name: "Valentine's All White Affair",
        description: "Celebrate love and stepping at our annual Valentine's All White Affair. Dress in your finest white attire for an elegant evening of romance and dancing. Couples and singles welcome!",
        organizerId: organizer2._id,
        organizerName: "Second Organizer",
        eventType: "TICKETED_EVENT" as const,
        eventSubType: "set" as const,
        eventDateLiteral: "Saturday, February 14, 2026",
        eventTimeLiteral: "8:00 PM - 2:00 AM",
        eventTimezone: "America/Detroit",
        startDate: createEventDate(2026, 2, 14, 20),
        endDate: createEventDate(2026, 2, 15, 2),
        location: {
          venueName: "The Diamond Ballroom",
          address: "1 Washington Blvd",
          city: "Detroit",
          state: "MI",
          zipCode: "48226",
          country: "USA",
        },
        categories: ["Set", "All White", "Valentine's", "Couples"],
        dressCode: "all_white" as const,
        dressCodeDetails: "All white attire required. Ladies: white dresses, jumpsuits, or pantsuits. Gents: white slacks with white shirt or white suit.",
        beginnerFriendly: true,
        status: "PUBLISHED" as const,
        ticketsVisible: true,
        paymentModelSelected: true,
        capacity: 400,
        ticketsSold: 0,
        allowWaitlist: true,
        allowTransfers: true,
        maxTicketsPerOrder: 10,
        minTicketsPerOrder: 1,
        imageUrl: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800",
        createdAt: now,
        updatedAt: now,
        ticketTiers: [
          { name: "Couples Package", description: "Entry for two with complimentary rose", price: 8000, quantity: 150 },
          { name: "Single Admission", description: "Individual entry", price: 4500, quantity: 200 },
        ],
      },

      // 4. Spring Steppers Weekender - TICKETED_EVENT (weekender)
      {
        name: "Spring Steppers Weekender",
        description: "The ultimate stepping experience! Three days of workshops, parties, and community. Learn from renowned instructors, dance with steppers from across the nation, and make memories that last a lifetime. Hotel block available at Hilton Downtown.",
        organizerId: organizer1._id,
        organizerName: "Event Organizer",
        eventType: "TICKETED_EVENT" as const,
        eventSubType: "weekender" as const,
        eventDateLiteral: "March 14-16, 2026",
        eventTimeLiteral: "Various times throughout weekend",
        eventTimezone: "America/Chicago",
        startDate: createEventDate(2026, 3, 14, 12),
        endDate: createEventDate(2026, 3, 16, 23),
        location: {
          venueName: "Hilton Downtown St. Louis",
          address: "400 Olive St",
          city: "St. Louis",
          state: "MO",
          zipCode: "63102",
          country: "USA",
        },
        categories: ["Weekender", "Workshops", "Multi-day"],
        dressCode: "theme" as const,
        dressCodeDetails: "Friday: Casual. Saturday Daytime: Comfortable for workshops. Saturday Night: Elegant stepping attire. Sunday Brunch: Smart casual.",
        beginnerFriendly: true,
        hasBeginnerLesson: true,
        beginnerLessonTime: "Saturday 10:00 AM - 12:00 PM (Beginner Workshop)",
        hotelBlock: {
          hotelName: "Hilton Downtown St. Louis",
          bookingUrl: "https://www.hilton.com/en/hotels/stlhhhf-hilton-st-louis-downtown/",
          groupCode: "STEP2026",
          rate: "$119/night",
          cutoffDate: createEventDate(2026, 2, 28, 23),
          notes: "Use code STEP2026 when booking. Rate includes breakfast.",
        },
        status: "PUBLISHED" as const,
        ticketsVisible: true,
        paymentModelSelected: true,
        capacity: 600,
        ticketsSold: 0,
        allowWaitlist: true,
        allowTransfers: true,
        maxTicketsPerOrder: 6,
        minTicketsPerOrder: 1,
        imageUrl: "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=800",
        createdAt: now,
        updatedAt: now,
        ticketTiers: [
          { name: "Full Weekend Pass", description: "Access to all workshops, parties, and Sunday brunch", price: 20000, quantity: 200 },
          { name: "Friday Only", description: "Friday welcome party only", price: 6000, quantity: 100 },
          { name: "Saturday Only", description: "Saturday workshops and party", price: 7500, quantity: 100 },
          { name: "Sunday Brunch", description: "Sunday farewell brunch only", price: 4000, quantity: 80 },
        ],
      },

      // 5. Free Practice Social - FREE_EVENT (social)
      {
        name: "Free Practice Social",
        description: "Join our weekly practice social! Perfect for beginners looking to practice their steps in a relaxed, no-pressure environment. Experienced steppers welcome to help and dance. Free admission, just bring your dancing shoes!",
        organizerId: organizer1._id,
        organizerName: "Event Organizer",
        eventType: "FREE_EVENT" as const,
        eventSubType: "social" as const,
        eventDateLiteral: "Sunday, January 11, 2026",
        eventTimeLiteral: "3:00 PM - 7:00 PM",
        eventTimezone: "America/Chicago",
        startDate: createEventDate(2026, 1, 11, 15),
        endDate: createEventDate(2026, 1, 11, 19),
        location: {
          venueName: "South Side Community Center",
          address: "2020 E 71st St",
          city: "Chicago",
          state: "IL",
          zipCode: "60649",
          country: "USA",
        },
        categories: ["Social", "Practice", "Free", "Beginner Friendly"],
        dressCode: "casual" as const,
        beginnerFriendly: true,
        status: "PUBLISHED" as const,
        ticketsVisible: false,
        paymentModelSelected: false,
        capacity: 100,
        ticketsSold: 0,
        doorPrice: "Free",
        imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
        createdAt: now,
        updatedAt: now,
        ticketTiers: [],
      },

      // 6. Summer Save the Date - SAVE_THE_DATE
      {
        name: "Summer Soul Steppers Celebration",
        description: "Mark your calendars! The biggest stepping event of the summer is coming to Memphis. More details coming soon. Sign up for updates to be the first to know when tickets go on sale.",
        organizerId: organizer2._id,
        organizerName: "Second Organizer",
        eventType: "SAVE_THE_DATE" as const,
        eventDateLiteral: "Saturday, July 4, 2026",
        eventTimeLiteral: "TBD",
        eventTimezone: "America/Chicago",
        startDate: createEventDate(2026, 7, 4, 20),
        endDate: createEventDate(2026, 7, 5, 2),
        location: {
          venueName: "TBD - Memphis Area",
          city: "Memphis",
          state: "TN",
          country: "USA",
        },
        categories: ["Save the Date", "Summer", "Independence Day"],
        beginnerFriendly: true,
        status: "PUBLISHED" as const,
        ticketsVisible: false,
        paymentModelSelected: false,
        capacity: 800,
        ticketsSold: 0,
        imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
        createdAt: now,
        updatedAt: now,
        ticketTiers: [],
      },
    ];

    const results: { name: string; created: boolean; eventId?: string }[] = [];

    for (const eventData of events) {
      const { ticketTiers, ...event } = eventData;

      // Check if event already exists
      const existing = await ctx.db
        .query("events")
        .filter((q) => q.eq(q.field("name"), event.name))
        .first();

      if (existing) {
        results.push({ name: event.name, created: false, eventId: existing._id });
        continue;
      }

      // Create the event
      const eventId = await ctx.db.insert("events", event);

      // Create ticket tiers if any
      if (ticketTiers && ticketTiers.length > 0) {
        const saleEnd = event.startDate;

        for (const tier of ticketTiers) {
          await ctx.db.insert("ticketTiers", {
            eventId,
            name: tier.name,
            description: tier.description,
            price: tier.price,
            quantity: tier.quantity,
            sold: 0,
            saleStart: now,
            saleEnd,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Update event with ticket tier count
        await ctx.db.patch(eventId, {
          ticketTierCount: ticketTiers.length,
        });
      }

      // Create payment config for ticketed events
      if (event.eventType === "TICKETED_EVENT") {
        await ctx.db.insert("eventPaymentConfig", {
          eventId,
          organizerId: event.organizerId,
          paymentModel: "CREDIT_CARD",
          customerPaymentMethods: ["STRIPE", "PAYPAL", "CASH"],
          platformFeePercent: 3.7,
          platformFeeFixed: 179,
          processingFeePercent: 2.9,
          charityDiscount: false,
          lowPriceDiscount: false,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      results.push({ name: event.name, created: true, eventId });
    }

    const created = results.filter((r) => r.created).length;
    return {
      created,
      total: events.length,
      events: results,
    };
  },
});
