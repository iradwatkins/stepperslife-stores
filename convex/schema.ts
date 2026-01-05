import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Complete schema for SteppersLife Event Ticketing Platform
export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.string(),
    emailVerified: v.optional(v.boolean()),
    image: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("organizer"), v.literal("instructor"), v.literal("restaurateur"), v.literal("user"))),
    // Authentication
    passwordHash: v.optional(v.string()), // bcrypt hash for classic login
    googleId: v.optional(v.string()), // Google OAuth user ID
    authProvider: v.optional(
      v.union(v.literal("password"), v.literal("google"), v.literal("magic_link"))
    ), // Which auth method was used (magic_link kept for existing users)
    // Legacy magic link fields (kept for existing users, no longer used)
    magicLinkToken: v.optional(v.string()),
    magicLinkExpiry: v.optional(v.number()),
    // Password Reset
    passwordResetToken: v.optional(v.string()), // Hashed token for password reset
    passwordResetExpiry: v.optional(v.number()), // Expiration timestamp (1 hour)
    // Permissions
    canCreateTicketedEvents: v.optional(v.boolean()), // Restrict organizers to only Save The Date/Free events
    // Stripe fields (for receiving ticket payments from customers)
    stripeCustomerId: v.optional(v.string()),
    stripeConnectedAccountId: v.optional(v.string()),
    stripeAccountSetupComplete: v.optional(v.boolean()),
    // PayPal fields (for receiving ticket payments from customers)
    paypalMerchantId: v.optional(v.string()),
    paypalAccountSetupComplete: v.optional(v.boolean()),
    paypalPartnerReferralId: v.optional(v.string()), // Partner Referrals API tracking ID
    paypalOnboardingStatus: v.optional(v.string()), // Onboarding status from PayPal
    // Payment processor preferences (which processors organizer accepts for ticket sales)
    acceptsStripePayments: v.optional(v.boolean()),
    acceptsPaypalPayments: v.optional(v.boolean()),
    acceptsCashPayments: v.optional(v.boolean()),
    // Onboarding
    welcomePopupShown: v.optional(v.boolean()), // Track if user has seen the 1000 free tickets welcome popup on event creation
    firstEventTicketPopupShown: v.optional(v.boolean()), // Track if user has seen the "Add Tickets" congratulations popup
    // Timestamps
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    // Legacy fields
    userId: v.optional(v.string()), // Legacy Clerk user ID
    stripeConnectId: v.optional(v.string()), // Legacy field (renamed to stripeConnectedAccountId)
    isAdmin: v.optional(v.boolean()), // Legacy field (migrated to role field)
    // Workspace preferences (Sprint 17)
    disabledWorkspaces: v.optional(v.array(v.string())), // Workspace IDs hidden from navigation
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_googleId", ["googleId"])
    .index("by_passwordResetToken", ["passwordResetToken"]),

  events: defineTable({
    // Basic info
    name: v.string(),
    description: v.string(),
    organizerId: v.optional(v.id("users")),
    organizerName: v.optional(v.string()),

    // Event type
    eventType: v.optional(
      v.union(
        v.literal("SAVE_THE_DATE"),
        v.literal("FREE_EVENT"),
        v.literal("TICKETED_EVENT"),
        v.literal("SEATED_EVENT"),
        v.literal("CLASS")
      )
    ),

    // Date/time - Literal Storage (NO TIMEZONE CONVERSIONS)
    // These fields store EXACTLY what the user enters
    eventDateLiteral: v.optional(v.string()), // Literal date string "2025-03-15" or "March 15, 2025"
    eventTimeLiteral: v.optional(v.string()), // Literal time string "8:00 PM" or "8:00 PM - 2:00 AM"
    eventTimezone: v.optional(v.string()), // Timezone "America/New_York", "EST", etc.

    // Legacy date/time fields (kept for backward compatibility and sorting)
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    timezone: v.optional(v.string()),

    // Location (supports both object and legacy string format)
    location: v.optional(
      v.union(
        v.object({
          venueName: v.optional(v.string()),
          address: v.optional(v.string()),
          city: v.string(),
          state: v.string(),
          zipCode: v.optional(v.string()),
          country: v.string(),
        }),
        v.string() // Legacy format: plain string address
      )
    ),

    // Media
    images: v.optional(v.array(v.id("_storage"))),
    imageUrl: v.optional(v.string()), // Temporary: external image URLs (e.g., Unsplash)

    // Categories
    categories: v.optional(v.array(v.string())),

    // Class-specific: Days of the week (0=Sunday, 1=Monday, ... 6=Saturday)
    classDays: v.optional(v.array(v.number())),

    // Class-specific: Skill level (Beginner, Intermediate, Advanced)
    classLevel: v.optional(v.string()),

    // Class-specific: Dance style (Steppin, Salsa, Bachata, etc.)
    danceStyle: v.optional(v.string()),

    // Class-specific: Duration in minutes (e.g., 60, 90, 120)
    duration: v.optional(v.number()),

    // Class-specific: Instructor reference for linking to instructor profiles
    instructorId: v.optional(v.id("instructors")),
    instructorSlug: v.optional(v.string()),

    // Recurring class series: Links all sessions of a recurring class together
    seriesId: v.optional(v.string()), // UUID shared by all sessions in a series
    seriesPosition: v.optional(v.number()), // Position in series (1, 2, 3...)

    // Class Series Configuration
    numberOfSessions: v.optional(v.number()), // Total sessions in the class series (1-12)
    classFrequency: v.optional(
      v.union(
        v.literal("weekly"),
        v.literal("bi-weekly"),
        v.literal("monthly")
      )
    ),
    seriesPriceCents: v.optional(v.number()), // Price to buy full series (in cents)
    doorPriceCents: v.optional(v.number()), // Per-class drop-in price (in cents, informational)

    // Status
    status: v.optional(
      v.union(
        v.literal("DRAFT"),
        v.literal("PUBLISHED"),
        v.literal("CANCELLED"),
        v.literal("COMPLETED")
      )
    ),

    // Payment & ticketing visibility
    ticketsVisible: v.optional(v.boolean()),
    paymentModelSelected: v.optional(v.boolean()),

    // Ticket stats (calculated fields)
    ticketsSold: v.optional(v.number()),
    ticketTierCount: v.optional(v.number()),

    // Settings
    allowWaitlist: v.optional(v.boolean()),
    allowTransfers: v.optional(v.boolean()),
    maxTicketsPerOrder: v.optional(v.number()),
    minTicketsPerOrder: v.optional(v.number()),
    capacity: v.optional(v.number()), // Event capacity (max attendees/tickets)

    // Free event specific
    doorPrice: v.optional(v.string()),

    // Social
    socialShareCount: v.optional(v.number()),

    // Culture-Specific Features (Stepping community terminology)
    // Event Sub-Type: More specific classification within eventType
    eventSubType: v.optional(
      v.union(
        v.literal("weekender"),  // Multi-day event with workshops + parties
        v.literal("set"),        // Evening dance party (5-6 hours)
        v.literal("ball"),       // Formal competition/showcase
        v.literal("workshop"),   // Learning/instruction focused
        v.literal("social")      // Informal practice/mixer
      )
    ),

    // Dress Code Requirements
    dressCode: v.optional(
      v.union(
        v.literal("all_white"),       // Popular summer theme
        v.literal("black_tie"),       // Formal events
        v.literal("stepping_attire"), // Standard elegant casual
        v.literal("casual"),          // Practice/social events
        v.literal("theme")            // Custom themed dress code
      )
    ),
    dressCodeDetails: v.optional(v.string()), // Custom description for "theme" events

    // Beginner Accessibility
    beginnerFriendly: v.optional(v.boolean()),
    hasBeginnerLesson: v.optional(v.boolean()),
    beginnerLessonTime: v.optional(v.string()), // e.g., "7:00 PM - 8:00 PM"

    // Hotel Block Information (for out-of-town guests)
    hotelBlock: v.optional(v.object({
      hotelName: v.string(),
      bookingUrl: v.string(),
      groupCode: v.optional(v.string()),
      rate: v.optional(v.string()),          // "$119/night"
      cutoffDate: v.optional(v.number()),    // Timestamp for booking deadline
      notes: v.optional(v.string()),
    })),

    // Timestamps
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),

    // Claiming system (for admin-created events that organizers can claim)
    isClaimable: v.optional(v.boolean()),
    claimCode: v.optional(v.string()),
    claimedAt: v.optional(v.number()),

    // Admin upload tracking (for events/classes uploaded by SteppersLife staff)
    uploadedByAdminId: v.optional(v.id("users")),
    isAdminUploaded: v.optional(v.boolean()),
    adminUploadedAt: v.optional(v.number()),

    // Legacy fields (for backward compatibility with old event schema)
    eventDate: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
    price: v.optional(v.number()),
    totalTickets: v.optional(v.number()),
    userId: v.optional(v.string()), // Legacy Clerk user ID
  })
    .index("by_organizer", ["organizerId"])
    .index("by_status", ["status"])
    .index("by_event_type", ["eventType"])
    .index("by_start_date", ["startDate"])
    .index("by_published", ["status", "startDate"])
    .index("by_claimable", ["isClaimable"])
    .index("by_series", ["seriesId"])
    .index("by_event_sub_type", ["eventSubType"])
    .index("by_beginner_friendly", ["beginnerFriendly", "status"]),

  // Organizer credit balance for pre-purchase model
  organizerCredits: defineTable({
    organizerId: v.id("users"),
    creditsTotal: v.number(),
    creditsUsed: v.number(),
    creditsRemaining: v.number(),
    firstEventFreeUsed: v.boolean(),
    firstEventId: v.optional(v.id("events")), // Track which event the free 1000 credits are for
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organizer", ["organizerId"]),

  // Credit purchase transactions
  creditTransactions: defineTable({
    organizerId: v.id("users"),
    ticketsPurchased: v.number(),
    amountPaid: v.number(), // in cents
    pricePerTicket: v.number(), // in cents
    stripePaymentIntentId: v.optional(v.string()),
    squarePaymentId: v.optional(v.string()), // DEPRECATED: Legacy Square payments - no longer used
    paypalOrderId: v.optional(v.string()),
    status: v.union(v.literal("PENDING"), v.literal("COMPLETED"), v.literal("FAILED")),
    purchasedAt: v.number(),
  })
    .index("by_organizer", ["organizerId"])
    .index("by_status", ["status"]),

  // Payment configuration per event
  eventPaymentConfig: defineTable({
    eventId: v.id("events"),
    organizerId: v.id("users"),

    // Payment model - Updated with clearer names (includes legacy for migration)
    paymentModel: v.union(
      v.literal("PREPAY"), // Formerly PRE_PURCHASE - Pay upfront for tickets
      v.literal("CREDIT_CARD"), // Formerly PAY_AS_SELL - Standard online payments
      v.literal("PRE_PURCHASE"), // Legacy - will be migrated to PREPAY
      v.literal("PAY_AS_SELL") // Legacy - will be migrated to CREDIT_CARD
    ),

    // For CREDIT_CARD model: Which payment processor handles split payments
    // Organizer chooses Stripe OR PayPal for automatic split payment
    merchantProcessor: v.optional(
      v.union(
        v.literal("STRIPE"),
        v.literal("PAYPAL")
      )
    ),

    // HOW ORGANIZER PAYS STEPPERSLIFE (for PREPAY model only)
    // Organizer purchases ticket credits FROM platform via Stripe or PayPal
    // NOTE: This is SEPARATE from customer payment methods - organizers pay the platform for capacity
    organizerPaymentMethod: v.optional(
      v.union(
        v.literal("STRIPE"),    // Stripe credit card payment (includes Cash App Pay via Stripe)
        v.literal("PAYPAL"),    // PayPal payment to platform
        // DEPRECATED: Legacy values - no longer used for new events
        v.literal("SQUARE"),    // Legacy: Square credit card payment
        v.literal("CASHAPP")    // Legacy: Cash App via Square SDK
      )
    ),

    // HOW CUSTOMERS PAY ORGANIZER (for ticket purchases)
    // Customer payment methods enabled for this event
    // NOTE: Cash App via Stripe is included in STRIPE option, NOT a separate method
    customerPaymentMethods: v.array(
      v.union(
        v.literal("CASH"),     // Physical USD cash at door (staff validated, default)
        v.literal("STRIPE"),   // Online credit/debit card via Stripe (includes Cash App via Stripe)
        v.literal("PAYPAL"),   // Online PayPal with split payment support
        v.literal("CASHAPP")   // DEPRECATED - Legacy support only (use STRIPE instead)
      )
    ),

    // Status
    isActive: v.boolean(),
    activatedAt: v.optional(v.number()),

    // Payment processor account IDs
    stripeConnectAccountId: v.optional(v.string()), // For Stripe payments
    paypalMerchantId: v.optional(v.string()), // For PayPal payments

    // PREPAY specific (formerly Pre-purchase)
    ticketsAllocated: v.optional(v.number()),

    // CREDIT_CARD fee structure (formerly Pay-as-sell)
    platformFeePercent: v.number(), // 3.7% or discounted
    platformFeeFixed: v.number(), // $1.79 in cents
    processingFeePercent: v.number(), // 2.9%

    // Discounts
    charityDiscount: v.boolean(),
    lowPriceDiscount: v.boolean(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_organizer", ["organizerId"])
    .index("by_payment_model", ["paymentModel"]),

  // Ticket tiers/types for events
  ticketTiers: defineTable({
    eventId: v.id("events"),
    name: v.string(), // "General Admission", "VIP", etc.
    description: v.optional(v.string()),
    price: v.number(), // Base price in cents (used if no pricingTiers)

    // Early Bird Pricing - time-based pricing tiers
    pricingTiers: v.optional(
      v.array(
        v.object({
          name: v.string(), // "Early Bird", "Regular", "Last Chance"
          price: v.number(), // Price in cents for this tier
          availableFrom: v.number(), // Start timestamp
          availableUntil: v.optional(v.number()), // End timestamp (optional for last tier)
        })
      )
    ),
    // If pricingTiers exists, system uses current tier price based on date
    // Otherwise falls back to base price field

    quantity: v.number(), // total available (for individual mode or legacy support)
    sold: v.number(), // number sold (for individual mode or legacy support)
    version: v.optional(v.number()), // PRODUCTION: Version number for optimistic locking to prevent race conditions
    saleStart: v.optional(v.number()),
    saleEnd: v.optional(v.number()),
    isActive: v.boolean(),

    // Multi-day events - track which day this tier is for
    dayNumber: v.optional(v.number()), // For multi-day events: 1, 2, 3, etc.

    // Table Package - Sell entire tables as single units
    isTablePackage: v.optional(v.boolean()), // LEGACY: True if this tier sells whole tables
    tableCapacity: v.optional(v.number()), // Number of seats per table (4, 6, 8, 10, etc.)
    // When isTablePackage=true, price is for entire table, not per seat

    // Mixed Allocation - Support both tables AND individual tickets in same tier
    allocationMode: v.optional(
      v.union(
        v.literal("individual"), // Default: sell individual tickets only
        v.literal("table"), // Sell entire tables only
        v.literal("mixed") // Sell BOTH tables AND individual tickets
      )
    ),
    tableQuantity: v.optional(v.number()), // LEGACY: Number of tables available (for table/mixed mode)
    tableSold: v.optional(v.number()), // Number of tables sold (for table/mixed mode)
    individualQuantity: v.optional(v.number()), // Individual tickets available (for mixed mode)
    individualSold: v.optional(v.number()), // Individual tickets sold (for mixed mode)
    // Multiple Table Groups - Support different table sizes in same tier
    tableGroups: v.optional(
      v.array(
        v.object({
          seatsPerTable: v.number(), // Seats in this table size (e.g., 4, 8)
          numberOfTables: v.number(), // How many tables of this size (e.g., 5)
          sold: v.optional(v.number()), // How many tables of this group sold
        })
      )
    ),
    // Total capacity = sum(each group: numberOfTables × seatsPerTable) + individualQuantity

    // First sale tracking - used to determine when tickets go "live"
    firstSaleAt: v.optional(v.number()), // Timestamp of first ticket sale for this tier

    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_event", ["eventId"]),

  // Ticket Bundles - Package multiple tickets together
  ticketBundles: defineTable({
    // Bundle type: single event or multi-event
    bundleType: v.optional(v.union(v.literal("SINGLE_EVENT"), v.literal("MULTI_EVENT"))), // Default: SINGLE_EVENT for backward compatibility

    // For single-event bundles (legacy & new)
    eventId: v.optional(v.id("events")), // Primary event (required for single-event, optional for multi-event)

    // For multi-event bundles
    eventIds: v.optional(v.array(v.id("events"))), // All events included in this bundle

    name: v.string(), // "3-Day Weekend Pass", "VIP Package", "Summer Series Bundle"
    description: v.optional(v.string()),
    price: v.number(), // Bundle price in cents

    // Which ticket tiers are included in this bundle
    includedTiers: v.array(
      v.object({
        tierId: v.id("ticketTiers"),
        tierName: v.string(), // Cache tier name for display
        quantity: v.number(), // Usually 1, but could be multiple
        // For multi-event bundles: track which event this tier belongs to
        eventId: v.optional(v.id("events")),
        eventName: v.optional(v.string()), // Cache event name for display
      })
    ),

    totalQuantity: v.number(), // Total bundles available
    sold: v.number(), // Number of bundles sold

    // Calculated savings (for display)
    regularPrice: v.optional(v.number()), // Sum of included tier prices
    savings: v.optional(v.number()), // How much saved vs buying separately

    saleStart: v.optional(v.number()),
    saleEnd: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .searchIndex("search_bundles", {
      searchField: "name",
      filterFields: ["bundleType", "isActive"],
    }),

  // Bundle purchases - tracks when users purchase ticket bundles
  bundlePurchases: defineTable({
    bundleId: v.id("ticketBundles"),
    userId: v.optional(v.id("users")), // Optional for guest purchases
    quantity: v.number(),
    buyerName: v.string(),
    buyerEmail: v.string(),
    buyerPhone: v.optional(v.string()),
    paymentId: v.string(), // Stripe/PayPal payment ID
    paymentStatus: v.string(), // "COMPLETED", "PENDING", "REFUNDED"
    totalPaidCents: v.number(),
    ticketIds: v.array(v.string()), // IDs of created tickets
    purchaseDate: v.number(),
    status: v.string(), // "COMPLETED", "CANCELLED", "REFUNDED"
    refundedAt: v.optional(v.number()),
    refundReason: v.optional(v.string()),
  })
    .index("by_bundle", ["bundleId"])
    .index("by_user", ["userId"])
    .index("by_email", ["buyerEmail"])
    .index("by_payment", ["paymentId"])
    .index("by_status", ["status"]),

  // Order items (links orders to ticket tiers)
  orderItems: defineTable({
    orderId: v.id("orders"),
    ticketTierId: v.id("ticketTiers"),
    priceCents: v.number(),
    createdAt: v.number(),
  }).index("by_order", ["orderId"]),

  // Individual ticket instances (generated after payment)
  tickets: defineTable({
    // New schema fields
    orderId: v.optional(v.id("orders")),
    orderItemId: v.optional(v.id("orderItems")),
    eventId: v.id("events"),
    ticketTierId: v.optional(v.id("ticketTiers")),
    attendeeId: v.optional(v.id("users")),
    attendeeEmail: v.optional(v.string()),
    attendeeName: v.optional(v.string()),
    ticketCode: v.optional(v.string()), // unique code for this ticket
    status: v.optional(
      v.union(
        v.literal("VALID"),
        v.literal("SCANNED"),
        v.literal("CANCELLED"),
        v.literal("REFUNDED"),
        v.literal("PENDING_ACTIVATION"), // For cash sales awaiting customer activation
        v.literal("PENDING") // For cash payments awaiting staff validation at door
      )
    ),
    scannedAt: v.optional(v.number()),
    scannedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),

    // PRODUCTION: Secure activation system for cash sales
    activationCode: v.optional(v.string()), // DEPRECATED: Legacy 4-digit codes
    activationCodeHash: v.optional(v.string()), // SHA-256 hash of 8-char activation code
    activationCodeExpiry: v.optional(v.number()), // Expiry timestamp (48 hours)
    activationAttempts: v.optional(v.number()), // Failed activation attempts (rate limiting)
    activationLastAttempt: v.optional(v.number()), // Last attempt timestamp
    activatedAt: v.optional(v.number()), // When customer activated their ticket

    // Staff tracking
    soldByStaffId: v.optional(v.id("eventStaff")), // Which staff member sold this ticket
    staffCommissionAmount: v.optional(v.number()), // Commission earned on this ticket in cents
    paymentMethod: v.optional(
      v.union(
        v.literal("ONLINE"),
        v.literal("CASH"),
        v.literal("CASH_APP"),
        v.literal("SQUARE"),
        v.literal("STRIPE"),
        v.literal("PAYPAL"),
        v.literal("FREE"),
        v.literal("TEST")
      )
    ),

    // Bundle support for grouping tickets
    bundleId: v.optional(v.string()), // ID for grouping tickets together
    bundleName: v.optional(v.string()), // Name of the bundle

    // Legacy fields from old schema (for migration)
    ticketType: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    quantityTotal: v.optional(v.number()),
    quantitySold: v.optional(v.number()),
    quantityReserved: v.optional(v.number()),
    salesStart: v.optional(v.number()),
    salesEnd: v.optional(v.number()),
    maxPerOrder: v.optional(v.number()),
    minPerOrder: v.optional(v.number()),
    active: v.optional(v.boolean()),

    // Email notification tracking
    reminderSent: v.optional(v.boolean()), // 24h reminder email sent
    confirmationSent: v.optional(v.boolean()), // Purchase confirmation email sent
  })
    .index("by_order", ["orderId"])
    .index("by_event", ["eventId"])
    .index("by_attendee", ["attendeeId"])
    .index("by_ticket_code", ["ticketCode"])
    .index("by_activation_code", ["activationCode"])
    .index("by_status", ["status"])
    .index("by_staff", ["soldByStaffId"]),

  // Event staff and sellers
  eventStaff: defineTable({
    eventId: v.optional(v.id("events")), // null = all events for this organizer
    organizerId: v.id("users"),
    staffUserId: v.id("users"),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),

    // Legacy fields for backward compatibility
    staffEmail: v.optional(v.string()),
    staffName: v.optional(v.string()),

    // Hierarchy fields for multi-level delegation
    assignedByStaffId: v.optional(v.id("eventStaff")), // null = assigned by organizer, otherwise ID of parent staff
    hierarchyLevel: v.optional(v.number()), // 1 = organizer-assigned, 2 = staff-assigned, 3 = sub-seller assigned, etc.
    canAssignSubSellers: v.optional(v.boolean()), // Permission to assign their own sub-sellers
    maxSubSellers: v.optional(v.number()), // Max number of sub-sellers this staff can assign (null = unlimited)
    autoAssignToNewEvents: v.optional(v.boolean()), // Auto-assign this staff/sub-seller to new events created by organizer or when parent joins new event

    // Role and permissions
    // Legacy roles: STAFF, TEAM_MEMBERS, ASSOCIATES
    // New simplified roles: MANAGER, SELLER
    role: v.union(
      v.literal("STAFF"),
      v.literal("TEAM_MEMBERS"),
      v.literal("ASSOCIATES"),
      v.literal("MANAGER"),
      v.literal("SELLER")
    ),
    canScan: v.optional(v.boolean()), // Permission to scan tickets at the door (toggle per person)

    // Self-service invite system (for managers to invite their own sellers)
    inviteCode: v.optional(v.string()), // Unique code for self-service seller invites
    inviteCodeExpiresAt: v.optional(v.number()), // When the invite code expires

    // Commission
    commissionType: v.optional(v.union(v.literal("PERCENTAGE"), v.literal("FIXED"))),
    commissionValue: v.optional(v.number()),
    commissionPercent: v.optional(v.number()),
    commissionEarned: v.number(), // total in cents

    // Commission split for hierarchical assignments (when this staff assigns sub-sellers)
    parentCommissionPercent: v.optional(v.number()), // What % parent (this staff) keeps from sub-seller sales
    subSellerCommissionPercent: v.optional(v.number()), // What % sub-seller gets from their own sales

    // Ticket allocation
    allocatedTickets: v.optional(v.number()), // Number of tickets allocated to this staff member

    // Cash tracking
    cashCollected: v.optional(v.number()), // Total cash collected by staff in cents
    acceptCashInPerson: v.optional(v.boolean()), // Whether this staff accepts cash payments in-person

    // Status
    isActive: v.boolean(),
    invitedAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),

    // Tracking
    ticketsSold: v.number(),
    referralCode: v.string(), // unique code for tracking sales

    // Settlement tracking
    settlementStatus: v.optional(v.union(v.literal("PENDING"), v.literal("PAID"))),
    settlementPaidAt: v.optional(v.number()), // When organizer marked as paid
    settlementNotes: v.optional(v.string()), // Payment notes or receipt info

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organizer", ["organizerId"])
    .index("by_staff_user", ["staffUserId"])
    .index("by_event", ["eventId"])
    .index("by_referral_code", ["referralCode"])
    .index("by_assigned_by", ["assignedByStaffId"]) // Query all sub-sellers assigned by a staff member
    .index("by_hierarchy_level", ["hierarchyLevel"]) // Query staff by level
    .index("by_invite_code", ["inviteCode"]), // For self-service seller signup

  // Staff sales tracking
  staffSales: defineTable({
    orderId: v.id("orders"),
    eventId: v.id("events"),
    staffId: v.id("eventStaff"),
    staffUserId: v.id("users"),
    ticketCount: v.number(), // Number of tickets in this sale
    ticketsSold: v.optional(v.number()), // Legacy field
    saleAmount: v.optional(v.number()), // in cents - Legacy field
    commissionAmount: v.number(), // in cents
    commissionPercent: v.optional(v.number()), // Legacy field
    paymentMethod: v.optional(
      v.union(
        v.literal("ONLINE"),
        v.literal("CASH"),
        v.literal("CASH_APP"),
        v.literal("SQUARE"),
        v.literal("STRIPE")
      )
    ),
    createdAt: v.number(),
    soldAt: v.optional(v.number()), // Legacy field
  })
    .index("by_staff", ["staffId"])
    .index("by_event", ["eventId"])
    .index("by_staff_user", ["staffUserId"])
    .index("by_order", ["orderId"])
    .index("by_payment_method", ["staffId", "paymentMethod"]),

  // Staff tier-specific allocations for multi-day events and bundles
  staffTierAllocations: defineTable({
    staffId: v.id("eventStaff"),
    eventId: v.id("events"),
    tierId: v.id("ticketTiers"),
    allocatedQuantity: v.number(), // Total allocated to this staff for this tier
    soldQuantity: v.number(), // Number sold by this staff
    remainingQuantity: v.number(), // Remaining available to sell
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_staff", ["staffId"])
    .index("by_event", ["eventId"])
    .index("by_tier", ["tierId"])
    .index("by_staff_and_tier", ["staffId", "tierId"]),

  // Staff to staff ticket transfers
  staffTicketTransfers: defineTable({
    // Transfer parties
    fromStaffId: v.id("eventStaff"),
    fromUserId: v.id("users"),
    fromName: v.string(),
    toStaffId: v.id("eventStaff"),
    toUserId: v.id("users"),
    toName: v.string(),

    // Event and tickets
    eventId: v.id("events"),
    organizerId: v.id("users"),
    ticketQuantity: v.number(), // Number of ticket credits being transferred

    // Transfer status
    status: v.union(
      v.literal("PENDING"), // Waiting for recipient to accept
      v.literal("ACCEPTED"), // Transfer completed
      v.literal("REJECTED"), // Recipient declined
      v.literal("CANCELLED"), // Sender cancelled
      v.literal("AUTO_EXPIRED") // System expired after timeout
    ),

    // Transfer details
    reason: v.optional(v.string()), // Why the transfer is being made
    notes: v.optional(v.string()), // Additional notes from sender
    rejectionReason: v.optional(v.string()), // Why recipient rejected

    // Audit trail
    requestedAt: v.number(),
    respondedAt: v.optional(v.number()),
    expiresAt: v.number(), // Auto-expire after 48 hours

    // Balance tracking (for audit purposes)
    fromStaffBalanceBefore: v.number(),
    fromStaffBalanceAfter: v.optional(v.number()),
    toStaffBalanceBefore: v.optional(v.number()),
    toStaffBalanceAfter: v.optional(v.number()),
  })
    .index("by_from_staff", ["fromStaffId"])
    .index("by_to_staff", ["toStaffId"])
    .index("by_event", ["eventId"])
    .index("by_status", ["status"])
    .index("by_expiry", ["expiresAt", "status"]),

  // Orders
  orders: defineTable({
    eventId: v.id("events"),
    buyerId: v.id("users"),
    buyerName: v.string(),
    buyerEmail: v.string(),
    buyerPhone: v.optional(v.string()),

    // Status
    status: v.union(
      v.literal("PENDING"),
      v.literal("PENDING_PAYMENT"), // Cash order awaiting payment at door
      v.literal("COMPLETED"),
      v.literal("CANCELLED"),
      v.literal("FAILED"),
      v.literal("REFUNDED"),
      v.literal("DISPUTED") // Payment dispute opened by customer
    ),

    // Pricing
    subtotalCents: v.number(),
    platformFeeCents: v.number(),
    processingFeeCents: v.number(),
    totalCents: v.number(),

    // Payment (CUSTOMER payments only - not organizer prepayments)
    paymentId: v.optional(v.string()), // Stripe or PayPal payment ID (NOT Square - Square is organizer-only)
    paymentMethod: v.optional(
      v.union(
        v.literal("STRIPE"),  // Customer paid via Stripe
        v.literal("PAYPAL"),  // Customer paid via PayPal
        v.literal("CASH"),    // Customer paid cash at door
        v.literal("SQUARE"),  // DEPRECATED - Legacy support only (migrating away)
        v.literal("CASH_APP"), // DEPRECATED - Legacy support only (use STRIPE instead)
        v.literal("ONLINE"),  // Generic online payment
        v.literal("FREE"),    // Free ticket (no payment)
        v.literal("TEST")     // Test mode payment
      )
    ),
    paidAt: v.optional(v.number()),
    stripePaymentIntentId: v.optional(v.string()),
    paypalOrderId: v.optional(v.string()), // PayPal order ID for customer payments

    // Payment retry tracking (Story 5.2)
    retryCount: v.optional(v.number()), // Number of retry attempts
    maxRetries: v.optional(v.number()), // Max allowed retries (default 3)
    lastRetryAt: v.optional(v.number()), // Timestamp of last retry attempt
    failureReason: v.optional(v.string()), // Last failure reason
    retryEligible: v.optional(v.boolean()), // Whether order can be retried

    // Staff referral
    soldByStaffId: v.optional(v.id("eventStaff")), // Staff member who made the sale
    referralCode: v.optional(v.string()), // Referral code used
    staffReferralCode: v.optional(v.string()), // Legacy field
    staffCommission: v.optional(v.number()),

    // Bundle purchase tracking
    bundleId: v.optional(v.id("ticketBundles")), // If this is a bundle purchase
    isBundlePurchase: v.optional(v.boolean()), // Quick flag for filtering

    // Discount tracking
    discountCodeId: v.optional(v.id("discountCodes")),
    discountAmountCents: v.optional(v.number()),

    // Legacy fields for backward compatibility
    userId: v.optional(v.id("users")),

    // Seat selection (for reserved seating events)
    selectedSeats: v.optional(
      v.array(
        v.object({
          sectionId: v.string(),
          sectionName: v.string(),
          // Row-based seating (optional)
          rowId: v.optional(v.string()),
          rowLabel: v.optional(v.string()),
          // Table-based seating (optional)
          tableId: v.optional(v.string()),
          tableNumber: v.optional(v.union(v.string(), v.number())),
          // Common fields
          seatId: v.string(),
          seatNumber: v.string(),
        })
      )
    ),

    // Platform debt settlement (extra amount taken from this order to settle cash payment debt)
    debtSettlementCents: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_status", ["status"])
    .index("by_referral", ["staffReferralCode"]),

  // Individual ticket instances
  ticketInstances: defineTable({
    orderId: v.id("orders"),
    eventId: v.id("events"),
    ticketId: v.id("tickets"),
    ticketNumber: v.string(),

    // QR code
    qrCode: v.string(), // base64 data URL
    qrHash: v.string(), // HMAC signature

    // Status
    status: v.union(
      v.literal("VALID"),
      v.literal("SCANNED"),
      v.literal("CANCELLED"),
      v.literal("REFUNDED")
    ),

    // Scan info
    scannedAt: v.optional(v.number()),
    scannedBy: v.optional(v.id("users")),

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_event", ["eventId"])
    .index("by_ticket_number", ["ticketNumber"])
    .index("by_status", ["status"]),

  // Discount codes for events
  discountCodes: defineTable({
    code: v.string(), // The actual discount code (e.g., "EARLYBIRD2024")
    eventId: v.id("events"),
    organizerId: v.id("users"),

    // Discount details
    discountType: v.union(
      v.literal("PERCENTAGE"), // e.g., 20% off
      v.literal("FIXED_AMOUNT") // e.g., $10 off
    ),
    discountValue: v.number(), // Percentage (20) or cents (1000 for $10)

    // Usage limits
    maxUses: v.optional(v.number()), // Total times code can be used
    usedCount: v.number(), // Times code has been used
    maxUsesPerUser: v.optional(v.number()), // Max uses per email/user

    // Validity period
    validFrom: v.optional(v.number()), // When code becomes valid
    validUntil: v.optional(v.number()), // When code expires

    // Restrictions
    minPurchaseAmount: v.optional(v.number()), // Minimum order value in cents
    applicableToTierIds: v.optional(v.array(v.id("ticketTiers"))), // Specific tiers only, or null for all

    // Status
    isActive: v.boolean(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_organizer", ["organizerId"])
    .index("by_code", ["code"])
    .index("by_status", ["isActive"]),

  // Discount code usage tracking
  discountCodeUsage: defineTable({
    discountCodeId: v.id("discountCodes"),
    orderId: v.id("orders"),
    userEmail: v.string(),
    discountAmountCents: v.number(), // How much was saved
    createdAt: v.number(),
  })
    .index("by_code", ["discountCodeId"])
    .index("by_order", ["orderId"])
    .index("by_user_email", ["userEmail"]),

  // Ticket transfers
  ticketTransfers: defineTable({
    ticketId: v.id("tickets"),
    eventId: v.id("events"),

    // Original owner
    fromUserId: v.id("users"),
    fromEmail: v.string(),
    fromName: v.string(),

    // New owner
    toEmail: v.string(),
    toName: v.string(),
    toUserId: v.optional(v.id("users")), // Set when transfer is accepted

    // Transfer status
    status: v.union(
      v.literal("PENDING"),
      v.literal("ACCEPTED"),
      v.literal("CANCELLED"),
      v.literal("EXPIRED")
    ),

    // Transfer token for secure acceptance
    transferToken: v.string(),

    // Timestamps
    initiatedAt: v.number(),
    completedAt: v.optional(v.number()),
    expiresAt: v.number(), // Transfers expire after 7 days
  })
    .index("by_ticket", ["ticketId"])
    .index("by_from_user", ["fromUserId"])
    .index("by_to_email", ["toEmail"])
    .index("by_token", ["transferToken"])
    .index("by_status", ["status"]),

  // Seating charts for reserved seating events
  seatingCharts: defineTable({
    eventId: v.id("events"),
    name: v.string(), // e.g., "Main Hall", "VIP Section"

    // Seating style (NEW - for table-based vs row-based layouts)
    seatingStyle: v.optional(
      v.union(
        v.literal("ROW_BASED"), // Traditional theater/stadium rows
        v.literal("TABLE_BASED"), // Tables for weddings/galas/banquets
        v.literal("MIXED") // Hybrid: both rows and tables
      )
    ),

    // Venue image overlay (NEW - for visual seating chart placement)
    venueImageId: v.optional(v.id("_storage")), // Uploaded floor plan/venue image
    venueImageUrl: v.optional(v.string()), // Temporary URL for external images
    imageScale: v.optional(v.number()), // Zoom level (1.0 = 100%)
    imageRotation: v.optional(v.number()), // Rotation in degrees

    // Chart configuration
    sections: v.array(
      v.object({
        id: v.string(),
        name: v.string(), // e.g., "Section A", "VIP", "Balcony"
        color: v.optional(v.string()), // Hex color for visualization
        // Visual positioning (NEW - for drag-drop placement on venue image)
        x: v.optional(v.number()), // X coordinate on canvas
        y: v.optional(v.number()), // Y coordinate on canvas
        width: v.optional(v.number()), // Section width
        height: v.optional(v.number()), // Section height
        rotation: v.optional(v.number()), // Section rotation in degrees

        // Container type (NEW - determines if section uses rows or tables)
        containerType: v.optional(
          v.union(
            v.literal("ROWS"), // Traditional row-based seating
            v.literal("TABLES") // Table-based seating
          )
        ),

        // ROW-BASED: Rows with seats (existing)
        rows: v.optional(
          v.array(
            v.object({
              id: v.string(),
              label: v.string(), // e.g., "A", "B", "1", "2"
              curved: v.optional(v.boolean()), // For curved theater rows
              seats: v.array(
                v.object({
                  id: v.string(),
                  number: v.string(), // e.g., "1", "2", "A1"
                  type: v.union(
                    v.literal("STANDARD"),
                    v.literal("WHEELCHAIR"),
                    v.literal("COMPANION"),
                    v.literal("VIP"),
                    v.literal("BLOCKED"),
                    v.literal("STANDING"),
                    v.literal("PARKING"),
                    v.literal("TENT")
                  ),
                  status: v.union(
                    v.literal("AVAILABLE"),
                    v.literal("RESERVED"),
                    v.literal("UNAVAILABLE"),
                    v.literal("BLOCKED")
                  ),
                  // Session-based temporary holds (for shopping cart)
                  sessionId: v.optional(v.string()), // Temporary session holding this seat
                  sessionExpiry: v.optional(v.number()), // Unix timestamp when hold expires
                })
              ),
            })
          )
        ),

        // TABLE-BASED: Tables with seats (NEW)
        tables: v.optional(
          v.array(
            v.object({
              id: v.string(),
              number: v.union(v.string(), v.number()), // Table number or name (e.g., 1, "VIP 1", "Head Table")
              shape: v.union(
                v.literal("ROUND"),
                v.literal("RECTANGULAR"),
                v.literal("SQUARE"),
                v.literal("CUSTOM")
              ),
              // Position on canvas
              x: v.number(),
              y: v.number(),
              // Table dimensions
              width: v.number(), // Diameter for round, width for rect/square
              height: v.number(), // Same as width for round, height for rect/square
              rotation: v.optional(v.number()), // Rotation in degrees
              // Custom polygon points (for CUSTOM shape)
              customPath: v.optional(v.string()), // SVG path data
              // Seat arc configuration (for crescent/cabaret seating on round tables)
              seatArc: v.optional(
                v.object({
                  startAngle: v.optional(v.number()), // Starting angle in degrees (0-360)
                  arcDegrees: v.optional(v.number()), // Arc span in degrees (e.g., 180 for half circle, 135 for crescent)
                })
              ),
              // Capacity and seats
              capacity: v.number(), // Max seats at this table
              seats: v.array(
                v.object({
                  id: v.string(),
                  number: v.string(), // Seat number at table (e.g., "1", "2", "3")
                  type: v.union(
                    v.literal("STANDARD"),
                    v.literal("WHEELCHAIR"),
                    v.literal("COMPANION"),
                    v.literal("VIP"),
                    v.literal("BLOCKED"),
                    v.literal("STANDING"),
                    v.literal("PARKING"),
                    v.literal("TENT")
                  ),
                  status: v.union(
                    v.literal("AVAILABLE"),
                    v.literal("RESERVED"),
                    v.literal("UNAVAILABLE"),
                    v.literal("BLOCKED")
                  ),
                  // Seat position relative to table (for visual rendering)
                  position: v.optional(
                    v.object({
                      angle: v.optional(v.number()), // Angle around table (0-360) for round/custom tables
                      side: v.optional(v.string()), // "top", "bottom", "left", "right" for rectangular tables
                      offset: v.optional(v.number()), // Distance from table edge
                    })
                  ),
                  // Session-based temporary holds (for shopping cart)
                  sessionId: v.optional(v.string()), // Temporary session holding this seat
                  sessionExpiry: v.optional(v.number()), // Unix timestamp when hold expires
                })
              ),
            })
          )
        ),

        ticketTierId: v.optional(v.id("ticketTiers")), // Link section to tier pricing
      })
    ),

    // Total capacity
    totalSeats: v.number(),
    reservedSeats: v.number(),

    // Status
    isActive: v.boolean(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_event", ["eventId"]),

  // Seat reservations
  seatReservations: defineTable({
    eventId: v.id("events"),
    seatingChartId: v.id("seatingCharts"),
    ticketId: v.id("tickets"),
    orderId: v.id("orders"),

    // Seat location (supports both row-based and table-based)
    sectionId: v.string(),

    // ROW-BASED fields (optional, only for row-based seating)
    rowId: v.optional(v.string()),
    rowLabel: v.optional(v.string()), // e.g., "A", "B", "1"

    // TABLE-BASED fields (optional, only for table-based seating)
    tableId: v.optional(v.string()),
    tableNumber: v.optional(v.union(v.string(), v.number())), // e.g., 5, "Head Table", "VIP 1"

    // Common fields
    seatId: v.string(),
    seatNumber: v.string(), // Full seat identifier e.g., "Section A, Row 1, Seat 5" or "Table 5, Seat 3"

    // Reservation status
    status: v.union(v.literal("RESERVED"), v.literal("RELEASED"), v.literal("CANCELLED")),

    // Timestamps
    reservedAt: v.number(),
    releasedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_seating_chart", ["seatingChartId"])
    .index("by_ticket", ["ticketId"])
    .index("by_order", ["orderId"])
    .index("by_seat", ["seatingChartId", "sectionId", "seatId"])
    .index("by_table", ["seatingChartId", "sectionId", "tableId"])
    .index("by_status", ["status"]),

  // Seating Shares - Shareable links for group seat selection
  seatingShares: defineTable({
    eventId: v.id("events"),
    shareToken: v.string(), // Unique token for the share link
    initiatorName: v.string(),
    initiatorEmail: v.optional(v.string()),
    sectionId: v.string(),
    tableId: v.optional(v.string()),
    selectedSeats: v.array(v.string()),
    isActive: v.boolean(),
    expiresAt: v.number(),
    viewCount: v.number(),
    joinedCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_token", ["shareToken"]),

  // Waitlist for sold-out events
  eventWaitlist: defineTable({
    eventId: v.id("events"),
    ticketTierId: v.optional(v.id("ticketTiers")), // Specific tier, or null for any ticket

    // User info
    userId: v.optional(v.id("users")),
    email: v.string(),
    name: v.string(),
    quantity: v.number(), // Number of tickets desired

    // Status
    status: v.union(
      v.literal("ACTIVE"),
      v.literal("NOTIFIED"),
      v.literal("CONVERTED"), // User purchased tickets
      v.literal("EXPIRED"),
      v.literal("CANCELLED")
    ),

    // Notification tracking
    notifiedAt: v.optional(v.number()),
    expiresAt: v.number(), // Waitlist entry expires if not converted

    // Timestamps
    joinedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_tier", ["ticketTierId"])
    .index("by_status", ["status"])
    .index("by_event_and_status", ["eventId", "status"]),

  // Room/Seating Templates - Reusable room layouts
  roomTemplates: defineTable({
    // Basic info
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("theater"),
      v.literal("stadium"),
      v.literal("concert"),
      v.literal("conference"),
      v.literal("outdoor"),
      v.literal("wedding"),
      v.literal("gala"),
      v.literal("banquet"),
      v.literal("custom")
    ),

    // Creator info
    createdBy: v.optional(v.id("users")), // null for system templates
    isPublic: v.boolean(), // Public templates visible to all users
    isSystemTemplate: v.optional(v.boolean()), // Built-in templates (cannot be deleted)

    // Seating configuration
    seatingStyle: v.union(v.literal("ROW_BASED"), v.literal("TABLE_BASED"), v.literal("MIXED")),
    estimatedCapacity: v.number(),

    // Template data (JSON structure matching seating chart sections)
    sections: v.array(v.any()), // Flexible array to store both row and table configurations

    // Optional preview image
    thumbnailUrl: v.optional(v.string()),

    // Usage statistics
    timesUsed: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator", ["createdBy"])
    .index("by_category", ["category"])
    .index("by_public", ["isPublic"])
    .index("by_creator_and_category", ["createdBy", "category"]),

  // Uploaded Event Flyers - For bulk uploads and AI extraction
  uploadedFlyers: defineTable({
    // File info
    filename: v.string(),
    fileHash: v.string(), // SHA-256 hash for duplicate detection
    filepath: v.string(), // Path on server
    originalSize: v.number(), // Original file size in bytes
    optimizedSize: v.number(), // Optimized file size in bytes

    // Upload info
    uploadedBy: v.id("users"), // Admin who uploaded
    uploadedAt: v.number(),

    // AI extraction status
    aiProcessed: v.boolean(), // Has AI extracted data?
    aiProcessedAt: v.optional(v.number()),

    // Extracted event data (from AI) - accepts any structure
    extractedData: v.optional(v.any()),

    // Event creation status
    eventCreated: v.boolean(), // Has event been created from this flyer?
    eventId: v.optional(v.id("events")), // Link to created event
    eventCreatedAt: v.optional(v.number()),

    // Status
    status: v.union(
      v.literal("UPLOADED"), // Just uploaded
      v.literal("PROCESSING"), // AI is processing
      v.literal("EXTRACTED"), // Data extracted, pending review
      v.literal("EVENT_CREATED"), // Event created
      v.literal("ERROR") // Processing error
    ),
    errorMessage: v.optional(v.string()),

    // Admin upload tracking
    isAdminUpload: v.optional(v.boolean()), // Was this uploaded by admin?
  })
    .index("by_uploader", ["uploadedBy"])
    .index("by_hash", ["fileHash"])
    .index("by_status", ["status"])
    .index("by_event", ["eventId"])
    .index("by_upload_date", ["uploadedAt"]),

  // Event Contacts - CRM System for managing event contacts
  eventContacts: defineTable({
    // Basic contact info
    name: v.string(),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),

    // Social media
    socialMedia: v.optional(
      v.object({
        instagram: v.optional(v.string()),
        facebook: v.optional(v.string()),
        twitter: v.optional(v.string()),
      })
    ),

    // Professional info
    role: v.optional(v.string()), // "Event Coordinator", "Promoter", "DJ", etc.
    organization: v.optional(v.string()), // Company or organization name

    // Links to events/flyers
    eventId: v.optional(v.id("events")),
    flyerId: v.optional(v.id("uploadedFlyers")),

    // Metadata
    extractedFrom: v.union(v.literal("FLYER"), v.literal("MANUAL")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_flyer", ["flyerId"])
    .index("by_name", ["name"])
    .index("by_phone", ["phoneNumber"])
    .index("by_email", ["email"])
    .index("by_created", ["createdAt"]),

  // Products - Merchandise and items for sale
  products: defineTable({
    // Basic info
    name: v.string(),
    description: v.string(),
    slug: v.optional(v.string()), // URL-friendly identifier for SEO

    // Product Type (NEW - for variable products support)
    productType: v.optional(
      v.union(
        v.literal("SIMPLE"), // Regular product with no variations
        v.literal("VARIABLE"), // Product with variations (sizes, colors, etc.)
        v.literal("DIGITAL") // Downloadable/virtual product
      )
    ), // Default: SIMPLE for backward compatibility

    // Pricing
    price: v.number(), // Price in cents (base price for variable products)
    compareAtPrice: v.optional(v.number()), // Original price (for showing discounts)

    // Inventory (for SIMPLE products or aggregate for VARIABLE)
    sku: v.optional(v.string()), // Stock Keeping Unit
    inventoryQuantity: v.number(), // Available quantity
    trackInventory: v.boolean(), // Whether to track inventory
    allowBackorder: v.optional(v.boolean()), // Allow orders when out of stock

    // Product details
    category: v.optional(v.string()), // "Apparel", "Accessories", "Digital", etc.
    tags: v.optional(v.array(v.string())),

    // Images
    images: v.optional(v.array(v.string())), // Array of image URLs
    primaryImage: v.optional(v.string()), // Main product image

    // ==========================================
    // VARIABLE PRODUCTS - Flexible Attributes (NEW)
    // ==========================================
    // Attributes define what options a product has (e.g., Size, Color, Material)
    // Each attribute can create variations when isVariation=true
    attributes: v.optional(
      v.array(
        v.object({
          id: v.string(), // Unique attribute ID (e.g., "attr_size_123")
          name: v.string(), // Display name: "Size", "Color", "Material", "Scent"
          slug: v.string(), // URL-safe: "size", "color", "material"
          values: v.array(v.string()), // Options: ["S", "M", "L", "XL"] or ["Red", "Blue", "Green"]
          isVariation: v.boolean(), // Does this attribute create variations?
          isVisible: v.boolean(), // Show on product page?
          sortOrder: v.optional(v.number()), // Display order
        })
      )
    ),

    // Legacy variants field (DEPRECATED - use productVariations table instead)
    hasVariants: v.boolean(),
    variants: v.optional(
      v.array(
        v.object({
          id: v.string(), // Unique variant ID
          name: v.string(), // "Size: M, Color: Blue"
          options: v.object({
            // e.g., { size: "M", color: "Blue" }
            size: v.optional(v.string()),
            color: v.optional(v.string()),
          }),
          price: v.optional(v.number()), // Override base price
          sku: v.optional(v.string()),
          inventoryQuantity: v.number(),
        })
      )
    ),

    // Shipping
    requiresShipping: v.boolean(),
    weight: v.optional(v.number()), // Weight in grams
    shippingPrice: v.optional(v.number()), // Shipping cost in cents

    // Status
    status: v.union(v.literal("ACTIVE"), v.literal("DRAFT"), v.literal("ARCHIVED")),

    // SEO
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),

    // Created by
    createdBy: v.id("users"), // Admin who created

    // Vendor support (for multi-vendor marketplace)
    vendorId: v.optional(v.id("vendors")), // Vendor who owns this product (null = platform product)
    vendorName: v.optional(v.string()), // Cached vendor name for display

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_sku", ["sku"])
    .index("by_slug", ["slug"])
    .index("by_created_by", ["createdBy"])
    .index("by_vendor", ["vendorId"])
    .index("by_product_type", ["productType"]),

  // ==========================================
  // PRODUCT VARIATIONS - Individual variation records (NEW)
  // ==========================================
  // Each variation is a unique combination of attributes (e.g., Size=M + Color=Blue)
  // Variations have their own price, inventory, SKU, and image
  productVariations: defineTable({
    productId: v.id("products"),
    vendorId: v.optional(v.id("vendors")), // For vendor products

    // Attribute combination for this variation (dynamic keys)
    // e.g., { size: "M", color: "Blue" } or { size: "L", material: "Cotton", color: "Red" }
    attributes: v.any(), // Flexible object to store attribute key-value pairs

    // Variation-specific data
    sku: v.optional(v.string()), // Unique SKU for this variation
    price: v.number(), // Price in cents (can differ from parent product)
    compareAtPrice: v.optional(v.number()), // Original price for sale display

    // Per-variation inventory
    inventoryQuantity: v.number(),
    trackInventory: v.boolean(),
    allowBackorder: v.optional(v.boolean()),
    lowStockThreshold: v.optional(v.number()), // Alert when stock falls below this

    // Variation image (shown when this variation is selected)
    imageUrl: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")), // For uploaded images

    // Status
    isEnabled: v.boolean(), // Whether this variation is available for purchase
    status: v.union(v.literal("ACTIVE"), v.literal("DRAFT")),

    // Shipping overrides (can differ from parent product)
    weight: v.optional(v.number()), // Weight in grams
    dimensions: v.optional(
      v.object({
        length: v.number(),
        width: v.number(),
        height: v.number(),
      })
    ),

    // Digital product support
    isVirtual: v.optional(v.boolean()), // No shipping required
    isDownloadable: v.optional(v.boolean()),
    downloadFiles: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          url: v.string(),
        })
      )
    ),
    downloadLimit: v.optional(v.number()), // Max downloads (-1 for unlimited)
    downloadExpiry: v.optional(v.number()), // Days until link expires

    // Sorting and display
    menuOrder: v.number(), // For drag-drop reordering
    displayName: v.optional(v.string()), // Generated name like "M / Blue"

    // Optimistic locking (prevents race conditions)
    version: v.number(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_vendor", ["vendorId"])
    .index("by_sku", ["sku"])
    .index("by_status", ["status"])
    .index("by_product_status", ["productId", "status"]),

  // Product Orders - Customer orders for products
  productOrders: defineTable({
    // Order number
    orderNumber: v.string(), // e.g., "ORD-2025-0001"

    // Customer info
    customerId: v.optional(v.id("users")), // Registered user (optional)
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),

    // Shipping address
    shippingAddress: v.object({
      name: v.string(),
      address1: v.string(),
      address2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.string(),
      phone: v.optional(v.string()),
    }),

    // Billing address (if different)
    billingAddress: v.optional(
      v.object({
        name: v.string(),
        address1: v.string(),
        address2: v.optional(v.string()),
        city: v.string(),
        state: v.string(),
        zipCode: v.string(),
        country: v.string(),
      })
    ),

    // Order items
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        productImage: v.optional(v.string()), // Product image URL for display
        variantId: v.optional(v.string()), // Legacy variant system
        variantName: v.optional(v.string()), // Legacy variant system
        // New variation system (for VARIABLE products)
        variationId: v.optional(v.id("productVariations")),
        variationAttributes: v.optional(v.any()), // e.g., { size: "M", color: "Blue" }
        variationSku: v.optional(v.string()),
        quantity: v.number(),
        price: v.number(), // Price per item in cents
        totalPrice: v.number(), // quantity * price
      })
    ),

    // Pricing
    subtotal: v.number(), // Sum of all items in cents
    shippingCost: v.number(), // Shipping cost in cents
    shippingZone: v.optional(v.string()), // Zone name: Local, Regional, Extended, Remote
    shippingSpeed: v.optional(v.string()), // standard or express
    taxAmount: v.number(), // Tax amount in cents
    totalAmount: v.number(), // subtotal + shipping + tax

    // Payment
    paymentMethod: v.optional(v.string()), // "credit_card", "paypal", etc.
    paymentStatus: v.union(
      v.literal("PENDING"),
      v.literal("PAID"),
      v.literal("FAILED"),
      v.literal("REFUNDED")
    ),
    stripePaymentIntentId: v.optional(v.string()),
    paidAt: v.optional(v.number()),

    // Fulfillment
    fulfillmentStatus: v.union(
      v.literal("PENDING"),
      v.literal("PROCESSING"),
      v.literal("SHIPPED"),
      v.literal("DELIVERED"),
      v.literal("CANCELLED")
    ),
    trackingNumber: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
    shippedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),

    // Notes
    customerNote: v.optional(v.string()),
    internalNote: v.optional(v.string()), // Admin notes

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer", ["customerId"])
    .index("by_email", ["customerEmail"])
    .index("by_order_number", ["orderNumber"])
    .index("by_payment_status", ["paymentStatus"])
    .index("by_fulfillment_status", ["fulfillmentStatus"])
    .index("by_created_at", ["createdAt"]),

  // ==========================================
  // RESTAURANT MODULE - Food Ordering System
  // ==========================================

  // Restaurants - Restaurant profiles and settings
  restaurants: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    phone: v.string(),
    cuisine: v.array(v.string()),
    logoUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    // Food photos gallery (admin-managed)
    foodPhotos: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      url: v.string(),
      caption: v.optional(v.string()),
      uploadedAt: v.number(),
      uploadedBy: v.optional(v.id("users")),
      isAdminUploaded: v.optional(v.boolean()),
    }))),
    operatingHours: v.optional(v.any()),
    // Late-night fields for filtering restaurants open after 2am
    isOpenLateNight: v.optional(v.boolean()),     // true if closes after 2am on any day
    lateNightDays: v.optional(v.array(v.string())), // ["friday", "saturday"] - days open late

    // Stepper-specific fields (Phase 2)
    dressCode: v.optional(v.union(
      v.literal("casual"),
      v.literal("smart-casual"),
      v.literal("upscale"),
      v.literal("stepping-attire")
    )),
    vibeTags: v.optional(v.array(v.string())), // ["energetic", "intimate", "lounge", "romantic"]
    priceRange: v.optional(v.union(
      v.literal("$"),
      v.literal("$$"),
      v.literal("$$$"),
      v.literal("$$$$")
    )),
    groupInfo: v.optional(v.object({
      maxPartySize: v.optional(v.number()),
      groupDiscounts: v.optional(v.boolean()),
      privateRoomAvailable: v.optional(v.boolean()),
      minimumForGroup: v.optional(v.number()), // min order for groups
    })),
    entertainment: v.optional(v.object({
      hasLiveMusic: v.optional(v.boolean()),
      hasDJ: v.optional(v.boolean()),
      musicGenres: v.optional(v.array(v.string())), // ["r&b", "steppin", "jazz"]
      entertainmentNights: v.optional(v.array(v.string())), // ["friday", "saturday"]
    })),

    acceptingOrders: v.boolean(),
    estimatedPickupTime: v.number(),
    isActive: v.boolean(),

    // Application status (for restaurant partner onboarding)
    applicationStatus: v.optional(
      v.union(
        v.literal("PENDING"),     // Awaiting review
        v.literal("APPROVED"),    // Approved, can operate
        v.literal("REJECTED"),    // Rejected, cannot operate
        v.literal("SUSPENDED")    // Temporarily disabled
      )
    ),
    applicationNotes: v.optional(v.string()),     // Admin notes (rejection reason, etc.)
    applicationReviewedAt: v.optional(v.number()), // When reviewed by admin
    applicationReviewedBy: v.optional(v.id("users")), // Admin who reviewed

    // Subscription fields
    subscriptionTier: v.optional(
      v.union(v.literal("STARTER"), v.literal("GROWTH"), v.literal("PROFESSIONAL"))
    ),
    subscriptionStatus: v.optional(
      v.union(v.literal("ACTIVE"), v.literal("CANCELLED"), v.literal("EXPIRED"), v.literal("NONE"))
    ),
    subscriptionExpiresAt: v.optional(v.number()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),

    // Multi-location support (Phase 2)
    // Reference to the default/primary location for this restaurant brand
    defaultLocationId: v.optional(v.id("restaurantLocations")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["isActive"])
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerId"])
    .index("by_subscription", ["subscriptionTier", "subscriptionStatus"])
    .index("by_application_status", ["applicationStatus"]),

  // Restaurant Locations - Multiple physical locations per restaurant brand
  // Enables franchise model: 1 brand (restaurant) → many locations
  restaurantLocations: defineTable({
    restaurantId: v.id("restaurants"),           // Parent brand
    name: v.string(),                            // Location nickname: "Downtown", "O'Hare Airport"
    slug: v.string(),                            // URL-friendly: "harolds-downtown"

    // Address (moved from restaurants table for multi-location support)
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),

    // Contact (location-specific)
    phone: v.optional(v.string()),
    email: v.optional(v.string()),

    // Order settings (location-specific)
    acceptingOrders: v.boolean(),
    estimatedPickupTime: v.optional(v.number()),  // minutes

    // Operating hours (location-specific, moved from restaurants)
    operatingHours: v.optional(v.any()),          // Same format as restaurant operatingHours
    isOpenLateNight: v.optional(v.boolean()),     // true if closes after 2am
    lateNightDays: v.optional(v.array(v.string())), // ["friday", "saturday"]

    // Location-specific features
    hasParking: v.optional(v.boolean()),
    parkingDetails: v.optional(v.string()),       // "Free lot behind building"
    isAccessible: v.optional(v.boolean()),        // Wheelchair accessible
    seatingCapacity: v.optional(v.number()),

    // Status
    isActive: v.boolean(),
    isPrimary: v.optional(v.boolean()),           // Default location for the brand

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_slug", ["slug"])
    .index("by_city", ["city", "state"])
    .index("by_active", ["restaurantId", "isActive"]),

  // Restaurant Staff - Staff members with restaurant-specific roles
  restaurantStaff: defineTable({
    restaurantId: v.id("restaurants"),
    // userId is optional for pending invitations (before the invited user accepts)
    userId: v.optional(v.id("users")),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),

    // Role: RESTAURANT_MANAGER or RESTAURANT_STAFF
    role: v.union(
      v.literal("RESTAURANT_MANAGER"),
      v.literal("RESTAURANT_STAFF")
    ),

    // Granular permissions (allows custom permission overrides)
    permissions: v.optional(v.object({
      canManageMenu: v.optional(v.boolean()),
      canManageHours: v.optional(v.boolean()),
      canManageOrders: v.optional(v.boolean()),
      canViewAnalytics: v.optional(v.boolean()),
      canManageSettings: v.optional(v.boolean()),
    })),

    // Invitation status
    status: v.union(
      v.literal("PENDING"),    // Invitation sent, not accepted
      v.literal("ACTIVE"),     // Staff member is active
      v.literal("INACTIVE")    // Deactivated by owner/manager
    ),
    invitedAt: v.number(),
    acceptedAt: v.optional(v.number()),
    invitedBy: v.id("users"),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_user", ["userId"])
    .index("by_restaurant_user", ["restaurantId", "userId"])
    .index("by_email", ["email"])
    .index("by_restaurant_status", ["restaurantId", "status"]),

  // Menu Categories - Categories for organizing menu items
  menuCategories: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"]),

  // Menu Items - Individual food items
  menuItems: defineTable({
    restaurantId: v.id("restaurants"),
    categoryId: v.optional(v.id("menuCategories")),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    imageUrl: v.optional(v.string()),
    sortOrder: v.number(),
    isAvailable: v.boolean(),
    // Dietary tags for filtering
    isVegetarian: v.optional(v.boolean()),
    isVegan: v.optional(v.boolean()),
    isGlutenFree: v.optional(v.boolean()),
    isSpicy: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_category", ["categoryId"]),

  // Food Orders - Customer orders from restaurants
  foodOrders: defineTable({
    orderNumber: v.string(),
    restaurantId: v.id("restaurants"),
    customerId: v.optional(v.id("users")),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.string(),
    items: v.array(v.object({
      menuItemId: v.id("menuItems"),
      name: v.string(),
      price: v.number(),
      quantity: v.number(),
      notes: v.optional(v.string()),
    })),
    subtotal: v.number(),
    tax: v.number(),
    total: v.number(),
    pickupTime: v.optional(v.number()),
    specialInstructions: v.optional(v.string()),
    status: v.string(),
    paymentStatus: v.string(),
    paymentMethod: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    placedAt: v.number(),
    readyAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_customer", ["customerId"])
    .index("by_order_number", ["orderNumber"]),

  // Restaurant Reviews - Customer ratings and reviews
  restaurantReviews: defineTable({
    restaurantId: v.id("restaurants"),
    customerId: v.id("users"),
    orderId: v.optional(v.id("foodOrders")), // Link to order for "verified purchase"
    rating: v.number(), // 1-5 stars
    title: v.optional(v.string()),
    reviewText: v.optional(v.string()),
    photos: v.optional(v.array(v.string())), // URLs of review photos
    isVerifiedPurchase: v.boolean(), // True if linked to completed order
    helpfulCount: v.number(), // Number of "helpful" votes
    reportCount: v.number(), // Number of reports (for moderation)
    status: v.string(), // "published", "pending", "hidden", "removed"
    restaurantResponse: v.optional(v.string()), // Owner's response to review
    restaurantResponseAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_customer", ["customerId"])
    .index("by_order", ["orderId"])
    .index("by_status", ["status"]),

  // Restaurant Review Votes - Track who voted helpful
  restaurantReviewVotes: defineTable({
    reviewId: v.id("restaurantReviews"),
    userId: v.id("users"),
    voteType: v.string(), // "helpful" or "reported"
    createdAt: v.number(),
  })
    .index("by_review", ["reviewId"])
    .index("by_user", ["userId"])
    .index("by_review_user", ["reviewId", "userId"]),

  // Favorite Restaurants - User's saved/favorite restaurants
  favoriteRestaurants: defineTable({
    userId: v.id("users"),
    restaurantId: v.id("restaurants"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_restaurant", ["restaurantId"])
    .index("by_user_restaurant", ["userId", "restaurantId"]),

  // Product Wishlists - Users can save products for later
  productWishlists: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_product", ["productId"])
    .index("by_user_product", ["userId", "productId"]),

  // Favorite Events/Classes - Users can save events/classes for later
  favoriteEvents: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_user_event", ["userId", "eventId"]),

  // ==========================================
  // VENDOR MARKETPLACE MODULE - Multi-Vendor Store System
  // ==========================================

  // Vendors - Independent sellers in the marketplace
  vendors: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.string(),
    businessType: v.optional(v.string()), // "Individual", "LLC", "Corporation"
    address: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    logoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    categories: v.array(v.string()), // Product categories vendor sells
    commissionPercent: v.number(), // Platform commission (default 15%)
    tier: v.optional(
      v.union(v.literal("BASIC"), v.literal("VERIFIED"), v.literal("PREMIUM"))
    ), // Vendor tier - determines commission and benefits
    website: v.optional(v.string()),
    additionalNotes: v.optional(v.string()),
    status: v.union(
      v.literal("PENDING"),
      v.literal("APPROVED"),
      v.literal("SUSPENDED"),
      v.literal("REJECTED")
    ),
    isActive: v.boolean(),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    // Stats (updated when orders placed)
    totalProducts: v.optional(v.number()),
    totalSales: v.optional(v.number()),
    totalEarnings: v.optional(v.number()),
    totalPaidOut: v.optional(v.number()),
    // Stripe Connect for receiving split payments
    stripeConnectedAccountId: v.optional(v.string()),
    stripeAccountSetupComplete: v.optional(v.boolean()),
    stripeCashAppEnabled: v.optional(v.boolean()),
    stripePayoutsEnabled: v.optional(v.boolean()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_active", ["isActive"])
    .index("by_tier", ["tier", "isActive"])
    .index("by_stripe_account", ["stripeConnectedAccountId"]),

  // Vendor Earnings - Track earnings from each order
  vendorEarnings: defineTable({
    vendorId: v.id("vendors"),
    orderId: v.id("productOrders"),
    orderNumber: v.string(),
    orderDate: v.number(),
    grossAmount: v.number(), // Total sale amount in cents
    commissionRate: v.number(), // Commission % at time of sale
    commissionAmount: v.number(), // Platform fee in cents
    netAmount: v.number(), // Vendor earnings in cents
    status: v.union(
      v.literal("PENDING"), // Order placed, awaiting payment
      v.literal("AVAILABLE"), // Payment confirmed, available for payout
      v.literal("PROCESSING"), // Payout in progress
      v.literal("PAID"), // Payout completed
      v.literal("REFUNDED") // Order was refunded
    ),
    payoutId: v.optional(v.id("vendorPayouts")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_vendor", ["vendorId"])
    .index("by_order", ["orderId"])
    .index("by_status", ["status"])
    .index("by_vendor_status", ["vendorId", "status"]),

  // Vendor Payouts - Payout requests and history
  vendorPayouts: defineTable({
    vendorId: v.id("vendors"),
    payoutNumber: v.string(), // e.g., "PAY-2025-0001"
    totalAmount: v.number(), // Total payout amount in cents
    earningsCount: v.number(), // Number of earnings included
    status: v.union(
      v.literal("PENDING"), // Requested by vendor
      v.literal("APPROVED"), // Approved by admin
      v.literal("PROCESSING"), // Payment being processed
      v.literal("COMPLETED"), // Payment sent
      v.literal("FAILED") // Payment failed
    ),
    payoutMethod: v.string(), // "bank_transfer", "paypal", "check"
    paymentReference: v.optional(v.string()), // Transaction ID or check number
    paymentDate: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    processedBy: v.optional(v.id("users")),
    adminNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_vendor", ["vendorId"])
    .index("by_status", ["status"]),

  // Vendor Coupons - Discount codes for vendor products
  vendorCoupons: defineTable({
    vendorId: v.id("vendors"),
    code: v.string(), // Coupon code (uppercase)
    description: v.optional(v.string()),
    discountType: v.union(
      v.literal("PERCENTAGE"),
      v.literal("FIXED_AMOUNT")
    ),
    discountValue: v.number(), // Percentage (1-100) or cents for fixed
    minPurchaseAmount: v.optional(v.number()), // Minimum order in cents
    maxDiscountAmount: v.optional(v.number()), // Cap for percentage discounts in cents
    maxUses: v.optional(v.number()), // Total usage limit
    maxUsesPerCustomer: v.optional(v.number()), // Per-customer limit
    usedCount: v.number(), // Current usage count
    applicableProductIds: v.optional(v.array(v.id("products"))), // Specific products only
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_vendor", ["vendorId"])
    .index("by_code", ["code"])
    .index("by_vendor_code", ["vendorId", "code"])
    .index("by_active", ["isActive"]),

  // Vendor Coupon Usage - Track coupon redemptions
  vendorCouponUsage: defineTable({
    couponId: v.id("vendorCoupons"),
    vendorId: v.id("vendors"),
    orderId: v.id("productOrders"),
    userId: v.id("users"),
    userEmail: v.string(),
    discountAmountCents: v.number(),
    usedAt: v.number(),
  })
    .index("by_coupon", ["couponId"])
    .index("by_user", ["userId"])
    .index("by_user_coupon", ["userId", "couponId"])
    .index("by_vendor", ["vendorId"]),

  // ==========================================
  // PUSH NOTIFICATIONS MODULE - PWA Notifications
  // ==========================================

  // Push Subscriptions - Browser/device push notification subscriptions
  pushSubscriptions: defineTable({
    // Who owns this subscription (one of these should be set)
    userId: v.optional(v.id("users")),
    staffId: v.optional(v.id("eventStaff")),
    restaurantId: v.optional(v.id("restaurants")), // For restaurant staff notifications

    // Web Push subscription data
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),

    // Device info
    userAgent: v.optional(v.string()),
    deviceType: v.optional(v.string()), // "mobile", "desktop", "tablet"

    // Notification preferences
    notifyOnCashOrders: v.optional(v.boolean()),
    notifyOnOnlineSales: v.optional(v.boolean()),
    notifyOnFoodOrders: v.optional(v.boolean()), // For restaurant orders

    // Status tracking
    isActive: v.boolean(),
    failureCount: v.number(),
    lastUsed: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_endpoint", ["endpoint"])
    .index("by_user", ["userId"])
    .index("by_staff", ["staffId"])
    .index("by_restaurant", ["restaurantId"]),

  // Notification Log - History of all sent notifications
  notificationLog: defineTable({
    // Who received the notification
    userId: v.optional(v.id("users")),
    staffId: v.optional(v.id("eventStaff")),
    restaurantId: v.optional(v.id("restaurants")),

    // Notification content
    type: v.string(), // "CASH_ORDER", "ONLINE_SALE", "FOOD_ORDER", "ORDER_UPDATE"
    title: v.string(),
    body: v.string(),

    // Related entities
    orderId: v.optional(v.id("orders")),
    eventId: v.optional(v.id("events")),
    foodOrderId: v.optional(v.id("foodOrders")),

    // Delivery status
    status: v.union(
      v.literal("SENT"),
      v.literal("DELIVERED"),
      v.literal("FAILED"),
      v.literal("CLICKED")
    ),
    error: v.optional(v.string()),

    // Timestamps
    sentAt: v.number(),
    deliveredAt: v.optional(v.number()),
    clickedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_staff", ["staffId"])
    .index("by_restaurant", ["restaurantId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"]),

  // ==========================================
  // EMAIL LOG MODULE - Track all sent emails for audit and resend
  // ==========================================

  // Email Log - Audit trail for all transactional emails
  emailLog: defineTable({
    // Reference to order
    orderNumber: v.string(),
    orderId: v.optional(v.id("productOrders")),

    // Recipient info
    recipientType: v.union(
      v.literal("CUSTOMER"),
      v.literal("VENDOR"),
      v.literal("STAFF")
    ),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),

    // Email content
    subject: v.string(),
    templateType: v.string(), // "ORDER_RECEIPT", "VENDOR_ALERT", "STAFF_NOTIFICATION"

    // Status tracking
    status: v.union(
      v.literal("PENDING"),
      v.literal("SENT"),
      v.literal("FAILED"),
      v.literal("RESENT")
    ),

    // Delivery details
    messageId: v.optional(v.string()), // Postal message ID
    attempts: v.number(),
    lastAttemptAt: v.number(),
    errorMessage: v.optional(v.string()),

    // Resend tracking
    resentAt: v.optional(v.number()),
    resentBy: v.optional(v.id("users")),
    resentMessageId: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_order_number", ["orderNumber"])
    .index("by_status", ["status"])
    .index("by_recipient_type", ["recipientType"])
    .index("by_recipient_email", ["recipientEmail"])
    .index("by_created_at", ["createdAt"]),

  // ============================================================================
  // PLATFORM DEBT TRACKING
  // Tracks platform fees owed from cash payments, settled via digital payments
  // ============================================================================

  // Organizer's total platform debt balance
  organizerPlatformDebt: defineTable({
    organizerId: v.id("users"),

    // Debt tracking (all in cents)
    totalDebtCents: v.number(), // Total platform fees owed from all cash orders
    totalSettledCents: v.number(), // Total recovered from digital payments
    remainingDebtCents: v.number(), // What's still owed (totalDebt - totalSettled)

    // Audit timestamps
    lastCashOrderAt: v.optional(v.number()), // When last cash order added debt
    lastSettlementAt: v.optional(v.number()), // When last settlement deduction occurred

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organizer", ["organizerId"])
    .index("by_remaining_debt", ["remainingDebtCents"]),

  // Ledger of all debt transactions (for audit trail)
  platformDebtLedger: defineTable({
    organizerId: v.id("users"),

    // Transaction type
    transactionType: v.union(
      v.literal("CASH_ORDER_DEBT"), // Debt added from cash payment approval
      v.literal("DIGITAL_SETTLEMENT"), // Debt recovered from digital payment
      v.literal("MANUAL_PAYMENT"), // Organizer paid platform directly
      v.literal("ADJUSTMENT") // Admin adjustment
    ),

    // Related entities
    orderId: v.optional(v.id("orders")), // The order that created/settled debt
    eventId: v.optional(v.id("events")), // Event for context

    // Amount (always positive, type determines add/subtract)
    amountCents: v.number(),

    // Running balance after this transaction
    balanceAfterCents: v.number(),

    // Details
    description: v.string(),
    notes: v.optional(v.string()), // Admin notes for adjustments
    processedBy: v.optional(v.id("users")), // Admin who processed (for manual/adjustments)

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_organizer", ["organizerId"])
    .index("by_order", ["orderId"])
    .index("by_event", ["eventId"])
    .index("by_type", ["transactionType"])
    .index("by_organizer_and_created", ["organizerId", "createdAt"]),

  // Product Reviews - Customer reviews for marketplace products
  productReviews: defineTable({
    productId: v.id("products"),
    userId: v.id("users"),
    orderId: v.optional(v.id("productOrders")), // Link to order for verified purchase badge

    // Review content
    rating: v.number(), // 1-5 stars
    title: v.optional(v.string()), // Optional review title
    content: v.optional(v.string()), // Review text
    images: v.optional(v.array(v.string())), // Optional review images

    // Verification
    isVerifiedPurchase: v.boolean(), // True if user actually bought the product

    // Helpful votes
    helpfulVotes: v.number(), // Count of "was this helpful?" clicks
    helpfulVoters: v.optional(v.array(v.id("users"))), // Users who voted helpful

    // Vendor response
    vendorResponse: v.optional(v.string()),
    vendorRespondedAt: v.optional(v.number()),

    // Moderation
    status: v.union(
      v.literal("PENDING"), // Awaiting moderation
      v.literal("APPROVED"), // Visible to all
      v.literal("REJECTED"), // Hidden (spam, inappropriate)
      v.literal("FLAGGED") // Needs review
    ),
    moderatedBy: v.optional(v.id("users")),
    moderatedAt: v.optional(v.number()),
    moderationNotes: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_user", ["userId"])
    .index("by_product_and_status", ["productId", "status"])
    .index("by_product_and_rating", ["productId", "rating"])
    .index("by_status", ["status"]),

  // ==========================================
  // HOTEL/TRAVEL BOOKING MODULE
  // Organizers can add hotel packages to their events
  // ==========================================

  // Hotel packages added by organizers to their events
  hotelPackages: defineTable({
    eventId: v.id("events"),
    organizerId: v.id("users"),

    // Hotel info
    hotelName: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    description: v.optional(v.string()),
    amenities: v.optional(v.array(v.string())), // ["WiFi", "Pool", "Parking", "Breakfast"]
    starRating: v.optional(v.number()), // 1-5 stars
    images: v.optional(v.array(v.string())), // Image URLs

    // Room types with pricing
    roomTypes: v.array(
      v.object({
        id: v.string(), // Unique room type ID
        name: v.string(), // "Standard King", "Deluxe Suite"
        pricePerNightCents: v.number(),
        quantity: v.number(), // Total rooms available
        sold: v.number(), // Rooms booked
        maxGuests: v.number(),
        description: v.optional(v.string()),
        version: v.optional(v.number()), // For optimistic locking (prevent race conditions)
      })
    ),

    // Event-specific dates (suggested check-in/out)
    checkInDate: v.number(), // Suggested check-in (day before event)
    checkOutDate: v.number(), // Suggested check-out (day after event)

    // Booking settings
    bookingCutoffHours: v.optional(v.number()), // Hours before event to stop bookings
    specialInstructions: v.optional(v.string()), // Special booking instructions

    // Contact info (optional - for direct booking inquiries)
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),

    // Status
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_organizer", ["organizerId"])
    .index("by_active", ["isActive"]),

  // Hotel reservations (customer bookings)
  hotelReservations: defineTable({
    packageId: v.id("hotelPackages"),
    eventId: v.id("events"),
    roomTypeId: v.string(),

    // Guest info
    userId: v.id("users"),
    guestName: v.string(),
    guestEmail: v.string(),
    guestPhone: v.optional(v.string()),

    // Booking details
    checkInDate: v.number(),
    checkOutDate: v.number(),
    numberOfNights: v.number(),
    numberOfRooms: v.number(),
    numberOfGuests: v.number(),

    // Pricing
    pricePerNightCents: v.number(),
    subtotalCents: v.number(), // pricePerNight * nights * rooms
    platformFeeCents: v.number(), // Platform fee
    totalCents: v.number(), // subtotal + platformFee

    // Payment
    paymentMethod: v.union(v.literal("STRIPE"), v.literal("PAYPAL")),
    stripePaymentIntentId: v.optional(v.string()),
    paypalOrderId: v.optional(v.string()),

    // Status
    status: v.union(
      v.literal("PENDING"), // Awaiting payment
      v.literal("CONFIRMED"), // Payment complete
      v.literal("CANCELLED"), // Guest cancelled
      v.literal("REFUNDED"), // Refunded
      v.literal("EXPIRED") // Hold expired without payment
    ),

    // Hold system (for preventing race conditions)
    holdToken: v.optional(v.string()), // Unique token for this hold
    expiresAt: v.optional(v.number()), // When the hold expires (15 min)

    // Optional: Link to ticket order (for bundled bookings)
    orderId: v.optional(v.id("orders")),

    // Additional info
    specialRequests: v.optional(v.string()),
    confirmationNumber: v.string(), // Unique confirmation code

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_package", ["packageId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_confirmation", ["confirmationNumber"])
    .index("by_expires", ["expiresAt"]), // For cleanup cron

  // ==========================================
  // TAX RATES MODULE - Configurable state-based tax rates
  // ==========================================

  // Tax rates by state for accurate checkout calculations
  taxRates: defineTable({
    state: v.string(), // 2-letter state code: "IL", "CA", "TX"
    stateFullName: v.string(), // Full name: "Illinois", "California"
    rate: v.number(), // Tax rate as decimal: 0.0625 for 6.25%
    description: v.optional(v.string()), // "State sales tax"
    isActive: v.boolean(),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_state", ["state"])
    .index("by_active", ["isActive"]),

  // ==========================================
  // SHIPPING ZONES MODULE - Story 4.2: Address-based shipping rates
  // ==========================================

  // Shipping zones for calculating delivery costs by region
  shippingZones: defineTable({
    name: v.string(), // "Local", "Regional", "Extended", "Remote"
    states: v.array(v.string()), // ["IL", "IN", "WI"]
    standardRate: v.number(), // Rate in cents: 599 = $5.99
    expressRate: v.number(), // Express rate in cents: 1299 = $12.99
    standardDays: v.string(), // "3-5 business days"
    expressDays: v.string(), // "1-2 business days"
    freeShippingThreshold: v.optional(v.number()), // Subtotal in cents for free shipping
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_active", ["isActive"]),

  // ==========================================
  // SOCIAL PROOF MODULE - Story 3.6
  // ==========================================

  // Event interests (users marking "Interested" in events)
  eventInterests: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_event_user", ["eventId", "userId"]),

  // User privacy settings for social features
  userPrivacySettings: defineTable({
    userId: v.id("users"),
    hideEventAttendance: v.optional(v.boolean()), // Hide from "Who's Going" sections
    hideInterests: v.optional(v.boolean()), // Hide "Interested" status from public
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Instructor profiles for dance classes
  instructors: defineTable({
    userId: v.id("users"),           // Link to user account
    slug: v.string(),                // URL-friendly identifier
    name: v.string(),                // Display name
    title: v.optional(v.string()),   // e.g., "Master Instructor"
    bio: v.optional(v.string()),     // Rich text bio
    photoUrl: v.optional(v.string()),// Profile photo
    bannerUrl: v.optional(v.string()),// Profile banner
    specialties: v.array(v.string()),// ["Steppin", "Line Dance", "Walking"]
    experienceYears: v.optional(v.number()),
    location: v.optional(v.string()),// City, State
    socialLinks: v.optional(v.object({
      instagram: v.optional(v.string()),
      facebook: v.optional(v.string()),
      youtube: v.optional(v.string()),
      website: v.optional(v.string()),
    })),
    verified: v.boolean(),           // Verified instructor badge
    featured: v.boolean(),           // Featured on homepage
    isActive: v.boolean(),           // Profile visible
    classCount: v.optional(v.number()), // Cached count of classes
    studentCount: v.optional(v.number()), // Cached count of students taught
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_verified", ["verified", "isActive"])
    .index("by_featured", ["featured", "isActive"])
    .index("by_userId", ["userId"])
    .index("by_active", ["isActive"]),

  // ==========================================
  // CLASS REVIEWS MODULE - Story 6.3
  // Students can leave reviews and ratings for classes they attended
  // ==========================================

  // Class reviews and ratings
  classReviews: defineTable({
    classId: v.id("events"),             // The class being reviewed
    userId: v.id("users"),               // The reviewer
    ticketId: v.optional(v.id("tickets")), // Proof of enrollment
    rating: v.number(),                  // 1-5 stars
    reviewText: v.optional(v.string()),  // Optional review content (max 500 chars)
    instructorResponse: v.optional(v.string()), // Instructor can reply
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    // Story 6.3.1: Helpful voting counts
    helpfulCount: v.optional(v.number()),
    unhelpfulCount: v.optional(v.number()),
    // Story 6.3.3: Flagging/moderation
    flagCount: v.optional(v.number()),
    isHidden: v.optional(v.boolean()),   // Auto-hide if flagged 3+ times
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_class", ["classId", "status"])
    .index("by_user", ["userId"])
    .index("by_class_user", ["classId", "userId"]),

  // Story 6.3.1: Review voting (helpful/unhelpful)
  reviewVotes: defineTable({
    reviewId: v.id("classReviews"),
    userId: v.id("users"),
    voteType: v.union(v.literal("helpful"), v.literal("unhelpful")),
    createdAt: v.number(),
  })
    .index("by_review_user", ["reviewId", "userId"])
    .index("by_review", ["reviewId"]),

  // Story 6.3.3: Review flags/reports
  reviewFlags: defineTable({
    reviewId: v.id("classReviews"),
    userId: v.id("users"),
    reason: v.union(
      v.literal("spam"),
      v.literal("inappropriate"),
      v.literal("fake"),
      v.literal("harassment"),
      v.literal("other")
    ),
    customReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_review", ["reviewId"])
    .index("by_review_user", ["reviewId", "userId"]),

  // Story 8.6: Carpool/Ride-Share Coordination
  // Helps out-of-towners find rides to events
  carpoolOffers: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    // Departure info
    departureCity: v.string(),
    departureState: v.string(),
    departureDate: v.number(), // Timestamp
    departureTime: v.string(), // "4:00 PM"
    // Capacity
    seatsAvailable: v.number(),
    seatsTaken: v.optional(v.number()), // Track filled seats
    // Contribution
    contributionRequested: v.optional(v.string()), // "$25 for gas"
    // Contact
    contactMethod: v.union(
      v.literal("app_message"),
      v.literal("phone"),
      v.literal("email")
    ),
    contactInfo: v.optional(v.string()), // Phone/email if not app_message
    // Details
    notes: v.optional(v.string()),
    // Status
    status: v.union(
      v.literal("active"),
      v.literal("full"),
      v.literal("cancelled")
    ),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId", "status"])
    .index("by_user", ["userId"])
    .index("by_event_city", ["eventId", "departureCity"]),

  // Carpool ride requests
  carpoolRequests: defineTable({
    carpoolOfferId: v.id("carpoolOffers"),
    userId: v.id("users"),
    eventId: v.id("events"),
    message: v.optional(v.string()), // Message to driver
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_carpool", ["carpoolOfferId"])
    .index("by_user", ["userId"])
    .index("by_carpool_status", ["carpoolOfferId", "status"]),

  // Story 8.7: Event Passport Gamification
  // Track user's event attendance and achievements
  userEventPassport: defineTable({
    userId: v.id("users"),
    eventsAttended: v.number(),
    uniqueCities: v.array(v.string()),
    uniqueStates: v.array(v.string()),
    weekendersAttended: v.number(),
    setsAttended: v.number(),
    ballsAttended: v.number(),
    workshopsAttended: v.number(),
    achievements: v.array(v.string()), // Achievement codes
    totalTicketsPurchased: v.optional(v.number()),
    firstEventDate: v.optional(v.number()),
    lastEventDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_events_attended", ["eventsAttended"]),

  // Achievement definitions
  achievements: defineTable({
    code: v.string(), // Unique identifier
    name: v.string(),
    description: v.string(),
    icon: v.string(), // Emoji or icon name
    category: v.union(
      v.literal("attendance"),
      v.literal("explorer"),
      v.literal("specialist"),
      v.literal("social"),
      v.literal("milestone")
    ),
    requirement: v.object({
      type: v.union(
        v.literal("events_attended"),
        v.literal("cities_visited"),
        v.literal("states_visited"),
        v.literal("weekenders_attended"),
        v.literal("sets_attended"),
        v.literal("balls_attended"),
        v.literal("workshops_attended")
      ),
      count: v.number(),
    }),
    tier: v.union(
      v.literal("bronze"),
      v.literal("silver"),
      v.literal("gold"),
      v.literal("platinum")
    ),
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_category", ["category"])
    .index("by_tier", ["tier"]),

  // Track which events user has attended (via ticket scan or check-in)
  eventAttendance: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    ticketId: v.optional(v.id("tickets")),
    checkedInAt: v.number(),
    checkedInBy: v.optional(v.id("users")), // Staff who scanned
    // Cache event details for faster passport queries
    eventName: v.string(),
    eventCity: v.optional(v.string()),
    eventState: v.optional(v.string()),
    eventType: v.optional(v.string()), // weekender, set, ball, workshop, social
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_user_event", ["userId", "eventId"]),

  // ========================================
  // EPIC 11: Services & Radio
  // ========================================

  // Service Providers - Angie's List style local services
  serviceProviders: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    businessName: v.optional(v.string()),
    description: v.optional(v.string()),

    // Contact
    phone: v.string(),
    email: v.string(),
    website: v.optional(v.string()),

    // Location
    serviceArea: v.array(v.string()), // Cities/regions served
    city: v.string(),
    state: v.string(),
    zipCode: v.optional(v.string()),

    // Categorization
    category: v.string(), // Primary category (hair, plumbing, DJ, etc.)
    subcategories: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),

    // Visual
    logoUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    portfolioImages: v.optional(v.array(v.string())),

    // Business Details
    yearsInBusiness: v.optional(v.number()),
    isLicensed: v.optional(v.boolean()),
    licenseNumber: v.optional(v.string()),

    // Ratings (cached)
    averageRating: v.optional(v.number()),
    totalReviews: v.optional(v.number()),

    // Status
    status: v.union(
      v.literal("PENDING"),
      v.literal("APPROVED"),
      v.literal("REJECTED"),
      v.literal("SUSPENDED")
    ),
    tier: v.optional(v.union(
      v.literal("BASIC"),
      v.literal("VERIFIED"),
      v.literal("PREMIUM")
    )),
    isActive: v.boolean(),

    // If this provider is also a DJ
    isDJ: v.optional(v.boolean()),
    djProfileId: v.optional(v.id("djProfiles")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_slug", ["slug"])
    .index("by_category", ["category", "isActive"])
    .index("by_status", ["status"])
    .index("by_rating", ["averageRating", "isActive"])
    .index("by_tier", ["tier", "isActive"])
    .index("by_city", ["city", "state", "isActive"]),

  // DJ Profiles - Extended profile for DJs in the Radio section
  djProfiles: defineTable({
    serviceProviderId: v.optional(v.id("serviceProviders")), // Link to service provider (optional for standalone DJs)
    userId: v.id("users"),

    // DJ-specific info
    stageName: v.string(),
    slug: v.string(),
    bio: v.optional(v.string()),
    genres: v.array(v.string()), // ["R&B", "Steppin", "House", "Neo-Soul"]

    // Visual
    photoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),

    // Music Links (for embeds)
    soundcloudUrl: v.optional(v.string()),
    mixcloudUrl: v.optional(v.string()),
    spotifyUrl: v.optional(v.string()),
    appleMusicUrl: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),

    // Social Links
    instagramUrl: v.optional(v.string()),
    tiktokUrl: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
    twitterUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),

    // Booking
    bookingEmail: v.optional(v.string()),
    bookingPhone: v.optional(v.string()),
    minimumBookingHours: v.optional(v.number()),
    hourlyRate: v.optional(v.number()), // In cents
    acceptsWeddings: v.optional(v.boolean()),
    acceptsCorporate: v.optional(v.boolean()),
    acceptsClubs: v.optional(v.boolean()),
    acceptsPrivateParties: v.optional(v.boolean()),

    // Status
    verified: v.boolean(),
    featured: v.boolean(),
    isActive: v.boolean(),

    // Stats
    totalEvents: v.optional(v.number()),
    averageRating: v.optional(v.number()),
    totalReviews: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_user", ["userId"])
    .index("by_service_provider", ["serviceProviderId"])
    .index("by_featured", ["featured", "isActive"])
    .index("by_verified", ["verified", "isActive"]),

  // Radio Top 10 - Curated weekly top songs
  radioTop10: defineTable({
    rank: v.number(), // 1-10
    title: v.string(),
    artist: v.string(),
    embedUrl: v.string(), // SoundCloud/Spotify embed URL
    embedType: v.union(
      v.literal("soundcloud"),
      v.literal("spotify"),
      v.literal("mixcloud"),
      v.literal("youtube")
    ),
    coverImageUrl: v.optional(v.string()),
    addedBy: v.id("users"), // Admin who added it
    weekOf: v.string(), // "2026-01-01" - week starting date
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_week", ["weekOf", "rank"])
    .index("by_active", ["isActive", "rank"]),

  // Service Provider Reviews
  serviceReviews: defineTable({
    serviceProviderId: v.id("serviceProviders"),
    userId: v.id("users"),
    rating: v.number(), // 1-5
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    serviceDate: v.optional(v.number()), // When service was performed
    verified: v.boolean(), // Verified purchase/service
    helpful: v.optional(v.number()), // Helpful vote count
    providerResponse: v.optional(v.string()), // Provider's response to the review
    providerResponseAt: v.optional(v.number()), // When provider responded
    status: v.union(
      v.literal("PENDING"),
      v.literal("APPROVED"),
      v.literal("FLAGGED"),
      v.literal("REMOVED")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_provider", ["serviceProviderId", "status"])
    .index("by_user", ["userId"])
    .index("by_rating", ["serviceProviderId", "rating"]),

  // Service Categories
  serviceCategories: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.string(), // Lucide icon name
    parentCategory: v.optional(v.string()), // For subcategories
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_parent", ["parentCategory", "isActive"])
    .index("by_sort", ["sortOrder"]),

  // Service Provider Favorites
  serviceProviderFavorites: defineTable({
    userId: v.id("users"),
    serviceProviderId: v.id("serviceProviders"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_provider", ["serviceProviderId"])
    .index("by_user_provider", ["userId", "serviceProviderId"]),

  // Service Views - Track profile views for analytics
  serviceViews: defineTable({
    serviceProviderId: v.id("serviceProviders"),
    userId: v.optional(v.id("users")), // null for anonymous views
    sessionId: v.optional(v.string()), // For anonymous tracking
    source: v.optional(v.string()), // "search", "category", "direct", "referral"
    referrer: v.optional(v.string()), // Where they came from
    createdAt: v.number(),
  })
    .index("by_provider", ["serviceProviderId", "createdAt"])
    .index("by_provider_date", ["serviceProviderId"])
    .index("by_date", ["createdAt"]),

  // Service Inquiries - Track contact/inquiry clicks
  serviceInquiries: defineTable({
    serviceProviderId: v.id("serviceProviders"),
    userId: v.optional(v.id("users")), // null for anonymous
    type: v.union(
      v.literal("phone_click"),
      v.literal("email_click"),
      v.literal("website_click"),
      v.literal("contact_form"),
      v.literal("booking_request")
    ),
    message: v.optional(v.string()), // For contact forms
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("responded"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
    createdAt: v.number(),
  })
    .index("by_provider", ["serviceProviderId", "createdAt"])
    .index("by_provider_type", ["serviceProviderId", "type"])
    .index("by_date", ["createdAt"]),

  // Feature Flags - Dynamic feature toggles for admin control
  featureFlags: defineTable({
    key: v.string(), // Unique feature flag key (e.g., "email_notifications", "event_analytics")
    enabled: v.boolean(), // Whether the feature is enabled
    description: v.optional(v.string()), // Human-readable description
    updatedAt: v.number(), // Last update timestamp
    updatedBy: v.optional(v.id("users")), // Admin who last updated
  })
    .index("by_key", ["key"]),

  // Platform Settings - Editable platform configuration
  platformSettings: defineTable({
    key: v.string(), // Setting key (e.g., "platform_name", "support_email")
    value: v.string(), // Setting value
    type: v.union(
      v.literal("string"),
      v.literal("number"),
      v.literal("boolean"),
      v.literal("json")
    ),
    description: v.optional(v.string()),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"]),

  // Processed Webhook Events - Prevent duplicate processing
  processedWebhookEvents: defineTable({
    eventId: v.string(), // Stripe/PayPal event ID
    eventType: v.string(), // Type of webhook event
    provider: v.union(v.literal("stripe"), v.literal("paypal")),
    processedAt: v.number(),
    orderId: v.optional(v.string()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_processedAt", ["processedAt"]),

  // User Subscriptions - Platform subscription tiers
  userSubscriptions: defineTable({
    userId: v.id("users"),
    plan: v.union(
      v.literal("FREE"),
      v.literal("BASIC"),
      v.literal("PRO"),
      v.literal("ENTERPRISE")
    ),
    status: v.union(
      v.literal("ACTIVE"),
      v.literal("CANCELLED"),
      v.literal("EXPIRED"),
      v.literal("PAST_DUE")
    ),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    startedAt: v.number(),
    expiresAt: v.number(),
    lastPaymentAt: v.optional(v.number()),
    lastPaymentAmount: v.optional(v.number()),
    maxEventsPerMonth: v.optional(v.number()),
    maxTicketsPerEvent: v.optional(v.number()),
    includedCredits: v.number(),
    cancelledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"])
    .index("by_expiresAt", ["expiresAt"])
    .index("by_status", ["status"]),

  // Event Promotions - Paid event promotion features
  eventPromotions: defineTable({
    eventId: v.id("events"),
    organizerId: v.id("users"),
    promotionType: v.union(
      v.literal("FEATURED"),
      v.literal("HOMEPAGE"),
      v.literal("CATEGORY"),
      v.literal("SEARCH_BOOST")
    ),
    status: v.union(
      v.literal("PENDING"),
      v.literal("ACTIVE"),
      v.literal("CANCELLED"),
      v.literal("EXPIRED")
    ),
    stripePaymentIntentId: v.optional(v.string()),
    amountPaid: v.number(),
    startedAt: v.optional(v.number()),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_organizerId", ["organizerId"])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"])
    .index("by_expiresAt", ["expiresAt"])
    .index("by_status", ["status"]),

  // ============================================
  // RADIO STREAMING MODULE
  // ============================================

  // Radio Stations - DJ streaming stations linked to AzuraCast
  radioStations: defineTable({
    // Owner/DJ reference
    djId: v.id("users"),
    djName: v.string(),

    // Station info
    name: v.string(),
    slug: v.string(), // URL-friendly identifier (e.g., "smooth-groove-radio")
    description: v.optional(v.string()),
    genre: v.string(), // Primary genre (Steppin, R&B, Soul, etc.)
    genres: v.optional(v.array(v.string())), // Additional genres

    // Media
    logoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),

    // AzuraCast integration
    azuracastStationId: v.optional(v.number()), // AzuraCast internal station ID
    azuracastShortcode: v.optional(v.string()), // AzuraCast station shortcode
    mountPoint: v.optional(v.string()), // e.g., "/radio/smooth-groove"
    streamUrl: v.optional(v.string()), // Direct Icecast stream URL

    // DJ credentials for AzuraCast (encrypted/hashed)
    azuracastDjUsername: v.optional(v.string()),
    azuracastDjPasswordHash: v.optional(v.string()),

    // Status
    status: v.union(
      v.literal("PENDING"), // Application submitted
      v.literal("APPROVED"), // Approved, station being created
      v.literal("ACTIVE"), // Live and operational
      v.literal("SUSPENDED"), // Temporarily disabled
      v.literal("INACTIVE") // Archived/closed
    ),

    // Streaming status (real-time)
    isLive: v.optional(v.boolean()),
    currentListeners: v.optional(v.number()),
    peakListeners: v.optional(v.number()),

    // Now playing (cached from AzuraCast)
    nowPlaying: v.optional(v.object({
      title: v.optional(v.string()),
      artist: v.optional(v.string()),
      album: v.optional(v.string()),
      artUrl: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      duration: v.optional(v.number()),
    })),

    // DJ tier (affects revenue share)
    tier: v.optional(v.union(
      v.literal("STANDARD"), // 70% to DJ
      v.literal("VERIFIED"), // 80% to DJ
      v.literal("PREMIUM") // 85% to DJ (future)
    )),

    // Settings
    autoDjEnabled: v.optional(v.boolean()),
    webDjEnabled: v.optional(v.boolean()), // Allow browser-based broadcasting

    // Stats (aggregated)
    totalListenHours: v.optional(v.number()),
    totalUniqueListeners: v.optional(v.number()),
    avgSessionDuration: v.optional(v.number()), // in seconds

    // Social links
    socialLinks: v.optional(v.object({
      instagram: v.optional(v.string()),
      facebook: v.optional(v.string()),
      twitter: v.optional(v.string()),
      website: v.optional(v.string()),
    })),

    // Schedule (weekly broadcast times)
    schedule: v.optional(v.array(v.object({
      dayOfWeek: v.number(), // 0=Sunday, 6=Saturday
      startTime: v.string(), // "20:00"
      endTime: v.string(), // "23:00"
      showName: v.optional(v.string()),
    }))),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
    lastLiveAt: v.optional(v.number()),
  })
    .index("by_djId", ["djId"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_isLive", ["isLive", "status"])
    .index("by_genre", ["genre", "status"]),

  // DJ Applications - DJs applying for streaming stations
  djApplications: defineTable({
    userId: v.id("users"),
    userName: v.string(),
    userEmail: v.string(),

    // Application details
    djName: v.string(), // Stage name
    proposedStationName: v.string(),
    genre: v.string(),
    description: v.string(),

    // Experience & samples
    experience: v.optional(v.string()), // Years/background
    sampleMixUrl: v.optional(v.string()), // Link to sample mix (SoundCloud, Mixcloud, etc.)
    socialProof: v.optional(v.string()), // Social media links, follower counts

    // Broadcast preferences
    preferredSchedule: v.optional(v.string()), // When they want to broadcast
    broadcastMethod: v.optional(v.union(
      v.literal("WEB_DJ"), // Browser-based
      v.literal("OBS"), // OBS/Streaming software
      v.literal("MIXXX"), // DJ software
      v.literal("OTHER")
    )),

    // Content agreement
    contentAgreementAccepted: v.boolean(),
    contentAgreementDate: v.optional(v.number()),

    // Status
    status: v.union(
      v.literal("PENDING"),
      v.literal("UNDER_REVIEW"),
      v.literal("APPROVED"),
      v.literal("REJECTED"),
      v.literal("WAITLISTED")
    ),

    // Admin review
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),

    // Created station reference
    stationId: v.optional(v.id("radioStations")),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  // Radio Shows - Pre-recorded shows/mixes uploaded by DJs
  radioShows: defineTable({
    stationId: v.id("radioStations"),
    djId: v.id("users"),

    // Show info
    title: v.string(),
    description: v.optional(v.string()),
    genre: v.optional(v.string()),

    // Media
    coverImageUrl: v.optional(v.string()),
    audioFileId: v.optional(v.id("_storage")), // Convex storage
    audioUrl: v.optional(v.string()), // External URL if not in Convex storage
    duration: v.optional(v.number()), // in seconds

    // AzuraCast integration
    azuracastMediaId: v.optional(v.number()),
    azuracastPlaylistId: v.optional(v.number()),

    // Scheduling
    scheduledAt: v.optional(v.number()), // When to play
    isRecurring: v.optional(v.boolean()),
    recurringSchedule: v.optional(v.object({
      dayOfWeek: v.number(),
      time: v.string(), // "20:00"
    })),

    // Status
    status: v.union(
      v.literal("UPLOADING"),
      v.literal("PROCESSING"),
      v.literal("PENDING_APPROVAL"),
      v.literal("APPROVED"),
      v.literal("SCHEDULED"),
      v.literal("PLAYED"),
      v.literal("REJECTED")
    ),

    // Stats
    playCount: v.optional(v.number()),
    lastPlayedAt: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_stationId", ["stationId", "status"])
    .index("by_djId", ["djId"])
    .index("by_scheduledAt", ["scheduledAt", "status"])
    .index("by_status", ["status"]),

  // Ad Campaigns - Audio and display ad campaigns for radio
  radioAdCampaigns: defineTable({
    // Advertiser info
    advertiserName: v.string(),
    advertiserEmail: v.optional(v.string()),
    advertiserCompany: v.optional(v.string()),

    // Campaign info
    name: v.string(),
    description: v.optional(v.string()),

    // Campaign type
    type: v.union(
      v.literal("AUDIO"), // Audio ad insertion
      v.literal("DISPLAY"), // Banner/companion ads
      v.literal("SPONSORSHIP") // Station sponsorship
    ),

    // Media assets
    audioFileId: v.optional(v.id("_storage")),
    audioUrl: v.optional(v.string()),
    audioDuration: v.optional(v.number()), // in seconds
    bannerImageUrl: v.optional(v.string()),
    clickThroughUrl: v.optional(v.string()),

    // Targeting
    targetGenres: v.optional(v.array(v.string())),
    targetStations: v.optional(v.array(v.id("radioStations"))),
    targetDayParts: v.optional(v.array(v.string())), // "morning", "afternoon", "evening", "latenight"

    // Budget & billing
    budgetTotal: v.optional(v.number()), // Total campaign budget
    budgetSpent: v.optional(v.number()), // Amount spent
    cpmRate: v.optional(v.number()), // Cost per 1000 impressions

    // Schedule
    startDate: v.number(),
    endDate: v.number(),

    // Frequency (for audio ads)
    maxPlaysPerHour: v.optional(v.number()),
    maxPlaysPerDay: v.optional(v.number()),

    // Status
    status: v.union(
      v.literal("DRAFT"),
      v.literal("PENDING_APPROVAL"),
      v.literal("APPROVED"),
      v.literal("ACTIVE"),
      v.literal("PAUSED"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED")
    ),

    // Stats
    impressions: v.optional(v.number()),
    clicks: v.optional(v.number()),

    // Admin
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_type", ["type", "status"])
    .index("by_dates", ["startDate", "endDate", "status"]),

  // Ad Impressions - Track individual ad plays
  radioAdImpressions: defineTable({
    campaignId: v.id("radioAdCampaigns"),
    stationId: v.id("radioStations"),

    // Impression type
    type: v.union(v.literal("PLAY"), v.literal("VIEW"), v.literal("CLICK")),

    // Listener info (anonymized)
    listenerFingerprint: v.optional(v.string()), // Hashed identifier
    listenerRegion: v.optional(v.string()), // e.g., "US-IL"

    // Session info
    sessionId: v.optional(v.string()),

    // Revenue
    revenueGenerated: v.optional(v.number()), // Revenue from this impression

    // Timestamp
    timestamp: v.number(),
  })
    .index("by_campaignId", ["campaignId", "timestamp"])
    .index("by_stationId", ["stationId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // Stream Analytics - Aggregated listener statistics
  radioStreamAnalytics: defineTable({
    stationId: v.id("radioStations"),

    // Time period
    periodType: v.union(
      v.literal("HOURLY"),
      v.literal("DAILY"),
      v.literal("WEEKLY"),
      v.literal("MONTHLY")
    ),
    periodStart: v.number(), // Timestamp of period start
    periodEnd: v.number(),

    // Listener stats
    uniqueListeners: v.number(),
    totalListenSessions: v.number(),
    totalListenSeconds: v.number(),
    peakConcurrentListeners: v.number(),
    avgSessionDuration: v.number(), // in seconds

    // Geographic breakdown
    listenersByRegion: v.optional(v.array(v.object({
      region: v.string(), // "US-IL", "US-GA", etc.
      count: v.number(),
    }))),

    // Device breakdown
    listenersByDevice: v.optional(v.object({
      desktop: v.number(),
      mobile: v.number(),
      tablet: v.number(),
      other: v.number(),
    })),

    // Revenue for this period
    adRevenue: v.optional(v.number()),
    sponsorshipRevenue: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_station_period", ["stationId", "periodType", "periodStart"])
    .index("by_periodStart", ["periodStart", "periodType"]),

  // DJ Payouts - Revenue share payments to DJs
  radioDjPayouts: defineTable({
    djId: v.id("users"),
    stationId: v.id("radioStations"),

    // Payout period
    periodStart: v.number(),
    periodEnd: v.number(),

    // Revenue breakdown
    grossRevenue: v.number(), // Total revenue generated
    platformFee: v.number(), // Platform's share
    djShare: v.number(), // DJ's share (70%/80% based on tier)

    // Revenue sources
    adRevenue: v.optional(v.number()),
    sponsorshipRevenue: v.optional(v.number()),

    // Metrics for the period
    totalListenHours: v.optional(v.number()),
    uniqueListeners: v.optional(v.number()),

    // Payment info
    paymentMethod: v.optional(v.union(
      v.literal("STRIPE"),
      v.literal("PAYPAL"),
      v.literal("BANK_TRANSFER")
    )),
    stripeTransferId: v.optional(v.string()),
    paypalPayoutId: v.optional(v.string()),

    // Status
    status: v.union(
      v.literal("PENDING"), // Calculated, awaiting review
      v.literal("APPROVED"), // Approved for payment
      v.literal("PROCESSING"), // Payment in progress
      v.literal("PAID"), // Payment completed
      v.literal("FAILED"), // Payment failed
      v.literal("CANCELLED") // Cancelled
    ),

    // Admin review
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),

    // Notes
    notes: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_djId", ["djId", "status"])
    .index("by_stationId", ["stationId"])
    .index("by_status", ["status"])
    .index("by_periodStart", ["periodStart"]),

  // Listen Sessions - Track individual listener sessions for accurate analytics
  radioListenSessions: defineTable({
    stationId: v.id("radioStations"),

    // Listener identification (privacy-respecting)
    listenerFingerprint: v.string(), // Hashed identifier
    userId: v.optional(v.id("users")), // If logged in

    // Session timing
    sessionId: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),

    // Device/location info
    userAgent: v.optional(v.string()),
    deviceType: v.optional(v.union(
      v.literal("DESKTOP"),
      v.literal("MOBILE"),
      v.literal("TABLET"),
      v.literal("OTHER")
    )),
    region: v.optional(v.string()), // "US-IL"
    city: v.optional(v.string()),

    // Playback info
    streamQuality: v.optional(v.string()), // "128k", "320k"
    playerType: v.optional(v.string()), // "web", "mobile_app", "external"

    // Status
    isActive: v.boolean(),
  })
    .index("by_stationId", ["stationId", "startedAt"])
    .index("by_sessionId", ["sessionId"])
    .index("by_fingerprint", ["listenerFingerprint", "stationId"])
    .index("by_isActive", ["isActive", "stationId"]),

  // Class Attendance Tracking (Story 9.6)
  // Track student attendance for instructor-led classes
  classAttendance: defineTable({
    classId: v.id("events"),        // The class (type: "CLASS")
    userId: v.id("users"),          // The student
    sessionDate: v.number(),        // Timestamp of class session (normalized to start of day)
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("late"),
      v.literal("excused")
    ),
    markedBy: v.id("users"),        // Instructor who marked attendance
    markedAt: v.number(),           // When attendance was marked
    notes: v.optional(v.string()),  // Optional notes (e.g., "Left early", "Medical note provided")
  })
    .index("by_class", ["classId"])
    .index("by_user", ["userId"])
    .index("by_class_session", ["classId", "sessionDate"])
    .index("by_class_user", ["classId", "userId"]),

  // Support Tickets (Story 10.3)
  supportTickets: defineTable({
    userId: v.id("users"),
    ticketNumber: v.string(),         // e.g., "TKT-2026-0001"
    subject: v.string(),
    message: v.string(),
    category: v.optional(v.string()), // "billing", "technical", "general"
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    assignedTo: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_ticket_number", ["ticketNumber"]),

  supportTicketReplies: defineTable({
    ticketId: v.id("supportTickets"),
    authorId: v.id("users"),
    message: v.string(),
    isInternal: v.boolean(),          // Internal notes vs customer-visible
    createdAt: v.number(),
  })
    .index("by_ticket", ["ticketId"]),

  // ==========================================
  // ORGANIZER PAYOUTS (Story 10.1)
  // ==========================================

  // Organizer Payouts - Payout requests and history for event organizers
  organizerPayouts: defineTable({
    organizerId: v.id("users"),
    payoutNumber: v.string(), // e.g., "ORG-PAY-2025-0001"
    amountCents: v.number(), // Total payout amount in cents
    status: v.union(
      v.literal("PENDING"),    // Requested by organizer
      v.literal("APPROVED"),   // Approved by admin
      v.literal("PROCESSING"), // Payment being processed
      v.literal("COMPLETED"),  // Payment sent
      v.literal("REJECTED"),   // Request rejected
      v.literal("FAILED")      // Payment failed
    ),
    stripeTransferId: v.optional(v.string()), // Stripe transfer ID if paid via Stripe
    paymentMethod: v.optional(v.string()), // "stripe", "bank_transfer", "paypal", "check"
    requestedAt: v.number(), // When payout was requested
    processedAt: v.optional(v.number()), // When admin approved/rejected
    completedAt: v.optional(v.number()), // When payment was completed
    adminNotes: v.optional(v.string()), // Internal notes from admin
    rejectionReason: v.optional(v.string()), // Reason if rejected
  })
    .index("by_organizer", ["organizerId"])
    .index("by_status", ["status"]),

  // ==========================================
  // ORGANIZER PAYMENT METHODS (Story 11.1)
  // ==========================================

  // Organizer Payment Methods - Saved payout destinations for organizers
  organizerPaymentMethods: defineTable({
    organizerId: v.id("users"),
    type: v.union(
      v.literal("bank_account"),  // ACH bank transfer
      v.literal("paypal"),        // PayPal email
      v.literal("stripe_connect") // Stripe Connected Account
    ),
    isDefault: v.boolean(), // Whether this is the default payment method
    nickname: v.optional(v.string()), // User-friendly name like "Business Checking"

    // Bank Account Details (encrypted/masked for display)
    bankName: v.optional(v.string()), // e.g., "Chase Bank"
    accountType: v.optional(v.string()), // "checking" or "savings"
    accountHolderName: v.optional(v.string()), // Name on the account
    routingNumber: v.optional(v.string()), // Stored securely (last 4 displayed)
    accountNumberLast4: v.optional(v.string()), // Only last 4 digits stored

    // PayPal Details
    paypalEmail: v.optional(v.string()), // PayPal email address

    // Stripe Connect Details
    stripeConnectedAccountId: v.optional(v.string()), // Stripe account ID
    stripeAccountStatus: v.optional(v.string()), // "pending", "active", "restricted"

    // Status and Metadata
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending_verification")
    ),
    verifiedAt: v.optional(v.number()), // When the payment method was verified
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organizer", ["organizerId"])
    .index("by_organizer_type", ["organizerId", "type"])
    .index("by_organizer_default", ["organizerId", "isDefault"]),

  // ==========================================
  // NOTIFICATIONS (Story 11.2)
  // ==========================================

  // Notifications - Real-time alerts for users
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("order"),          // Order confirmation, refund, etc.
      v.literal("event"),          // Event updates, reminders
      v.literal("ticket"),         // Ticket purchase, transfer
      v.literal("class"),          // Class enrollment, reminder
      v.literal("payout"),         // Payout status updates
      v.literal("review"),         // New review received
      v.literal("message"),        // Direct message
      v.literal("system"),         // System announcements
      v.literal("promotion")       // Promotional notifications
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),

    // Optional link to related resource
    linkType: v.optional(v.string()), // "event", "order", "class", "ticket", etc.
    linkId: v.optional(v.string()),   // ID of the related resource
    linkUrl: v.optional(v.string()),  // Direct URL to navigate to

    // Optional image/icon
    imageUrl: v.optional(v.string()),

    // Metadata
    metadata: v.optional(v.any()), // Additional data specific to notification type

    createdAt: v.number(),
    readAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()), // Optional expiration for promotional notifications
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_user_type", ["userId", "type"])
    .index("by_created", ["createdAt"]),

  // Webhook Events - Idempotency tracking for payment webhooks
  // Prevents duplicate processing of Stripe/PayPal webhook events
  webhookEvents: defineTable({
    eventId: v.string(), // Unique event ID from Stripe/PayPal (e.g., "evt_xxx" or PayPal event ID)
    eventType: v.string(), // Event type (e.g., "checkout.session.completed", "PAYMENT.CAPTURE.COMPLETED")
    provider: v.union(v.literal("stripe"), v.literal("paypal")), // Which payment provider
    orderId: v.optional(v.string()), // Associated order ID if available
    processedAt: v.number(), // When the event was processed
    expiresAt: v.number(), // When this record can be cleaned up (7 days after processing)
  })
    .index("by_eventId", ["eventId"])
    .index("by_provider", ["provider"])
    .index("by_expiresAt", ["expiresAt"]),

  // Payment Disputes - Track disputes/chargebacks from PayPal and Stripe
  paymentDisputes: defineTable({
    // Dispute identifiers
    disputeId: v.string(), // PayPal/Stripe dispute ID (e.g., "PP-D-12345" or "dp_xxx")
    provider: v.union(v.literal("stripe"), v.literal("paypal")),

    // Associated order
    orderId: v.optional(v.id("orders")),
    eventId: v.optional(v.id("events")),
    organizerId: v.optional(v.id("users")),

    // Transaction details
    transactionId: v.optional(v.string()), // Provider's transaction ID
    paypalOrderId: v.optional(v.string()), // PayPal order ID if applicable
    stripePaymentIntentId: v.optional(v.string()), // Stripe payment intent if applicable

    // Dispute details
    reason: v.string(), // Dispute reason (e.g., "MERCHANDISE_OR_SERVICE_NOT_RECEIVED")
    amountCents: v.number(), // Disputed amount in cents
    currency: v.optional(v.string()), // Currency code (default USD)
    buyerEmail: v.optional(v.string()), // Buyer's email

    // Status tracking
    status: v.union(
      v.literal("OPEN"), // Dispute opened, awaiting response
      v.literal("UNDER_REVIEW"), // Evidence submitted, awaiting decision
      v.literal("WON"), // Resolved in seller's favor
      v.literal("LOST"), // Resolved in buyer's favor (chargeback)
      v.literal("CLOSED") // Closed/expired
    ),

    // Outcome from provider
    outcomeCode: v.optional(v.string()), // Provider's outcome code
    outcomeReason: v.optional(v.string()), // Human-readable outcome

    // Response tracking
    evidenceSubmitted: v.optional(v.boolean()),
    evidenceSubmittedAt: v.optional(v.number()),
    responseDeadline: v.optional(v.number()), // Deadline to respond

    // Internal notes
    internalNotes: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_disputeId", ["disputeId"])
    .index("by_orderId", ["orderId"])
    .index("by_organizerId", ["organizerId"])
    .index("by_status", ["status"])
    .index("by_provider", ["provider"]),
});
