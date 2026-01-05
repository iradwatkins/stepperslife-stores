import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

// Get overall stats for all instructor's classes
export const getInstructorStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const days = args.days || 30;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get all classes owned by this user (eventType = 'CLASS')
    const classes = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .filter((q) => q.eq(q.field("eventType"), "CLASS"))
      .collect();

    const classIds = classes.map((c) => c._id);

    // Get all orders for these classes
    const allOrders = [];
    for (const classId of classIds) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", classId))
        .collect();
      allOrders.push(...orders);
    }

    // Filter to recent orders
    const recentOrders = allOrders.filter(
      (o) => o._creationTime >= cutoffTime
    );
    const completedOrders = recentOrders.filter((o) => o.status === "COMPLETED");

    // Calculate totals
    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + (o.totalCents || 0),
      0
    );

    // Calculate total enrollees (unique users from completed orders)
    const uniqueStudentIds = new Set(
      completedOrders.map((o) => o.buyerId).filter(Boolean)
    );

    // Count enrollments (each order = 1 enrollment for now)
    const totalEnrollments = completedOrders.length;

    // Calculate total capacity across all classes
    const totalCapacity = classes.reduce((sum, c) => {
      return sum + (c.capacity || 0);
    }, 0);

    // Calculate fill rate (enrollments / capacity)
    const fillRate =
      totalCapacity > 0 ? Math.round((totalEnrollments / totalCapacity) * 100) : 0;

    return {
      totalClasses: classes.length,
      publishedClasses: classes.filter((c) => c.status === "PUBLISHED").length,
      totalStudents: uniqueStudentIds.size,
      totalEnrollments,
      totalRevenue,
      averageClassSize:
        classes.length > 0 ? Math.round(totalEnrollments / classes.length) : 0,
      fillRate,
      totalCapacity,
    };
  },
});

// Get enrollment trends over time
export const getEnrollmentTrends = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const days = args.days || 14;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get all classes
    const classes = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .filter((q) => q.eq(q.field("eventType"), "CLASS"))
      .collect();

    const classIds = classes.map((c) => c._id);

    // Get orders
    const allOrders = [];
    for (const classId of classIds) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", classId))
        .filter((q) => q.eq(q.field("status"), "COMPLETED"))
        .collect();
      allOrders.push(...orders);
    }

    const recentOrders = allOrders.filter(
      (o) => o._creationTime >= cutoffTime
    );

    // Group by day
    const dailyData: Record<string, { enrollments: number; revenue: number }> = {};

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      dailyData[dateStr] = { enrollments: 0, revenue: 0 };
    }

    // Fill in data
    recentOrders.forEach((order) => {
      const dateStr = new Date(order._creationTime).toISOString().split("T")[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].enrollments++;
        dailyData[dateStr].revenue += order.totalCents || 0;
      }
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Get per-class breakdown
export const getClassBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    // Get all classes
    const classes = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .filter((q) => q.eq(q.field("eventType"), "CLASS"))
      .collect();

    // Get enrollment counts and revenue for each class
    const classStats = await Promise.all(
      classes.map(async (cls) => {
        const orders = await ctx.db
          .query("orders")
          .withIndex("by_event", (q) => q.eq("eventId", cls._id))
          .filter((q) => q.eq(q.field("status"), "COMPLETED"))
          .collect();

        const enrollments = orders.length;

        const revenue = orders.reduce((sum, o) => sum + (o.totalCents || 0), 0);
        const capacity = cls.capacity || 0;
        const fillRate = capacity > 0 ? Math.round((enrollments / capacity) * 100) : 0;

        return {
          classId: cls._id,
          name: cls.name,
          startDate: cls.startDate,
          enrollments,
          capacity,
          fillRate,
          revenue,
          status: cls.status,
        };
      })
    );

    // Sort by enrollments (most popular first)
    return classStats.sort((a, b) => b.enrollments - a.enrollments);
  },
});

// Get student roster across all classes
export const getStudentRoster = query({
  args: {
    classId: v.optional(v.id("events")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const limit = args.limit || 50;

    // Get classes to query
    let classIds: typeof args.classId[] = [];

    if (args.classId) {
      // Verify user owns this class
      const cls = await ctx.db.get(args.classId);
      if (!cls || cls.organizerId !== user._id || cls.eventType !== "CLASS") {
        throw new Error("Not authorized");
      }
      classIds = [args.classId];
    } else {
      // Get all user's classes
      const classes = await ctx.db
        .query("events")
        .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
        .filter((q) => q.eq(q.field("eventType"), "CLASS"))
        .collect();
      classIds = classes.map((c) => c._id);
    }

    // Get orders and extract student info
    const studentMap: Record<
      string,
      {
        oderId: string;
        email: string;
        name: string;
        enrolledClasses: number;
        totalSpent: number;
        lastEnrollment: number;
      }
    > = {};

    for (const classId of classIds) {
      if (!classId) continue;

      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", classId))
        .filter((q) => q.eq(q.field("status"), "COMPLETED"))
        .collect();

      for (const order of orders) {
        const key = order.buyerId || order.buyerEmail || "";
        if (!key) continue;

        if (!studentMap[key]) {
          studentMap[key] = {
            oderId: order.buyerId as string || "",
            email: order.buyerEmail || "",
            name: order.buyerName || order.buyerEmail || "Unknown",
            enrolledClasses: 0,
            totalSpent: 0,
            lastEnrollment: 0,
          };
        }

        studentMap[key].enrolledClasses++;
        studentMap[key].totalSpent += order.totalCents || 0;
        if (order._creationTime > studentMap[key].lastEnrollment) {
          studentMap[key].lastEnrollment = order._creationTime;
        }
      }
    }

    // Convert to array and sort by most recent
    const students = Object.values(studentMap)
      .sort((a, b) => b.lastEnrollment - a.lastEnrollment)
      .slice(0, limit);

    return students;
  },
});

// Get revenue breakdown by month
export const getRevenueByMonth = query({
  args: {
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const months = args.months || 6;
    const cutoffTime = Date.now() - months * 30 * 24 * 60 * 60 * 1000;

    // Get all classes
    const classes = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .filter((q) => q.eq(q.field("eventType"), "CLASS"))
      .collect();

    const classIds = classes.map((c) => c._id);

    // Get orders
    const allOrders = [];
    for (const classId of classIds) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_event", (q) => q.eq("eventId", classId))
        .filter((q) => q.eq(q.field("status"), "COMPLETED"))
        .collect();
      allOrders.push(...orders);
    }

    const recentOrders = allOrders.filter(
      (o) => o._creationTime >= cutoffTime
    );

    // Group by month
    const monthlyData: Record<string, { revenue: number; enrollments: number }> = {};

    recentOrders.forEach((order) => {
      const date = new Date(order._creationTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, enrollments: 0 };
      }

      monthlyData[monthKey].revenue += order.totalCents || 0;
      monthlyData[monthKey].enrollments++;
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  },
});
