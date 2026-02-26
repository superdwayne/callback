# Callback

**Instant live callback URLs for webhook testing.**

[![npm version](https://img.shields.io/npm/v/callbackurl.svg)](https://www.npmjs.com/package/callbackurl)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

---

One command. Instant URL. Full visibility into every webhook that hits it.

Callback is a local-first CLI tool that generates live callback URLs on demand, forwarding incoming HTTP requests to your localhost while logging everything for inspection and replay. Think **ngrok meets RequestBin** -- zero config, no accounts, no rate limits.

---

## Features

- **Instant URLs** -- run one command, get a callback URL forwarding to localhost
- **Full request logging** -- every header, body, query param, and timing stored in SQLite
- **Live terminal monitor** -- watch requests stream in real-time with color-coded output
- **Request replay** -- re-send captured webhooks against your local service without re-triggering the source
- **Public tunneling** -- expose your local server to the internet via Cloudflare Tunnel or SSH
- **HTTPS support** -- auto-generated self-signed certificates for secure endpoints
- **Webhook verification** -- built-in signature checking for Stripe, GitHub, Twilio, and Shopify
- **Multi-URL routing** -- route different paths to different local ports for microservice setups
- **Session sharing** -- export and import captured sessions as JSON for team collaboration
- **Plugin system** -- add custom webhook verification providers with a simple JS module
- **Configuration files** -- save defaults per-project or globally so you never retype flags

---

## Quick Start

### Install

```bash
npm install -g callbackurl
```

### Basic usage

```bash
# Start forwarding webhooks to your local server on port 3000
callback listen 3000
```

That's it. Callback prints a local URL and begins forwarding every incoming request to `localhost:3000`, logging everything along the way.

```
  Callback is listening

  Forwarding  http://gentle-fox.localhost:9421 -> localhost:3000

  Session ID: a1b2c3d4
  Press Ctrl+C to stop
```

Point your webhook provider at the URL and watch requests arrive in your terminal.

---

## Commands

### `callback listen <port>`

Start a callback listener that forwards all incoming requests to `localhost:<port>`.

```bash
# Basic listener
callback listen 3000

# With a custom name for a memorable URL
callback listen 3000 --name stripe-test

# Public URL accessible from the internet
callback listen 3000 --public

# HTTPS with auto-generated certificate
callback listen 3000 --https

# Quiet mode -- one line per request, no TUI
callback listen 3000 --quiet

# Verify Stripe webhook signatures
callback listen 3000 --verify stripe --secret whsec_abc123

# Route different paths to different ports
callback listen --route /stripe:3001 --route /github:3002

# Team mode -- let others watch the live session
callback listen 3000 --public --team
```

**Options:**

| Flag | Description |
|---|---|
| `--name <name>` | Custom subdomain name (e.g., `stripe-test.localhost:PORT`) |
| `--public` | Create a publicly accessible URL via tunnel |
| `--local` | Force local-only mode (no tunnel) |
| `--https` | Enable HTTPS with auto-generated self-signed cert |
| `--quiet` | Disable live TUI; output one line per request |
| `--team` | Enable team collaboration mode |
| `--verify <provider>` | Enable webhook signature verification |
| `--secret <secret>` | Webhook signing secret (or set `CALLBACK_WEBHOOK_SECRET`) |
| `--route <path:port>` | Route a URL path to a specific local port (repeatable) |

---

### `callback inspect <session-id> [request-id]`

Inspect requests from a past or active session.

```bash
# List all requests in a session
callback inspect a1b2c3d4

# View full details of a specific request
callback inspect a1b2c3d4 req-5678
```

Output includes method, path, headers, body (formatted JSON when applicable), response status, timing, and verification status.

---

### `callback sessions`

List all callback sessions -- active and ended.

```bash
callback sessions
```

```
Callback Sessions

  a1b2c3d4  stripe-test          active    http://stripe-test.localhost:9421   2025-06-10 14:32
  e5f6g7h8  github-hooks         ended     http://github-hooks.localhost:9422  2025-06-09 09:15
```

---

### `callback replay <session-id> [request-id]`

Re-send captured requests to your local service.

```bash
# Replay a single request
callback replay a1b2c3d4 req-5678

# Replay all requests in order
callback replay a1b2c3d4 --all

# Replay against a different port
callback replay a1b2c3d4 --all --target 4000

# Add delay between replayed requests
callback replay a1b2c3d4 --all --delay 500
```

**Options:**

| Flag | Description |
|---|---|
| `--all` | Replay all requests in chronological order |
| `--target <port>` | Override the destination port |
| `--delay <ms>` | Milliseconds to wait between replayed requests |

---

### `callback share <session-id>`

Export a session to a shareable JSON file.

```bash
# Export to an auto-named file
callback share a1b2c3d4

# Export to a specific file
callback share a1b2c3d4 --output my-session.json
```

The exported file contains the full session metadata and every captured request with headers, body, and timing.

---

### `callback import <file>`

Import a shared session into your local database.

```bash
callback import my-session.json
```

Imported sessions appear in `callback sessions` with a "(shared)" tag appended to the name.

---

### `callback init`

Create a `.callbackrc.json` configuration file in the current directory.

```bash
callback init
```

This scaffolds a config file with sensible defaults that you can customize per-project.

---

### `callback plugins`

Manage webhook verification plugins.

```bash
# List installed plugins
callback plugins list

# Create a new plugin from a template
callback plugins create my-provider
```

The `create` subcommand generates a ready-to-edit plugin file at `~/.callback/plugins/<name>.js`.

---

## Public Tunneling

By default, Callback creates a local URL. Add `--public` to expose it to the internet so external services like Stripe or GitHub can reach your machine.

```bash
callback listen 3000 --public
```

```
  Callback is listening

  Forwarding  http://gentle-fox.localhost:9421 -> localhost:3000
  Public      https://random-slug.trycloudflare.com -> localhost:3000
```

**How it works:**

1. Callback first tries [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (`cloudflared`), which provides free, fast HTTPS tunnels with no account required.
2. If `cloudflared` is not installed, it falls back to an SSH-based tunnel via [serveo.net](https://serveo.net).
3. The tunnel tears down automatically when you press `Ctrl+C`.

**Installing cloudflared (recommended):**

```bash
# macOS
brew install cloudflared

# Linux
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/
```

---

## HTTPS Support

Enable HTTPS on the local proxy with `--https`:

```bash
callback listen 3000 --https
```

On first use, Callback auto-generates a self-signed certificate and stores it at `~/.callback/certs/`. The certificate covers `localhost`, `*.localhost`, and `127.0.0.1`.

**Trusting the certificate (optional):**

```bash
# macOS
security add-trusted-cert -p ssl ~/.callback/certs/localhost.cert

# Linux
sudo cp ~/.callback/certs/localhost.cert /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

When using `--public`, the tunnel provider (Cloudflare) handles TLS automatically -- your public URL will always be HTTPS.

---

## Webhook Verification

Callback can verify webhook signatures inline, so you can confirm payloads are authentic before they even reach your application.

```bash
callback listen 3000 --verify stripe --secret whsec_your_stripe_secret
```

The signing secret can also be set via the `CALLBACK_WEBHOOK_SECRET` environment variable:

```bash
export CALLBACK_WEBHOOK_SECRET=whsec_your_stripe_secret
callback listen 3000 --verify stripe
```

### Supported providers

| Provider | Header checked | Algorithm |
|---|---|---|
| **Stripe** | `stripe-signature` | HMAC-SHA256 with timestamp |
| **GitHub** | `x-hub-signature-256` | HMAC-SHA256 |
| **Twilio** | `x-twilio-signature` | HMAC-SHA1 |
| **Shopify** | `x-shopify-hmac-sha256` | HMAC-SHA256 (Base64) |

Verification status is displayed in the live terminal output and stored in the session database. You can review it later with `callback inspect`.

---

## Multi-URL Routing

Route different webhook paths to different local ports -- useful for microservice architectures where Stripe hits one service and GitHub hits another.

```bash
callback listen --route /stripe:3001 --route /github:3002 --route /twilio:3003
```

```
  Callback is listening

  Forwarding  http://abc123.localhost:9421

  Routes:
    /stripe  -> localhost:3001
    /github  -> localhost:3002
    /twilio  -> localhost:3003
```

Requests to paths that don't match any route return a `404` with a message listing the available routes.

Routes can also be defined in `.callbackrc.json`:

```json
{
  "routes": [
    { "path": "/stripe", "targetPort": 3001 },
    { "path": "/github", "targetPort": 3002 }
  ]
}
```

---

## Configuration

Callback supports layered configuration: a global config for user-wide defaults and a per-project config that overrides it. CLI flags always take highest priority.

### Create a project config

```bash
callback init
```

This creates `.callbackrc.json` in the current directory:

```json
{
  "defaultPort": 3000,
  "mode": "local",
  "https": false
}
```

### Full config reference

| Key | Type | Default | Description |
|---|---|---|---|
| `defaultPort` | `number` | -- | Default target port for `callback listen` |
| `mode` | `"local" \| "public"` | `"local"` | Whether to create a public tunnel by default |
| `https` | `boolean` | `false` | Enable HTTPS by default |
| `name` | `string` | -- | Default subdomain name |
| `verifyProvider` | `string` | -- | Default webhook verification provider |
| `secret` | `string` | -- | Default webhook signing secret |
| `routes` | `RouteConfig[]` | -- | Default path-to-port routing rules |

### Config resolution order

1. CLI flags (highest priority)
2. Project-level `.callbackrc.json` (current directory)
3. Global `~/.callback/config.json`

---

## Plugin System

Extend Callback with custom webhook verification providers for any service not covered by the built-in four.

### Create a plugin

```bash
callback plugins create my-provider
```

This generates a template at `~/.callback/plugins/my-provider.js`:

```javascript
// Callback webhook verification plugin: my-provider

/**
 * @param {{ method: string, path: string, headers: Record<string, string>, body: string | null }} request
 * @param {string} secret - The webhook signing secret
 * @returns {{ valid: boolean, reason?: string }}
 */
module.exports.verify = function(request, secret) {
  // Implement your verification logic here
  // Example: check HMAC signature in headers
  return { valid: true, reason: 'Not yet implemented' };
};
```

### Use a plugin

```bash
callback listen 3000 --verify my-provider --secret my_secret
```

Callback will automatically load the plugin from `~/.callback/plugins/` when the name matches a file in that directory.

### List installed plugins

```bash
callback plugins list
```

---

## Data Storage

All session data is stored locally at `~/.callback/`:

```
~/.callback/
  callback.db          # SQLite database (sessions + requests)
  sessions/            # Session directory
  certs/               # Auto-generated TLS certificates
    localhost.key
    localhost.cert
  plugins/             # Custom verification plugins
  config.json          # Global configuration
```

The SQLite database uses WAL mode for safe concurrent reads and writes.

---

## Contributing

Contributions are welcome. To get started:

```bash
# Clone the repository
git clone https://github.com/your-username/callbackurl.git
cd callbackurl

# Install dependencies
npm install

# Build
npm run build

# Run in development (watch mode)
npm run dev

# Typecheck
npm run typecheck

# Run the CLI locally
node dist/index.js listen 3000
```

The project uses TypeScript with ES modules. Source lives in `src/`, compiled output goes to `dist/`.

**Key files:**

| File | Purpose |
|---|---|
| `src/index.ts` | CLI entrypoint, command registration |
| `src/proxy.ts` | Core proxy server and request handling |
| `src/db.ts` | SQLite database layer |
| `src/verify.ts` | Webhook signature verification |
| `src/tunnel.ts` | Public tunnel providers (cloudflared, SSH) |
| `src/certs.ts` | Self-signed certificate generation |
| `src/config.ts` | Configuration file loading |
| `src/types.ts` | TypeScript type definitions |
| `src/commands/` | Individual CLI command handlers |

---

## License

[MIT](LICENSE)
