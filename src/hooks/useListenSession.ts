"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface UseListenSessionOptions {
  stationId: Id<"radioStations"> | null;
  isPlaying: boolean;
  userId?: Id<"users">;
}

interface SessionData {
  sessionId: string;
  sessionDocId: Id<"radioListenSessions">;
}

// Generate a fingerprint for anonymous listener identification
function generateFingerprint(): string {
  // Check localStorage for existing fingerprint
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("sl_listener_fp");
    if (stored) return stored;

    // Generate new fingerprint from browser characteristics
    const components = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset().toString(),
      screen.colorDepth.toString(),
      screen.width.toString() + "x" + screen.height.toString(),
      navigator.hardwareConcurrency?.toString() || "1",
      // Add random component for uniqueness
      Math.random().toString(36).substring(2, 15),
    ];

    // Simple hash function
    const hash = components.join("|");
    let fingerprint = 0;
    for (let i = 0; i < hash.length; i++) {
      const char = hash.charCodeAt(i);
      fingerprint = ((fingerprint << 5) - fingerprint) + char;
      fingerprint = fingerprint & fingerprint;
    }
    const fp = Math.abs(fingerprint).toString(36) + Date.now().toString(36);

    localStorage.setItem("sl_listener_fp", fp);
    return fp;
  }
  return "ssr-" + Math.random().toString(36).substring(2);
}

// Detect device type from user agent
function getDeviceType(): "DESKTOP" | "MOBILE" | "TABLET" | "OTHER" {
  if (typeof navigator === "undefined") return "OTHER";

  const ua = navigator.userAgent.toLowerCase();

  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return "TABLET";
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return "MOBILE";
  }
  if (/win|mac|linux/i.test(ua)) {
    return "DESKTOP";
  }
  return "OTHER";
}

// Get user's region from timezone
function getRegionFromTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Extract region from timezone (e.g., "America/New_York" -> "America")
    return tz.split("/")[0] || "Unknown";
  } catch {
    return "Unknown";
  }
}

export function useListenSession({
  stationId,
  isPlaying,
  userId,
}: UseListenSessionOptions) {
  const sessionRef = useRef<SessionData | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fingerprintRef = useRef<string>("");

  const startSession = useMutation(api.radioStreaming.startListenSession);
  const heartbeatSession = useMutation(api.radioStreaming.heartbeatSession);
  const endSession = useMutation(api.radioStreaming.endListenSession);

  // Generate fingerprint on mount
  useEffect(() => {
    fingerprintRef.current = generateFingerprint();
  }, []);

  // Start a new session
  const start = useCallback(async () => {
    if (!stationId || sessionRef.current) return;

    try {
      const result = await startSession({
        stationId,
        listenerFingerprint: fingerprintRef.current,
        userId,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        deviceType: getDeviceType(),
        region: getRegionFromTimezone(),
        playerType: "WEB",
      });

      sessionRef.current = result;

      // Start heartbeat (every 30 seconds)
      heartbeatIntervalRef.current = setInterval(async () => {
        if (sessionRef.current) {
          try {
            await heartbeatSession({
              sessionId: sessionRef.current.sessionId,
            });
          } catch (error) {
            console.error("Heartbeat failed:", error);
            // If heartbeat fails, clear session and let it restart
            sessionRef.current = null;
          }
        }
      }, 30000);
    } catch (error) {
      console.error("Failed to start listen session:", error);
    }
  }, [stationId, userId, startSession, heartbeatSession]);

  // End the current session
  const stop = useCallback(async () => {
    // Clear heartbeat interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // End session in database
    if (sessionRef.current) {
      try {
        await endSession({
          sessionId: sessionRef.current.sessionId,
        });
      } catch (error) {
        console.error("Failed to end listen session:", error);
      }
      sessionRef.current = null;
    }
  }, [endSession]);

  // Handle play state changes
  useEffect(() => {
    if (isPlaying && stationId) {
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [isPlaying, stationId, start, stop]);

  // Handle page unload - end session gracefully
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery on page close
      if (sessionRef.current) {
        const data = JSON.stringify({
          sessionId: sessionRef.current.sessionId,
        });
        // Use beacon API if available for reliable delivery
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/radio/end-session", data);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && sessionRef.current) {
        // Page is being hidden, send heartbeat via beacon
        if (navigator.sendBeacon) {
          const data = JSON.stringify({
            sessionId: sessionRef.current.sessionId,
            type: "heartbeat",
          });
          navigator.sendBeacon("/api/radio/end-session", data);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return {
    sessionId: sessionRef.current?.sessionId || null,
    isTracking: !!sessionRef.current,
  };
}
