import { NextRequest } from "next/server";
import { getEndpoint, getRequests } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Verify endpoint exists
      const endpoint = await getEndpoint(id);
      if (!endpoint) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "Endpoint not found" })}\n\n`)
        );
        controller.close();
        return;
      }

      let lastKnownCount = endpoint.requestCount;
      let heartbeatCounter = 0;
      let closed = false;

      const poll = async () => {
        if (closed) return;

        try {
          heartbeatCounter++;

          // Check for new requests every 2 seconds
          const currentEndpoint = await getEndpoint(id);
          if (!currentEndpoint) {
            controller.close();
            closed = true;
            return;
          }

          const currentCount = currentEndpoint.requestCount;

          if (currentCount > lastKnownCount) {
            // Fetch all requests and send only the new ones
            const allRequests = await getRequests(id);
            const newCount = currentCount - lastKnownCount;
            // Requests are newest-first, so take the first `newCount` items
            const newRequests = allRequests.slice(0, newCount);

            // Send newest last so they arrive in chronological order
            for (let i = newRequests.length - 1; i >= 0; i--) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(newRequests[i])}\n\n`)
              );
            }

            lastKnownCount = currentCount;
          }

          // Send heartbeat every ~15 seconds (15s / 2s poll interval = every 7-8 polls)
          if (heartbeatCounter % 7 === 0) {
            controller.enqueue(encoder.encode(`:ping\n\n`));
          }

          // Schedule next poll
          setTimeout(poll, 2000);
        } catch {
          // Connection likely closed
          closed = true;
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      };

      // Start polling
      poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
