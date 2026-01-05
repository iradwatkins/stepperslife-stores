// Placeholder route for job applications API
// TODO: Implement job applications endpoint

import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return NextResponse.json(
    { error: "Not implemented", jobId: id, applications: [] },
    { status: 501 }
  );
}
