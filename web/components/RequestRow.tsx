"use client";

import type { CapturedRequest } from "@/lib/types";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-900/60 text-emerald-300 border-emerald-800",
  POST: "bg-blue-900/60 text-blue-300 border-blue-800",
  PUT: "bg-amber-900/60 text-amber-300 border-amber-800",
  PATCH: "bg-orange-900/60 text-orange-300 border-orange-800",
  DELETE: "bg-red-900/60 text-red-300 border-red-800",
  HEAD: "bg-purple-900/60 text-purple-300 border-purple-800",
  OPTIONS: "bg-zinc-800 text-zinc-300 border-zinc-700",
};

function getMethodColor(method: string): string {
  return METHOD_COLORS[method.toUpperCase()] || "bg-zinc-800 text-zinc-300 border-zinc-700";
}

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

function tryPrettyJson(str: string | null): { formatted: string; isJson: boolean } {
  if (!str) return { formatted: "", isJson: false };
  try {
    const parsed = JSON.parse(str);
    return { formatted: JSON.stringify(parsed, null, 2), isJson: true };
  } catch {
    return { formatted: str, isJson: false };
  }
}

function truncate(str: string | null, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "..." : str;
}

interface RequestRowProps {
  request: CapturedRequest;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function RequestRow({
  request,
  isExpanded,
  onToggle,
}: RequestRowProps) {
  const { formatted: bodyFormatted, isJson } = tryPrettyJson(request.body);
  const queryEntries = Object.entries(request.query || {});
  const headerEntries = Object.entries(request.headers || {});

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
      >
        <span
          className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-mono font-semibold rounded border ${getMethodColor(request.method)}`}
        >
          {request.method}
        </span>
        <span className="text-sm font-mono text-zinc-300 truncate flex-1">
          {request.path}
        </span>
        {request.body && (
          <span className="hidden sm:block text-xs text-zinc-500 font-mono truncate max-w-[200px]">
            {truncate(request.body, 80)}
          </span>
        )}
        <span className="text-xs text-zinc-500 whitespace-nowrap">
          {relativeTime(request.timestamp)}
        </span>
        <svg
          className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-zinc-800 bg-zinc-900/30 px-4 py-4 space-y-4">
          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
            <span>
              ID:{" "}
              <span className="font-mono text-zinc-400">{request.id}</span>
            </span>
            {request.ip && (
              <span>
                IP:{" "}
                <span className="font-mono text-zinc-400">{request.ip}</span>
              </span>
            )}
            <span>
              Size:{" "}
              <span className="font-mono text-zinc-400">
                {request.size} bytes
              </span>
            </span>
            <span>
              Time:{" "}
              <span className="font-mono text-zinc-400">
                {new Date(request.timestamp).toISOString()}
              </span>
            </span>
          </div>

          {/* Query params */}
          {queryEntries.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Query Parameters
              </h4>
              <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {queryEntries.map(([key, value]) => (
                      <tr key={key} className="border-b border-zinc-800 last:border-b-0">
                        <td className="px-3 py-1.5 font-mono text-emerald-400 whitespace-nowrap">
                          {key}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-zinc-300 break-all">
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Headers */}
          {headerEntries.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Headers
              </h4>
              <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {headerEntries.map(([key, value]) => (
                      <tr key={key} className="border-b border-zinc-800 last:border-b-0">
                        <td className="px-3 py-1.5 font-mono text-blue-400 whitespace-nowrap align-top">
                          {key}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-zinc-300 break-all">
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Body */}
          {request.body && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Body
                {isJson && (
                  <span className="ml-2 text-emerald-500 normal-case font-normal">
                    JSON
                  </span>
                )}
              </h4>
              <pre className="bg-zinc-950 rounded-lg border border-zinc-800 p-3 text-sm font-mono text-zinc-300 overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap break-all">
                {bodyFormatted}
              </pre>
            </div>
          )}

          {/* No body */}
          {!request.body && (
            <p className="text-xs text-zinc-500 italic">No request body</p>
          )}
        </div>
      )}
    </div>
  );
}
