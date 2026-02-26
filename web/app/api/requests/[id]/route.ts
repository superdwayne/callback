import { NextRequest, NextResponse } from "next/server";
import { getEndpoint, getRequests } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const endpoint = await getEndpoint(id);
  if (!endpoint) {
    return NextResponse.json(
      { error: "Endpoint not found" },
      { status: 404 }
    );
  }

  const requests = await getRequests(id);

  return NextResponse.json({ endpoint, requests });
}
