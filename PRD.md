# PRD: Callback — Live Callback URL Generator

## Introduction

Callback is a CLI tool that generates live callback URLs on demand for webhook testing. Developers can instantly spin up public or local URLs that forward incoming requests to localhost while logging everything for inspection and replay. Think ngrok meets RequestBin — one command, instant URL, full visibility.

The core problem: testing webhooks (Stripe, GitHub, Twilio, etc.) requires a publicly accessible URL pointing to your local machine. Existing tools are either paid, rate-limited, or don't provide request inspection. Callback gives you **endless, instant callback URLs** with full request logging, replay, and sharing — all from the CLI.

## Goals

- Generate unique callback URLs with a single CLI command
- Support both local network and public internet URLs
- Forward all incoming requests to a specified local port in real-time
- Log and inspect every request (headers, body, timing)
- Replay captured requests on demand
- Share callback sessions with teammates
- Provide a terminal-based UI for live request monitoring
- Zero configuration required for basic usage

## User Stories

### US-001: Project scaffolding and CLI framework
**Description:** As a developer, I want the core project structure and CLI entrypoint so that all subsequent features have a foundation to build on.

**Acceptance Criteria:**
- [ ] Initialize Node.js project with TypeScript
- [ ] Set up CLI framework (e.g., Commander or Yargs) with `callback` as the binary name
- [ ] `callback --version` prints version number
- [ ] `callback --help` prints usage information
- [ ] Project builds successfully with `npm run build`
- [ ] Typecheck passes

### US-002: Local reverse proxy server
**Description:** As a developer, I want a local proxy server that listens on a port and forwards requests to my local service so that I can receive webhook callbacks locally.

**Acceptance Criteria:**
- [ ] `callback listen <port>` starts a local HTTP proxy on an available port
- [ ] All incoming requests are forwarded to `localhost:<port>`
- [ ] Response from local service is returned to the caller
- [ ] Supports GET, POST, PUT, PATCH, DELETE methods
- [ ] Preserves headers, query params, and request body during forwarding
- [ ] Prints the local callback URL to stdout on startup
- [ ] Typecheck passes

### US-003: Unique URL generation with subdomains
**Description:** As a developer, I want each callback session to get a unique, human-readable URL so that I can run multiple callbacks simultaneously without conflicts.

**Acceptance Criteria:**
- [ ] Each `callback listen` generates a unique subdomain (e.g., `abc123.localhost:<proxy-port>`)
- [ ] Optional `--name <name>` flag for custom subdomain (e.g., `stripe-test.localhost:<proxy-port>`)
- [ ] Multiple simultaneous sessions supported (each with unique subdomain)
- [ ] Subdomain routing resolves correctly to the right local port
- [ ] Typecheck passes

### US-004: Request logging engine
**Description:** As a developer, I want every incoming request to be logged with full details so that I can inspect webhook payloads for debugging.

**Acceptance Criteria:**
- [ ] Each request is logged with: timestamp, method, path, headers, query params, body, response status, response time
- [ ] Logs stored in a local SQLite database (per session)
- [ ] Database file stored in `~/.callback/sessions/<session-id>/`
- [ ] Logs persist after the session ends
- [ ] Typecheck passes

### US-005: Live terminal request monitor (TUI)
**Description:** As a developer, I want a real-time terminal UI showing incoming requests so that I can watch webhook events as they arrive.

**Acceptance Criteria:**
- [ ] `callback listen <port>` shows a live-updating terminal display by default
- [ ] Each request shown as a row: timestamp, method, path, status, response time
- [ ] Pressing Enter on a request shows full detail (headers, body, response)
- [ ] `--quiet` flag disables TUI and outputs one line per request
- [ ] TUI updates in real-time as requests arrive
- [ ] Typecheck passes
- [ ] Verify changes work in terminal

### US-006: Request inspection command
**Description:** As a developer, I want to inspect past requests from completed sessions so that I can debug issues after the fact.

**Acceptance Criteria:**
- [ ] `callback inspect <session-id>` lists all requests from a past session
- [ ] `callback inspect <session-id> <request-id>` shows full detail of a specific request
- [ ] Output includes: method, URL, headers, body (formatted JSON if applicable), response status, timing
- [ ] `callback sessions` lists all past sessions with timestamp and URL
- [ ] Typecheck passes

### US-007: Public tunnel via Cloudflare Tunnel or SSH tunneling
**Description:** As a developer, I want my callback URL to be accessible from the public internet so that external services (Stripe, GitHub) can send webhooks to my local machine.

**Acceptance Criteria:**
- [ ] `callback listen <port> --public` creates a publicly accessible URL
- [ ] Uses Cloudflare Tunnel (cloudflared) as primary tunnel provider
- [ ] Falls back to SSH-based tunneling if cloudflared is not installed
- [ ] Public URL printed to stdout and copied to clipboard
- [ ] Tunnel tears down cleanly when session ends (Ctrl+C)
- [ ] `--local` flag explicitly forces local-only mode
- [ ] Typecheck passes

### US-008: Request replay
**Description:** As a developer, I want to replay a captured request against my local service so that I can re-test webhook handling without triggering the external service again.

**Acceptance Criteria:**
- [ ] `callback replay <session-id> <request-id>` re-sends the captured request to the original local port
- [ ] `callback replay <session-id> --all` replays all requests in order with original timing gaps
- [ ] `--target <port>` flag overrides the destination port
- [ ] `--delay <ms>` flag overrides timing between replayed requests
- [ ] Response from replay is shown in terminal
- [ ] Typecheck passes

### US-009: Session sharing
**Description:** As a developer, I want to share a session's captured requests with a teammate so they can see exactly what webhooks arrived.

**Acceptance Criteria:**
- [ ] `callback share <session-id>` exports session data to a shareable JSON file
- [ ] JSON includes all requests with full headers, body, and metadata
- [ ] `callback import <file>` imports a shared session into local database
- [ ] Imported sessions appear in `callback sessions` with a "shared" tag
- [ ] `--url` flag uploads to a temporary paste service and returns a URL
- [ ] Typecheck passes

### US-010: HTTPS support with auto-generated certificates
**Description:** As a developer, I want callback URLs to support HTTPS so that services requiring secure endpoints can send webhooks.

**Acceptance Criteria:**
- [ ] `--https` flag enables HTTPS on the local proxy
- [ ] Auto-generates self-signed certificate on first use
- [ ] Certificate stored in `~/.callback/certs/`
- [ ] Public tunnel mode (US-007) uses HTTPS by default
- [ ] Warning printed when using self-signed cert (with instructions to trust it)
- [ ] Typecheck passes

### US-011: Webhook signature verification helpers
**Description:** As a developer, I want built-in helpers to verify webhook signatures so I can confirm payloads are authentic during testing.

**Acceptance Criteria:**
- [ ] `--verify <provider>` flag enables signature verification (e.g., `--verify stripe`)
- [ ] Supported providers: Stripe, GitHub, Twilio, Shopify
- [ ] Verification result shown in request log (valid/invalid/no-signature)
- [ ] `CALLBACK_WEBHOOK_SECRET` env var or `--secret` flag provides the signing secret
- [ ] Verification status visible in TUI and `callback inspect`
- [ ] Typecheck passes

### US-012: Configuration file support
**Description:** As a developer, I want to save my preferred settings in a config file so I don't have to pass flags every time.

**Acceptance Criteria:**
- [ ] `callback init` creates a `.callbackrc.json` in the current directory
- [ ] Config supports: default port, public/local mode, HTTPS, custom name, verify provider
- [ ] CLI flags override config file values
- [ ] Global config at `~/.callback/config.json` for user-wide defaults
- [ ] Project-level `.callbackrc.json` overrides global config
- [ ] Typecheck passes

### US-013: Multi-URL routing
**Description:** As a developer, I want to route different URL paths to different local ports so I can test microservice webhook setups.

**Acceptance Criteria:**
- [ ] `callback listen --route /stripe:3001 --route /github:3002` routes paths to different ports
- [ ] Unmatched paths return 404 with helpful message
- [ ] Each route's requests logged separately in the TUI
- [ ] Routes configurable in `.callbackrc.json`
- [ ] Typecheck passes
- [ ] Verify changes work in terminal

### US-014: Team collaboration — shared tunnel URLs
**Description:** As a team member, I want to share a live callback URL with my team so multiple people can monitor incoming webhooks simultaneously.

**Acceptance Criteria:**
- [ ] `callback listen <port> --public --team` generates a shareable public URL
- [ ] Multiple users can connect to watch the live request stream via `callback watch <url>`
- [ ] Watch mode shows real-time TUI identical to the host's view
- [ ] Host can revoke access with `callback revoke <session-id>`
- [ ] Typecheck passes

### US-015: Plugin system for custom providers
**Description:** As a developer, I want to add custom webhook verification providers so I can support services beyond the built-in list.

**Acceptance Criteria:**
- [ ] Plugins are JS/TS files in `~/.callback/plugins/`
- [ ] Plugin exports a `verify(request, secret)` function returning `{ valid: boolean, reason?: string }`
- [ ] `--verify <plugin-name>` loads custom plugin by filename
- [ ] `callback plugins` lists installed plugins
- [ ] Example plugin template created by `callback plugin:create <name>`
- [ ] Typecheck passes

## Non-Goals

- No hosted/cloud service — this is a local-first CLI tool
- No paid plans or account system
- No persistent always-on URLs (URLs live only while the CLI runs)
- No browser-based dashboard in V1 (terminal TUI only)
- No built-in webhook sender/trigger (only receives)
- No load testing or performance benchmarking features
- No Windows support in V1 (macOS + Linux only)

## Technical Considerations

- **Runtime:** Node.js 20+ with TypeScript
- **CLI Framework:** Commander.js or oclif for CLI structure
- **Proxy:** Node.js `http-proxy` or custom HTTP server with `undici`
- **Database:** SQLite via `better-sqlite3` for request logging (lightweight, zero-config)
- **TUI:** Ink (React for CLI) or `blessed` for terminal UI
- **Tunneling:** Cloudflare Tunnel (`cloudflared`) as primary, with `localtunnel` as fallback
- **URL Generation:** nanoid or similar for unique subdomain generation
- **HTTPS:** `selfsigned` package for auto-cert generation
- **Monorepo:** Not needed — single package
- **Inspiration:** Portless (reverse proxy architecture), ngrok (tunneling), RequestBin (logging)
