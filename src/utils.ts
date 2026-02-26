import { nanoid } from 'nanoid';
import { createServer } from 'net';

export function generateId(): string {
  return nanoid(10);
}

export function generateSubdomain(): string {
  return nanoid(8).toLowerCase().replace(/[^a-z0-9]/g, 'x');
}

export async function findAvailablePort(start = 4000, end = 4999): Promise<number> {
  for (let port = start; port <= end; port++) {
    const available = await isPortAvailable(port);
    if (available) return port;
  }
  throw new Error(`No available ports in range ${start}-${end}`);
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function parseQueryString(url: string): Record<string, string> {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return {};
  const params = new URLSearchParams(url.slice(queryIndex));
  const result: Record<string, string> = {};
  params.forEach((value, key) => { result[key] = value; });
  return result;
}

export function tryParseJson(str: string | null): any {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return str; }
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}
