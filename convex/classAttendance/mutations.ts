import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Mark attendance for a single student
export const markAttendance = mutation({
  args: {
    classId: v.id("events"),
    userId: v.id("users"),
    sessionDate: v.number(),
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("late"),
      v.literal("excused")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user is instructor/organizer of this class
    const classEvent = await ctx.db.get(args.classId);
    if (!classEvent) {
      throw new Error("Class not found");
    }

    // Check if user is organizer of this class or admin
    const isOrganizer = classEvent.organizerId === user._id;
    const isAdmin = user.role === "admin";
    const isInstructor = user.role === "instructor";

    if (!isOrganizer && !isAdmin && !isInstructor) {
      throw new Error("Not authorized to mark attendance for this class");
    }

    // Check if attendance already exists for this student on this session
    const existingAttendance = await ctx.db
      .query("classAttendance")
      .withIndex("by_class_session", (q) =>
        q.eq("classId", args.classId).eq("sessionDate", args.sessionDate)
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    const now = Date.now();

    if (existingAttendance) {
      // Update existing record
      await ctx.db.patch(existingAttendance._id, {
        status: args.status,
        notes: args.notes,
        markedBy: user._id,
        markedAt: now,
      });

      return { updated: true, id: existingAttendance._id };
    } else {
      // Create new record
      const id = await ctx.db.insert("classAttendance", {
        classId: args.classId,
        userId: args.userId,
        sessionDate: args.sessionDate,
        status: args.status,
        markedBy: user._id,
        markedAt: now,
        notes: args.notes,
      });

      return { updated: false, id };
    }
  },
});

// Bulk mark attendance for multiple students
export const bulkMarkAttendance = mutation({
  args: {
    classId: v.id("events"),
    sessionDate: v.number(),
    records: v.array(
      v.object({
        userId: v.id("users"),
        status: v.union(
          v.literal("present"),
          v.literal("absent"),
          v.literal("late"),
          v.literal("excused")
        ),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user is instructor/organizer of this class
    const classEvent = await ctx.db.get(args.classId);
    if (!classEvent) {
      throw new Error("Class not found");
    }

    // Check if user is organizer of this class or admin
    const isOrganizer = classEvent.organizerId === user._id;
    const isAdmin = user.role === "admin";
    const isInstructor = user.role === "instructor";

    if (!isOrganizer && !isAdmin && !isInstructor) {
      throw new Error("Not authorized to mark attendance for this class");
    }

    const now = Date.now();
    let updatedCount = 0;
    let createdCount = 0;

    // Process each record
    for (const record of args.records) {
      // Check if attendance already exists
      const existingAttendance = await ctx.db
        .query("classAttendance")
        .withIndex("by_class_session", (q) =>
          q.eq("classId", args.classId).eq("sessionDate", args.sessionDate)
        )
        .filter((q) => q.eq(q.field("userId"), record.userId))
        .first();

      if (existingAttendance) {
        // Update existing record
        await ctx.db.patch(existingAttendance._id, {
          status: record.status,
          notes: record.notes,
          markedBy: user._id,
          markedAt: now,
        });
        updatedCount++;
      } else {
        // Create new record
        await ctx.db.insert("classAttendance", {
          classId: args.classId,
          userId: record.userId,
          sessionDate: args.sessionDate,
          status: record.status,
          markedBy: user._id,
          markedAt: now,
          notes: record.notes,
        });
        createdCount++;
      }
    }

    return {
      updatedCount,
      createdCount,
      totalProcessed: args.records.length,
    };
  },
});

// Delete attendance record
export const deleteAttendance = mutation({
  args: {
    attendanceId: v.id("classAttendance"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get attendance record
    const attendance = await ctx.db.get(args.attendanceId);
    if (!attendance) {
      throw new Error("Attendance record not found");
    }

    // Verify user is instructor/organizer of this class
    const classEvent = await ctx.db.get(attendance.classId);
    if (!classEvent) {
      throw new Error("Class not found");
    }

    // Check if user is organizer of this class or admin
    const isOrganizer = classEvent.organizerId === user._id;
    const isAdmin = user.role === "admin";

    if (!isOrganizer && !isAdmin) {
      throw new Error("Not authorized to delete attendance for this class");
    }

    await ctx.db.delete(args.attendanceId);

    return { success: true };
  },
});

// Mark all students as present for a session (quick action)
export const markAllPresent = mutation({
  args: {
    classId: v.id("events"),
    sessionDate: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user is instructor/organizer of this class
    const classEvent = await ctx.db.get(args.classId);
    if (!classEvent) {
      throw new Error("Class not found");
    }

    // Check if user is organizer of this class or admin
    const isOrganizer = classEvent.organizerId === user._id;
    const isAdmin = user.role === "admin";
    const isInstructor = user.role === "instructor";

    if (!isOrganizer && !isAdmin && !isInstructor) {
      throw new Error("Not authorized to mark attendance for this class");
    }

    // Get enrolled students (those with tickets for this class)
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.classId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "VALID"),
          q.eq(q.field("status"), "SCANNED")
        )
      )
      .collect();

    // Get unique student IDs
    const studentIds = [
      ...new Set(tickets.map((t) => t.attendeeId).filter(Boolean)),
    ];

    const now = Date.now();
    let updatedCount = 0;
    let createdCount = 0;

    // Mark each student as present
    for (const studentId of studentIds) {
      if (!studentId) continue;

      // Check if attendance already exists
      const existingAttendance = await ctx.db
        .query("classAttendance")
        .withIndex("by_class_session", (q) =>
          q.eq("classId", args.classId).eq("sessionDate", args.sessionDate)
        )
        .filter((q) => q.eq(q.field("userId"), studentId))
        .first();

      if (existingAttendance) {
        // Update existing record
        await ctx.db.patch(existingAttendance._id, {
          status: "present",
          markedBy: user._id,
          markedAt: now,
        });
        updatedCount++;
      } else {
        // Create new record
        await ctx.db.insert("classAttendance", {
          classId: args.classId,
          userId: studentId,
          sessionDate: args.sessionDate,
          status: "present",
          markedBy: user._id,
          markedAt: now,
        });
        createdCount++;
      }
    }

    return {
      updatedCount,
      createdCount,
      totalProcessed: studentIds.length,
    };
  },
});
