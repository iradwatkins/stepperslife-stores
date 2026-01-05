import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, type } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    if (type === "heartbeat") {
      // Send heartbeat to keep session alive
      await convex.mutation(api.radioStreaming.heartbeatSession, {
        sessionId,
      });
      return NextResponse.json({ success: true, action: "heartbeat" });
    } else {
      // End the session
      await convex.mutation(api.radioStreaming.endListenSession, {
        sessionId,
      });
      return NextResponse.json({ success: true, action: "ended" });
    }
  } catch (error) {
    console.error("End session error:", error);
    // Don't return error to client for beacon requests - they don't wait for response
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
