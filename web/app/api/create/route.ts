import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createEndpoint } from "@/lib/store";

export async function POST(request: NextRequest) {
  const id = nanoid(8);

  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host") || "localhost:3000";
  const baseUrl = `${protocol}://${host}`;

  const endpoint = await createEndpoint(id, baseUrl);

  return NextResponse.json(endpoint, { status: 201 });
}
