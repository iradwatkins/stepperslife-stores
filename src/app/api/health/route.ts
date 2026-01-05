export async function GET() {
  return Response.json({
    status: "ok",
    timestamp: Date.now(),
    service: "events-stepperslife",
    version: process.env.npm_package_version || "1.0.0",
  });
}
