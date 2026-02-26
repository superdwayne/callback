"use client";

import { useEffect, useRef } from "react";

// Extend Window to include WebMCP
declare global {
  interface Window {
    WebMCP: new (options?: {
      color?: string;
      position?: string;
      size?: string;
      padding?: string;
    }) => WebMCPInstance;
  }
}

interface WebMCPInstance {
  registerTool(
    name: string,
    description: string,
    schema: Record<string, unknown>,
    handler: (args: Record<string, unknown>) => {
      content: Array<{ type: string; text: string }>;
    } | Promise<{ content: Array<{ type: string; text: string }> }>
  ): void;
  registerResource(
    name: string,
    description: string,
    config: { uri?: string; uriTemplate?: string; mimeType: string },
    handler: (uri: string) => {
      contents: Array<{ uri: string; mimeType: string; text: string }>;
    } | Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>
  ): void;
}

function getBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export default function WebMCPProvider() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    function initWebMCP() {
      if (!window.WebMCP) return;
      initialized.current = true;

      const mcp = new window.WebMCP({
        color: "#10b981", // emerald-500 to match the app theme
        position: "bottom-right",
        size: "36px",
        padding: "12px",
      });

      // ─── Tool: Create a new callback endpoint ───
      mcp.registerTool(
        "create_callback_url",
        "Create a new callback/webhook URL that captures incoming HTTP requests. Returns the URL and session ID.",
        {},
        async () => {
          const base = getBaseUrl();
          const res = await fetch(`${base}/api/create`, { method: "POST" });
          if (!res.ok) {
            return {
              content: [
                { type: "text", text: "Error: Failed to create callback URL." },
              ],
            };
          }
          const data = await res.json();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    id: data.id,
                    callback_url: data.url,
                    dashboard_url: `${base}/d/${data.id}`,
                    created_at: new Date(data.createdAt).toISOString(),
                    expires_at: new Date(data.expiresAt).toISOString(),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      );

      // ─── Tool: List active sessions ───
      mcp.registerTool(
        "list_callback_sessions",
        "List all active callback sessions saved in the browser. Returns session IDs, URLs, and expiry times.",
        {},
        () => {
          const raw = localStorage.getItem("callback_sessions");
          if (!raw) {
            return {
              content: [
                { type: "text", text: "No active sessions found." },
              ],
            };
          }
          try {
            const sessions = JSON.parse(raw);
            const now = Date.now();
            const active = sessions.filter(
              (s: { expiresAt: number }) => s.expiresAt > now
            );
            if (active.length === 0) {
              return {
                content: [
                  { type: "text", text: "No active sessions found." },
                ],
              };
            }
            const base = getBaseUrl();
            const formatted = active.map(
              (s: {
                id: string;
                url: string;
                createdAt: number;
                expiresAt: number;
              }) => ({
                id: s.id,
                callback_url: s.url,
                dashboard_url: `${base}/d/${s.id}`,
                created_at: new Date(s.createdAt).toISOString(),
                expires_at: new Date(s.expiresAt).toISOString(),
                time_remaining_minutes: Math.round(
                  (s.expiresAt - now) / (1000 * 60)
                ),
              })
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(formatted, null, 2),
                },
              ],
            };
          } catch {
            return {
              content: [
                { type: "text", text: "Error: Could not parse sessions." },
              ],
            };
          }
        }
      );

      // ─── Tool: Get captured requests for an endpoint ───
      mcp.registerTool(
        "get_captured_requests",
        "Get all captured webhook requests for a given callback endpoint ID. Returns method, path, headers, body, and timing for each request.",
        {
          endpoint_id: {
            type: "string",
            description:
              "The callback endpoint ID (e.g., 'abc12345'). You can get this from list_callback_sessions or create_callback_url.",
          },
        },
        async (args) => {
          const endpointId = args.endpoint_id as string;
          if (!endpointId) {
            return {
              content: [
                { type: "text", text: "Error: endpoint_id is required." },
              ],
            };
          }
          const base = getBaseUrl();
          const res = await fetch(`${base}/api/requests/${endpointId}`);
          if (!res.ok) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: Endpoint not found or has expired.",
                },
              ],
            };
          }
          const data = await res.json();
          if (!data.requests || data.requests.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `No requests captured yet for endpoint ${endpointId}. The callback URL is: ${data.endpoint?.url || "unknown"}`,
                },
              ],
            };
          }
          const summary = data.requests.map(
            (r: {
              id: string;
              method: string;
              path: string;
              timestamp: number;
              headers: Record<string, string>;
              query: Record<string, string>;
              body: string | null;
              ip: string | null;
              size: number;
            }) => ({
              id: r.id,
              method: r.method,
              path: r.path,
              timestamp: new Date(r.timestamp).toISOString(),
              headers: r.headers,
              query: r.query,
              body: r.body,
              ip: r.ip,
              size_bytes: r.size,
            })
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    endpoint: {
                      id: data.endpoint.id,
                      url: data.endpoint.url,
                      request_count: data.endpoint.requestCount,
                    },
                    requests: summary,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      );

      // ─── Tool: Send a test request to a callback URL ───
      mcp.registerTool(
        "send_test_request",
        "Send a test HTTP request to a callback URL. Useful for verifying the endpoint is working.",
        {
          endpoint_id: {
            type: "string",
            description: "The callback endpoint ID to send the test request to.",
          },
          method: {
            type: "string",
            description:
              "HTTP method to use (GET, POST, PUT, PATCH, DELETE). Defaults to POST.",
          },
          body: {
            type: "string",
            description:
              'Optional JSON body to send with the request. Example: \'{"event":"test","data":"hello"}\'',
          },
          headers: {
            type: "string",
            description:
              'Optional JSON string of headers to include. Example: \'{"X-Custom-Header":"value"}\'',
          },
        },
        async (args) => {
          const endpointId = args.endpoint_id as string;
          if (!endpointId) {
            return {
              content: [
                { type: "text", text: "Error: endpoint_id is required." },
              ],
            };
          }
          const method = ((args.method as string) || "POST").toUpperCase();
          const base = getBaseUrl();
          const url = `${base}/api/hook/${endpointId}`;

          const fetchOptions: RequestInit = {
            method,
            headers: { "Content-Type": "application/json" },
          };

          // Parse custom headers
          if (args.headers) {
            try {
              const customHeaders = JSON.parse(args.headers as string);
              fetchOptions.headers = {
                ...fetchOptions.headers,
                ...customHeaders,
              };
            } catch {
              // ignore invalid header JSON
            }
          }

          // Add body for methods that support it
          if (
            args.body &&
            ["POST", "PUT", "PATCH"].includes(method)
          ) {
            fetchOptions.body = args.body as string;
          }

          try {
            const res = await fetch(url, fetchOptions);
            const data = await res.json();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      status: res.status,
                      response: data,
                      sent_to: url,
                      method,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } catch (err) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error sending test request: ${err instanceof Error ? err.message : "Unknown error"}`,
                },
              ],
            };
          }
        }
      );

      // ─── Tool: Get the callback URL for an endpoint ───
      mcp.registerTool(
        "get_callback_url",
        "Get the full callback URL for a given endpoint ID so it can be used in webhook configurations.",
        {
          endpoint_id: {
            type: "string",
            description: "The callback endpoint ID.",
          },
        },
        (args) => {
          const endpointId = args.endpoint_id as string;
          if (!endpointId) {
            return {
              content: [
                { type: "text", text: "Error: endpoint_id is required." },
              ],
            };
          }
          const base = getBaseUrl();
          const url = `${base}/api/hook/${endpointId}`;
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    callback_url: url,
                    dashboard_url: `${base}/d/${endpointId}`,
                    curl_example: `curl -X POST ${url} -H "Content-Type: application/json" -d '{"event":"test"}'`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      );

      // ─── Resource: Current page info ───
      mcp.registerResource(
        "page-info",
        "Current Callback app page information including URL and visible sessions",
        {
          uri: "callback://page-info",
          mimeType: "application/json",
        },
        () => {
          const sessions = (() => {
            try {
              const raw = localStorage.getItem("callback_sessions");
              return raw ? JSON.parse(raw) : [];
            } catch {
              return [];
            }
          })();

          return {
            contents: [
              {
                uri: "callback://page-info",
                mimeType: "application/json",
                text: JSON.stringify(
                  {
                    current_url: window.location.href,
                    active_sessions: sessions.length,
                    app: "Callback - Instant Webhook URLs",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      );

      console.log("[WebMCP] Callback tools registered successfully");
    }

    // Check if WebMCP is already loaded
    if (window.WebMCP) {
      initWebMCP();
    } else {
      // Wait for the script to load
      const checkInterval = setInterval(() => {
        if (window.WebMCP) {
          clearInterval(checkInterval);
          initWebMCP();
        }
      }, 100);
      // Stop checking after 10 seconds
      setTimeout(() => clearInterval(checkInterval), 10000);
    }
  }, []);

  return null;
}
