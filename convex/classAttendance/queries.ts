import { v } from "convex/values";
import { query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Get all attendance records for a class
export const getClassAttendance = query({
  args: {
    classId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      return [];
    }

    // Verify user is instructor/organizer of this class
    const classEvent = await ctx.db.get(args.classId);
    if (!classEvent) {
      return [];
    }

    // Check if user is organizer of this class or admin
    const isOrganizer = classEvent.organizerId === user._id;
    const isAdmin = user.role === "admin";
    const isInstructor = user.role === "instructor";

    if (!isOrganizer && !isAdmin && !isInstructor) {
      return [];
    }

    // Get all attendance records for this class
    const attendance = await ctx.db
      .query("classAttendance")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    // Enrich with user info
    const enrichedAttendance = await Promise.all(
      attendance.map(async (record) => {
        const student = await ctx.db.get(record.userId);
        const markedByUser = await ctx.db.get(record.markedBy);

        return {
          ...record,
          studentName: student?.name || "Unknown Student",
          studentEmail: student?.email || "",
          markedByName: markedByUser?.name || "Unknown",
        };
      })
    );

    // Sort by session date (newest first), then by student name
    enrichedAttendance.sort((a, b) => {
      if (b.sessionDate !== a.sessionDate) {
        return b.sessionDate - a.sessionDate;
      }
      return (a.studentName || "").localeCompare(b.studentName || "");
    });

    return enrichedAttendance;
  },
});

// Get attendance for a specific session date
export const getSessionAttendance = query({
  args: {
    classId: v.id("events"),
    sessionDate: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { students: [], attendance: [] };
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      return { students: [], attendance: [] };
    }

    // Verify user is instructor/organizer of this class
    const classEvent = await ctx.db.get(args.classId);
    if (!classEvent) {
      return { students: [], attendance: [] };
    }

    // Check if user is organizer of this class or admin
    const isOrganizer = classEvent.organizerId === user._id;
    const isAdmin = user.role === "admin";
    const isInstructor = user.role === "instructor";

    if (!isOrganizer && !isAdmin && !isInstructor) {
      return { students: [], attendance: [] };
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
    const studentIds = [...new Set(tickets.map((t) => t.attendeeId).filter(Boolean))];

    // Get student info
    const students = await Promise.all(
      studentIds.map(async (studentId) => {
        if (!studentId) return null;
        const student = await ctx.db.get(studentId);
        if (!student) return null;
        return {
          _id: student._id,
          name: student.name || "Unknown Student",
          email: student.email,
        };
      })
    );

    const validStudents = students.filter(Boolean) as {
      _id: string;
      name: string;
      email: string;
    }[];

    // Get attendance records for this session
    const attendance = await ctx.db
      .query("classAttendance")
      .withIndex("by_class_session", (q) =>
        q.eq("classId", args.classId).eq("sessionDate", args.sessionDate)
      )
      .collect();

    return {
      students: validStudents.sort((a, b) => a.name.localeCompare(b.name)),
      attendance: attendance.map((a) => ({
        userId: a.userId,
        status: a.status,
        notes: a.notes,
      })),
    };
  },
});

// Get attendance statistics for a class
export const getAttendanceStats = query({
  args: {
    classId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      return null;
    }

    // Verify user is instructor/organizer of this class
    const classEvent = await ctx.db.get(args.classId);
    if (!classEvent) {
      return null;
    }

    // Check if user is organizer of this class or admin
    const isOrganizer = classEvent.organizerId === user._id;
    const isAdmin = user.role === "admin";
    const isInstructor = user.role === "instructor";

    if (!isOrganizer && !isAdmin && !isInstructor) {
      return null;
    }

    // Get all attendance records for this class
    const attendance = await ctx.db
      .query("classAttendance")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    if (attendance.length === 0) {
      return {
        totalSessions: 0,
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        attendanceRate: 0,
        sessionDates: [],
        perStudentStats: [],
      };
    }

    // Count by status
    const statusCounts = {
      present: attendance.filter((a) => a.status === "present").length,
      absent: attendance.filter((a) => a.status === "absent").length,
      late: attendance.filter((a) => a.status === "late").length,
      excused: attendance.filter((a) => a.status === "excused").length,
    };

    // Get unique session dates
    const sessionDates = [...new Set(attendance.map((a) => a.sessionDate))].sort(
      (a, b) => b - a
    );

    // Calculate attendance rate (present + late = attended)
    const attended = statusCounts.present + statusCounts.late;
    const total = attendance.length;
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

    // Per-student statistics
    const studentAttendance: Record<
      string,
      { present: number; absent: number; late: number; excused: number; total: number }
    > = {};

    for (const record of attendance) {
      const studentId = record.userId;
      if (!studentAttendance[studentId]) {
        studentAttendance[studentId] = {
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
        };
      }
      studentAttendance[studentId][record.status]++;
      studentAttendance[studentId].total++;
    }

    // Get student info and calculate rates
    const perStudentStats = await Promise.all(
      Object.entries(studentAttendance).map(async ([studentId, stats]) => {
        const student = await ctx.db.get(studentId as Id<"users">);
        const attendedCount = stats.present + stats.late;
        const rate = stats.total > 0 ? Math.round((attendedCount / stats.total) * 100) : 0;

        return {
          studentId,
          studentName: student?.name || "Unknown Student",
          studentEmail: student?.email || "",
          ...stats,
          attendanceRate: rate,
        };
      })
    );

    // Sort by attendance rate (lowest first for easy identification of at-risk students)
    perStudentStats.sort((a, b) => a.attendanceRate - b.attendanceRate);

    return {
      totalSessions: sessionDates.length,
      totalRecords: attendance.length,
      presentCount: statusCounts.present,
      absentCount: statusCounts.absent,
      lateCount: statusCounts.late,
      excusedCount: statusCounts.excused,
      attendanceRate,
      sessionDates,
      perStudentStats,
    };
  },
});

// Get attendance for a specific student (student self-view)
export const getMyAttendance = query({
  args: {
    classId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      return null;
    }

    // Get class info
    const classEvent = await ctx.db.get(args.classId);
    if (!classEvent) {
      return null;
    }

    // Get attendance records for this student in this class
    const attendance = await ctx.db
      .query("classAttendance")
      .withIndex("by_class_user", (q) =>
        q.eq("classId", args.classId).eq("userId", user._id)
      )
      .collect();

    // Sort by session date (newest first)
    attendance.sort((a, b) => b.sessionDate - a.sessionDate);

    // Calculate stats
    const total = attendance.length;
    const present = attendance.filter((a) => a.status === "present").length;
    const late = attendance.filter((a) => a.status === "late").length;
    const absent = attendance.filter((a) => a.status === "absent").length;
    const excused = attendance.filter((a) => a.status === "excused").length;
    const attended = present + late;
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

    return {
      className: classEvent.name,
      records: attendance.map((a) => ({
        sessionDate: a.sessionDate,
        status: a.status,
        notes: a.notes,
      })),
      stats: {
        total,
        present,
        late,
        absent,
        excused,
        attendanceRate,
      },
    };
  },
});

// Get list of unique session dates for a class
export const getSessionDates = query({
  args: {
    classId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) {
      return [];
    }

    // Get all attendance records for this class
    const attendance = await ctx.db
      .query("classAttendance")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    // Get unique session dates
    const sessionDates = [...new Set(attendance.map((a) => a.sessionDate))].sort(
      (a, b) => b - a
    );

    return sessionDates;
  },
});
