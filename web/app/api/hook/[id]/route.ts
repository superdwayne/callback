import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { logRequest } from "@/lib/store";
import type { CapturedRequest } from "@/lib/types";

async function handleRequest(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: endpointId } = params;
  const requestId = nanoid(10);

  // Parse headers into a plain object
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Parse query parameters
  const query: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  // Safely parse body
  let body: string | null = null;
  let size = 0;
  try {
    body = await request.text();
    size = new TextEncoder().encode(body).byteLength;
    if (body === "") body = null;
  } catch {
    body = null;
  }

  // Get client IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  const captured: CapturedRequest = {
    id: requestId,
    endpointId,
    timestamp: Date.now(),
    method: request.method,
    path: request.nextUrl.pathname,
    headers,
    query,
    body,
    ip,
    size,
  };

  await logRequest(captured);

  return NextResponse.json({ received: true, id: requestId }, { status: 200 });
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return handleRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return handleRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return handleRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return handleRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return handleRequest(request, context);
}

export async function HEAD(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return handleRequest(request, context);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return handleRequest(request, context);
}
