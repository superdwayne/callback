"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import type { CallbackEndpoint, CapturedRequest } from "@/lib/types";
import RequestRow from "@/components/RequestRow";

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function timeUntil(timestamp: number): string {
  const diff = timestamp - Date.now();
  if (diff <= 0) return "expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function DashboardPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [endpoint, setEndpoint] = useState<CallbackEndpoint | null>(null);
  const [requests, setRequests] = useState<CapturedRequest[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const hookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/hook/${id}`
      : `/api/hook/${id}`;

  // Fetch initial data
  useEffect(() => {
    async function load() {
      try {
        const [endpointRes, requestsRes] = await Promise.all([
          fetch(`/api/requests/${id}`),
          fetch(`/api/requests/${id}`),
        ]);

        if (!endpointRes.ok) {
          setError("Endpoint not found or has expired.");
          setLoading(false);
          return;
        }

        const data = await endpointRes.json();

        if (data.endpoint) {
          setEndpoint(data.endpoint);
        }
        if (data.requests) {
          setRequests(data.requests);
        }
      } catch {
        setError("Failed to load endpoint data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  // SSE for live updates
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/stream/${id}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const newReq: CapturedRequest = JSON.parse(event.data);
        setRequests((prev) => {
          const exists = prev.some((r) => r.id === newReq.id);
          if (exists) return prev;
          return [newReq, ...prev].slice(0, 100);
        });
        setEndpoint((prev) =>
          prev ? { ...prev, requestCount: prev.requestCount + 1 } : prev
        );
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
      // Reconnect after a short delay
      setTimeout(() => {
        connectSSE();
      }, 3000);
    };
  }, [id]);

  useEffect(() => {
    connectSSE();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connectSSE]);

  // Update relative times
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(hookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 text-zinc-400">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading endpoint...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <a
          href="/"
          className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Create a new endpoint
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* URL section */}
      <section className="mb-8">
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Your Callback URL
        </label>
        <div className="flex items-stretch gap-2">
          <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 font-mono text-sm text-emerald-400 truncate select-all">
            {hookUrl}
          </div>
          <button
            onClick={handleCopy}
            className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            {copied ? (
              <span className="text-emerald-400">Copied!</span>
            ) : (
              "Copy"
            )}
          </button>
        </div>
      </section>

      {/* Endpoint info */}
      {endpoint && (
        <section className="mb-8 flex flex-wrap gap-6 text-sm text-zinc-400">
          <div>
            <span className="text-zinc-500">Created: </span>
            <span className="text-zinc-300">{formatDate(endpoint.createdAt)}</span>
          </div>
          <div>
            <span className="text-zinc-500">Expires in: </span>
            <span className="text-zinc-300">{timeUntil(endpoint.expiresAt)}</span>
          </div>
          <div>
            <span className="text-zinc-500">Requests: </span>
            <span className="text-zinc-300">{endpoint.requestCount} / 100</span>
          </div>
        </section>
      )}

      {/* Request list */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          Incoming Requests
        </h2>

        {requests.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-12 text-center">
            <div className="inline-flex items-center gap-2 text-zinc-500">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              Waiting for requests...
            </div>
            <p className="text-xs text-zinc-600 mt-3">
              Send a request to the URL above and it will appear here in
              real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => (
              <RequestRow
                key={req.id}
                request={req}
                isExpanded={expandedId === req.id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === req.id ? null : req.id))
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* How to test */}
      <section className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/30">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          How to test
        </h3>
        <p className="text-sm text-zinc-500 mb-3">
          Send a request using curl, Postman, or any HTTP client:
        </p>
        <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-4 overflow-x-auto">
          <code className="text-sm font-mono text-zinc-300 whitespace-pre">
            {`curl -X POST ${hookUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"event":"test"}'`}
          </code>
        </div>
        <p className="text-xs text-zinc-600 mt-3">
          Supports all HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
        </p>
      </section>
    </div>
  );
}
