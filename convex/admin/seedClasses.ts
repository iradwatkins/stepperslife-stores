import { internalMutation } from "../_generated/server";

// Helper to create dates for recurring classes
function getNextWeekdayDate(dayOfWeek: number, hour: number, minute: number = 0): number {
  const now = new Date();
  const currentDay = now.getDay();
  let daysUntilTarget = dayOfWeek - currentDay;
  if (daysUntilTarget <= 0) daysUntilTarget += 7; // Get next occurrence

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntilTarget);
  targetDate.setHours(hour, minute, 0, 0);
  return targetDate.getTime();
}

// Seed instructor and classes
export const seedClasses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get the instructor user
    const instructorUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "instructor@thestepperslife.com"))
      .unique();

    if (!instructorUser) {
      throw new Error("Instructor user not found. Run seedUsers first.");
    }

    // Check if instructor profile already exists
    let instructor = await ctx.db
      .query("instructors")
      .withIndex("by_userId", (q) => q.eq("userId", instructorUser._id))
      .unique();

    if (!instructor) {
      // Create instructor profile
      const instructorId = await ctx.db.insert("instructors", {
        userId: instructorUser._id,
        slug: "dance-instructor",
        name: "Dance Instructor",
        title: "Master Instructor",
        bio: "Professional stepping instructor with over 15 years of experience teaching Chicago Stepping and Detroit Ballroom. Known for patient instruction and breaking down complex moves into easy-to-learn steps. Has taught at weekenders across the Midwest and trained hundreds of successful steppers.",
        specialties: ["Chicago Stepping", "Detroit Ballroom", "Partner Technique"],
        experienceYears: 15,
        location: "Chicago, IL",
        socialLinks: {
          instagram: "@thestepperslife",
          facebook: "thestepperslife",
        },
        verified: true,
        featured: true,
        isActive: true,
        classCount: 0,
        studentCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      instructor = await ctx.db.get(instructorId);
    }

    if (!instructor) {
      throw new Error("Failed to create instructor");
    }

    const classes = [
      // 1. Beginner Steppin' 101 - Tuesday 7:00 PM
      {
        name: "Beginner Steppin' 101",
        description: "Start your stepping journey here! This beginner-friendly class covers the fundamentals: basic step patterns, timing, connection, and floor etiquette. Perfect for those new to stepping or wanting to solidify their foundation. No partner required - we rotate!",
        organizerId: instructorUser._id,
        organizerName: "Dance Instructor",
        eventType: "CLASS" as const,
        classLevel: "Beginner",
        danceStyle: "Chicago Stepping",
        duration: 60,
        instructorId: instructor._id,
        instructorSlug: "dance-instructor",
        classDays: [2], // Tuesday
        eventDateLiteral: "Every Tuesday",
        eventTimeLiteral: "7:00 PM - 8:00 PM",
        eventTimezone: "America/Chicago",
        startDate: getNextWeekdayDate(2, 19), // Next Tuesday 7PM
        endDate: getNextWeekdayDate(2, 20), // Next Tuesday 8PM
        location: {
          venueName: "Steppers Studio",
          address: "2847 S Michigan Ave",
          city: "Chicago",
          state: "IL",
          zipCode: "60616",
          country: "USA",
        },
        categories: ["Beginner", "Weekly Class", "Chicago Stepping"],
        beginnerFriendly: true,
        status: "PUBLISHED" as const,
        ticketsVisible: true,
        paymentModelSelected: true,
        capacity: 30,
        ticketsSold: 0,
        allowWaitlist: true,
        maxTicketsPerOrder: 4,
        minTicketsPerOrder: 1,
        imageUrl: "https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=800",
        createdAt: now,
        updatedAt: now,
        ticketPrice: 1500, // $15
      },

      // 2. Intermediate Patterns - Wednesday 8:00 PM
      {
        name: "Intermediate Patterns",
        description: "Ready to expand your vocabulary? This intermediate class introduces more complex turn patterns, transitions, and musicality concepts. You should be comfortable with basic step patterns and turns. We'll work on styling and making moves your own.",
        organizerId: instructorUser._id,
        organizerName: "Dance Instructor",
        eventType: "CLASS" as const,
        classLevel: "Intermediate",
        danceStyle: "Chicago Stepping",
        duration: 75,
        instructorId: instructor._id,
        instructorSlug: "dance-instructor",
        classDays: [3], // Wednesday
        eventDateLiteral: "Every Wednesday",
        eventTimeLiteral: "8:00 PM - 9:15 PM",
        eventTimezone: "America/Chicago",
        startDate: getNextWeekdayDate(3, 20), // Next Wednesday 8PM
        endDate: getNextWeekdayDate(3, 21, 15), // 9:15 PM
        location: {
          venueName: "Steppers Studio",
          address: "2847 S Michigan Ave",
          city: "Chicago",
          state: "IL",
          zipCode: "60616",
          country: "USA",
        },
        categories: ["Intermediate", "Weekly Class", "Chicago Stepping"],
        beginnerFriendly: false,
        status: "PUBLISHED" as const,
        ticketsVisible: true,
        paymentModelSelected: true,
        capacity: 24,
        ticketsSold: 0,
        allowWaitlist: true,
        maxTicketsPerOrder: 4,
        minTicketsPerOrder: 1,
        imageUrl: "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800",
        createdAt: now,
        updatedAt: now,
        ticketPrice: 2000, // $20
      },

      // 3. Advanced Styling - Thursday 8:00 PM
      {
        name: "Advanced Styling",
        description: "For experienced steppers who want to take their dancing to the next level. Focus on advanced footwork, body movement, arm styling, and creating visual effects. We'll analyze footage from competitions and work on performance quality. Prerequisites: Must be comfortable leading/following standard patterns.",
        organizerId: instructorUser._id,
        organizerName: "Dance Instructor",
        eventType: "CLASS" as const,
        classLevel: "Advanced",
        danceStyle: "Chicago Stepping",
        duration: 90,
        instructorId: instructor._id,
        instructorSlug: "dance-instructor",
        classDays: [4], // Thursday
        eventDateLiteral: "Every Thursday",
        eventTimeLiteral: "8:00 PM - 9:30 PM",
        eventTimezone: "America/Chicago",
        startDate: getNextWeekdayDate(4, 20), // Next Thursday 8PM
        endDate: getNextWeekdayDate(4, 21, 30), // 9:30 PM
        location: {
          venueName: "Steppers Studio",
          address: "2847 S Michigan Ave",
          city: "Chicago",
          state: "IL",
          zipCode: "60616",
          country: "USA",
        },
        categories: ["Advanced", "Weekly Class", "Styling", "Competition Prep"],
        beginnerFriendly: false,
        status: "PUBLISHED" as const,
        ticketsVisible: true,
        paymentModelSelected: true,
        capacity: 20,
        ticketsSold: 0,
        allowWaitlist: true,
        maxTicketsPerOrder: 4,
        minTicketsPerOrder: 1,
        imageUrl: "https://images.unsplash.com/photo-1547153760-18fc86324498?w=800",
        createdAt: now,
        updatedAt: now,
        ticketPrice: 2500, // $25
      },

      // 4. Partner Connection - Saturday 2:00 PM
      {
        name: "Partner Connection Workshop",
        description: "The secret to great stepping is connection! This workshop focuses on lead/follow technique, frame, tension, and non-verbal communication with your partner. Great for couples or individuals who want to improve their partnering skills. All intermediate+ levels welcome.",
        organizerId: instructorUser._id,
        organizerName: "Dance Instructor",
        eventType: "CLASS" as const,
        classLevel: "Intermediate",
        danceStyle: "Chicago Stepping",
        duration: 90,
        instructorId: instructor._id,
        instructorSlug: "dance-instructor",
        classDays: [6], // Saturday
        eventDateLiteral: "Every Saturday",
        eventTimeLiteral: "2:00 PM - 3:30 PM",
        eventTimezone: "America/Chicago",
        startDate: getNextWeekdayDate(6, 14), // Next Saturday 2PM
        endDate: getNextWeekdayDate(6, 15, 30), // 3:30 PM
        location: {
          venueName: "Steppers Studio",
          address: "2847 S Michigan Ave",
          city: "Chicago",
          state: "IL",
          zipCode: "60616",
          country: "USA",
        },
        categories: ["Intermediate", "Weekly Workshop", "Partner Work", "Technique"],
        beginnerFriendly: false,
        status: "PUBLISHED" as const,
        ticketsVisible: true,
        paymentModelSelected: true,
        capacity: 32, // Even number for partners
        ticketsSold: 0,
        allowWaitlist: true,
        maxTicketsPerOrder: 4,
        minTicketsPerOrder: 1,
        imageUrl: "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800",
        createdAt: now,
        updatedAt: now,
        ticketPrice: 2000, // $20
      },
    ];

    const results: { name: string; created: boolean; classId?: string }[] = [];

    for (const classData of classes) {
      const { ticketPrice, ...classEvent } = classData;

      // Check if class already exists
      const existing = await ctx.db
        .query("events")
        .filter((q) => q.eq(q.field("name"), classEvent.name))
        .first();

      if (existing) {
        results.push({ name: classEvent.name, created: false, classId: existing._id });
        continue;
      }

      // Create the class (stored as event with type CLASS)
      const classId = await ctx.db.insert("events", classEvent);

      // Create a single ticket tier for drop-in
      await ctx.db.insert("ticketTiers", {
        eventId: classId,
        name: "Drop-in",
        description: "Single class admission",
        price: ticketPrice,
        quantity: classEvent.capacity,
        sold: 0,
        saleStart: now,
        saleEnd: classEvent.startDate,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Update event with ticket tier count
      await ctx.db.patch(classId, {
        ticketTierCount: 1,
      });

      results.push({ name: classEvent.name, created: true, classId });
    }

    // Update instructor's class count
    const classCount = results.filter((r) => r.created).length;
    if (classCount > 0 && instructor) {
      await ctx.db.patch(instructor._id, {
        classCount: (instructor.classCount || 0) + classCount,
        updatedAt: now,
      });
    }

    const created = results.filter((r) => r.created).length;
    return {
      created,
      total: classes.length,
      instructorCreated: instructor ? true : false,
      classes: results,
    };
  },
});
