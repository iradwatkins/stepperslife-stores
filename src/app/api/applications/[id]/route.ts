// Placeholder route for application details API
// TODO: Implement application details endpoint

import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return NextResponse.json(
    { error: "Not implemented", applicationId: id },
    { status: 501 }
  );
}
