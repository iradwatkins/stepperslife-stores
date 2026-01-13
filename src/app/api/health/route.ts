import { NextRequest, NextResponse } from "next/server";
import { getCircuitStatus, circuitBreakers } from "@/lib/circuit-breaker";

/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns system health status including:
 * - Overall status
 * - Circuit breaker states for external services
 * - Timestamp
 *
 * This endpoint is intentionally public for monitoring tools.
 */
export async function GET(request: NextRequest) {
  try {
    // Get circuit breaker status for all services
    const circuitStatus: Record<string, ReturnType<typeof getCircuitStatus>> = {};

    for (const [name] of Object.entries(circuitBreakers)) {
      circuitStatus[name] = getCircuitStatus(name);
    }

    // Determine overall health
    const hasOpenCircuit = Object.values(circuitStatus).some(
      (status) => status.state === "OPEN"
    );
    const hasHalfOpenCircuit = Object.values(circuitStatus).some(
      (status) => status.state === "HALF_OPEN"
    );

    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (hasOpenCircuit) {
      overallStatus = "unhealthy";
    } else if (hasHalfOpenCircuit) {
      overallStatus = "degraded";
    }

    // Build response
    const healthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      service: "stores-stepperslife",
      services: {
        stripe: {
          status: circuitStatus.stripe?.state === "CLOSED" ? "up" : "degraded",
          circuitBreaker: circuitStatus.stripe,
        },
        paypal: {
          status: circuitStatus.paypal?.state === "CLOSED" ? "up" : "degraded",
          circuitBreaker: circuitStatus.paypal,
        },
        postal: {
          status: circuitStatus.postal?.state === "CLOSED" ? "up" : "degraded",
          circuitBreaker: circuitStatus.postal,
        },
      },
      checks: {
        database: "convex",
        authentication: "jwt",
        paymentProviders: ["stripe", "paypal"],
      },
    };

    // Return appropriate status code based on health
    const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

    return NextResponse.json(healthResponse, { status: statusCode });
  } catch (error: any) {
    console.error("[Health Check] Error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
        service: "stores-stepperslife",
      },
      { status: 503 }
    );
  }
}
