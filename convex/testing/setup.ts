import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { hash } from "bcryptjs";

// Test data constants
const TEST_USER_EMAIL = "e2e-test@stepperslife.com";
const TEST_USER_PASSWORD = "TestPassword123!";
const TEST_EVENT_PREFIX = "E2E Test Event";

/**
 * Create a test user for E2E testing
 */
export const createTestUser = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if test user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", TEST_USER_EMAIL))
      .first();

    if (existingUser) {
      return { userId: existingUser._id, email: TEST_USER_EMAIL, created: false };
    }

    // Hash the password
    const passwordHash = await hash(TEST_USER_PASSWORD, 10);

    // Create the test user
    const userId = await ctx.db.insert("users", {
      name: "E2E Test User",
      email: TEST_USER_EMAIL,
      emailVerified: true,
      role: "user",
      passwordHash,
      authProvider: "password",
      canCreateTicketedEvents: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { userId, email: TEST_USER_EMAIL, created: true };
  },
});

/**
 * Create a test organizer for E2E testing
 */
export const createTestOrganizer = mutation({
  args: {},
  handler: async (ctx) => {
    const organizerEmail = "e2e-organizer@stepperslife.com";

    // Check if test organizer already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", organizerEmail))
      .first();

    if (existingUser) {
      return { userId: existingUser._id, email: organizerEmail, created: false };
    }

    // Hash the password
    const passwordHash = await hash(TEST_USER_PASSWORD, 10);

    // Create the test organizer
    const userId = await ctx.db.insert("users", {
      name: "E2E Test Organizer",
      email: organizerEmail,
      emailVerified: true,
      role: "organizer",
      passwordHash,
      authProvider: "password",
      canCreateTicketedEvents: true,
      acceptsStripePayments: true,
      acceptsPaypalPayments: true,
      acceptsCashPayments: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { userId, email: organizerEmail, created: true };
  },
});

/**
 * Create a test event with ticket tiers
 */
export const createTestEvent = mutation({
  args: {
    organizerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if test event already exists
    const existingEvent = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("name"), `${TEST_EVENT_PREFIX} - General`))
      .first();

    if (existingEvent) {
      return { eventId: existingEvent._id, created: false };
    }

    // Create event 7 days in the future
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 7);
    eventDate.setHours(20, 0, 0, 0); // 8 PM

    const endDate = new Date(eventDate);
    endDate.setHours(23, 0, 0, 0); // 11 PM

    // Create the test event
    const eventId = await ctx.db.insert("events", {
      name: `${TEST_EVENT_PREFIX} - General`,
      description: "This is an E2E test event for automated testing. Do not use for production.",
      organizerId: args.organizerId,
      organizerName: "E2E Test Organizer",
      eventType: "TICKETED_EVENT",
      eventDateLiteral: eventDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      eventTimeLiteral: "8:00 PM - 11:00 PM",
      eventTimezone: "America/New_York",
      startDate: eventDate.getTime(),
      endDate: endDate.getTime(),
      location: {
        venueName: "E2E Test Venue",
        address: "123 Test Street",
        city: "Atlanta",
        state: "GA",
        zipCode: "30301",
        country: "USA",
      },
      categories: ["Test", "E2E"],
      status: "PUBLISHED",
      ticketsVisible: true,
      paymentModelSelected: true,
      ticketsSold: 0,
      allowWaitlist: true,
      allowTransfers: true,
      maxTicketsPerOrder: 10,
      minTicketsPerOrder: 1,
      capacity: 500,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create ticket tiers
    const now = Date.now();
    const saleEnd = eventDate.getTime();

    // General Admission - $25
    await ctx.db.insert("ticketTiers", {
      eventId,
      name: "General Admission",
      description: "Standard entry to the event",
      price: 2500, // $25.00 in cents
      quantity: 100,
      sold: 0,
      saleStart: now,
      saleEnd,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // VIP - $75
    await ctx.db.insert("ticketTiers", {
      eventId,
      name: "VIP",
      description: "VIP access with premium perks",
      price: 7500, // $75.00 in cents
      quantity: 50,
      sold: 0,
      saleStart: now,
      saleEnd,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Free Tier - $0
    await ctx.db.insert("ticketTiers", {
      eventId,
      name: "Free Entry",
      description: "Complimentary admission",
      price: 0,
      quantity: 25,
      sold: 0,
      saleStart: now,
      saleEnd,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { eventId, created: true };
  },
});

/**
 * Create payment config for test event
 */
export const createTestPaymentConfig = mutation({
  args: {
    eventId: v.id("events"),
    organizerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if config already exists
    const existingConfig = await ctx.db
      .query("eventPaymentConfig")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (existingConfig) {
      return { configId: existingConfig._id, created: false };
    }

    // Create CREDIT_CARD payment config
    const configId = await ctx.db.insert("eventPaymentConfig", {
      eventId: args.eventId,
      organizerId: args.organizerId,
      paymentModel: "CREDIT_CARD",
      customerPaymentMethods: ["STRIPE", "PAYPAL", "CASH"],
      platformFeePercent: 3.7,
      platformFeeFixed: 179, // $1.79 in cents
      processingFeePercent: 2.9,
      charityDiscount: false,
      lowPriceDiscount: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Mark event as having payment model selected
    await ctx.db.patch(args.eventId, {
      paymentModelSelected: true,
    });

    return { configId, created: true };
  },
});

/**
 * Setup all test data at once
 */
export const setupAllTestData = mutation({
  args: {},
  handler: async (ctx) => {
    // Create test user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", TEST_USER_EMAIL))
      .first();

    let userId;
    if (existingUser) {
      userId = existingUser._id;
    } else {
      const passwordHash = await hash(TEST_USER_PASSWORD, 10);
      userId = await ctx.db.insert("users", {
        name: "E2E Test User",
        email: TEST_USER_EMAIL,
        emailVerified: true,
        role: "user",
        passwordHash,
        authProvider: "password",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Create test organizer
    const organizerEmail = "e2e-organizer@stepperslife.com";
    const existingOrganizer = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", organizerEmail))
      .first();

    let organizerId;
    if (existingOrganizer) {
      organizerId = existingOrganizer._id;
    } else {
      const passwordHash = await hash(TEST_USER_PASSWORD, 10);
      organizerId = await ctx.db.insert("users", {
        name: "E2E Test Organizer",
        email: organizerEmail,
        emailVerified: true,
        role: "organizer",
        passwordHash,
        authProvider: "password",
        canCreateTicketedEvents: true,
        acceptsStripePayments: true,
        acceptsPaypalPayments: true,
        acceptsCashPayments: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Check if test event already exists
    const existingEvent = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("name"), `${TEST_EVENT_PREFIX} - General`))
      .first();

    let eventId;
    if (existingEvent) {
      eventId = existingEvent._id;
    } else {
      // Create event
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + 7);
      eventDate.setHours(20, 0, 0, 0);

      const endDate = new Date(eventDate);
      endDate.setHours(23, 0, 0, 0);

      eventId = await ctx.db.insert("events", {
        name: `${TEST_EVENT_PREFIX} - General`,
        description: "E2E test event for automated testing",
        organizerId,
        organizerName: "E2E Test Organizer",
        eventType: "TICKETED_EVENT",
        startDate: eventDate.getTime(),
        endDate: endDate.getTime(),
        location: {
          venueName: "E2E Test Venue",
          address: "123 Test Street",
          city: "Atlanta",
          state: "GA",
          zipCode: "30301",
          country: "USA",
        },
        categories: ["Test", "E2E"],
        status: "PUBLISHED",
        ticketsVisible: true,
        paymentModelSelected: true,
        ticketsSold: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create ticket tiers
      const now = Date.now();
      const saleEnd = eventDate.getTime();

      await ctx.db.insert("ticketTiers", {
        eventId,
        name: "General Admission",
        description: "Standard entry",
        price: 2500,
        quantity: 100,
        sold: 0,
        saleStart: now,
        saleEnd,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("ticketTiers", {
        eventId,
        name: "VIP",
        description: "VIP access",
        price: 7500,
        quantity: 50,
        sold: 0,
        saleStart: now,
        saleEnd,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("ticketTiers", {
        eventId,
        name: "Free Entry",
        description: "Complimentary",
        price: 0,
        quantity: 25,
        sold: 0,
        saleStart: now,
        saleEnd,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create payment config
      await ctx.db.insert("eventPaymentConfig", {
        eventId,
        organizerId,
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

      // Mark event as having payment model selected
      await ctx.db.patch(eventId, {
        paymentModelSelected: true,
      });
    }

    return {
      userId,
      organizerId,
      eventId,
      testUserEmail: TEST_USER_EMAIL,
      testUserPassword: TEST_USER_PASSWORD,
    };
  },
});

/**
 * Get test event by name prefix
 */
export const getTestEvent = query({
  args: {},
  handler: async (ctx) => {
    const event = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("name"), `${TEST_EVENT_PREFIX} - General`))
      .first();

    if (!event) return null;

    // Get ticket tiers
    const tiers = await ctx.db
      .query("ticketTiers")
      .filter((q) => q.eq(q.field("eventId"), event._id))
      .collect();

    return { event, tiers };
  },
});

/**
 * Cleanup all test data
 */
export const cleanupTestData = mutation({
  args: {},
  handler: async (ctx) => {
    let deletedCount = {
      users: 0,
      events: 0,
      ticketTiers: 0,
      tickets: 0,
      orders: 0,
      paymentConfigs: 0,
    };

    // Find test event
    const testEvent = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("name"), `${TEST_EVENT_PREFIX} - General`))
      .first();

    if (testEvent) {
      // Delete tickets for this event
      const tickets = await ctx.db
        .query("tickets")
        .filter((q) => q.eq(q.field("eventId"), testEvent._id))
        .collect();

      for (const ticket of tickets) {
        await ctx.db.delete(ticket._id);
        deletedCount.tickets++;
      }

      // Delete orders for this event
      const orders = await ctx.db
        .query("orders")
        .filter((q) => q.eq(q.field("eventId"), testEvent._id))
        .collect();

      for (const order of orders) {
        await ctx.db.delete(order._id);
        deletedCount.orders++;
      }

      // Delete ticket tiers
      const tiers = await ctx.db
        .query("ticketTiers")
        .filter((q) => q.eq(q.field("eventId"), testEvent._id))
        .collect();

      for (const tier of tiers) {
        await ctx.db.delete(tier._id);
        deletedCount.ticketTiers++;
      }

      // Delete payment config
      const paymentConfig = await ctx.db
        .query("eventPaymentConfig")
        .withIndex("by_event", (q) => q.eq("eventId", testEvent._id))
        .first();

      if (paymentConfig) {
        await ctx.db.delete(paymentConfig._id);
        deletedCount.paymentConfigs++;
      }

      // Delete event
      await ctx.db.delete(testEvent._id);
      deletedCount.events++;
    }

    // Delete test users
    const testEmails = [TEST_USER_EMAIL, "e2e-organizer@stepperslife.com"];
    for (const email of testEmails) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (user) {
        await ctx.db.delete(user._id);
        deletedCount.users++;
      }
    }

    // Also delete any dynamically created test users (e2e-timestamp@test.com pattern)
    const allUsers = await ctx.db.query("users").collect();
    for (const user of allUsers) {
      if (user.email?.startsWith("e2e-") && user.email?.endsWith("@test.com")) {
        await ctx.db.delete(user._id);
        deletedCount.users++;
      }
    }

    return deletedCount;
  },
});
