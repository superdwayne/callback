"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/create", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create endpoint");
      const data = await res.json();
      router.push(`/d/${data.id}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Hero */}
      <section className="pt-24 pb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white mb-6">
          Instant Callback URLs
        </h1>
        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Generate a live webhook URL in one click. Inspect every request
          &mdash; headers, body, timing. No signup. No install. Free.
        </p>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium text-lg px-8 py-3.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          {loading ? (
            <>
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
              Creating...
            </>
          ) : (
            "Generate URL"
          )}
        </button>
      </section>

      {/* Features */}
      <section className="pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50">
            <div className="w-10 h-10 rounded-lg bg-emerald-950 flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              Capture Everything
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Headers, body, query params, timing. Every detail of every
              incoming request is captured and displayed instantly.
            </p>
          </div>

          <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50">
            <div className="w-10 h-10 rounded-lg bg-blue-950 flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              Live Stream
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Watch requests arrive in real-time with server-sent events. No
              refreshing needed — your dashboard updates instantly.
            </p>
          </div>

          <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50">
            <div className="w-10 h-10 rounded-lg bg-amber-950 flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              24h Retention
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              URLs automatically expire after 24 hours. Each endpoint captures
              up to 100 requests. Perfect for quick testing sessions.
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-zinc-800 py-12 text-center">
        <p className="text-zinc-400 text-sm">
          Need more? Install the CLI:{" "}
          <a
            href="https://www.npmjs.com/package/callbackurl"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            npm i -g callbackurl
          </a>
        </p>
      </section>
    </div>
  );
}
