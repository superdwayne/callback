import { Redis } from "@upstash/redis";
import type { CallbackEndpoint, CapturedRequest } from "./types";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TTL = 60 * 60 * 24; // 24 hours
const MAX_REQUESTS = 100;

export async function createEndpoint(id: string, baseUrl: string): Promise<CallbackEndpoint> {
  const now = Date.now();
  const endpoint: CallbackEndpoint = {
    id,
    url: `${baseUrl}/api/hook/${id}`,
    createdAt: now,
    expiresAt: now + TTL * 1000,
    requestCount: 0,
  };
  await redis.set(`cb:${id}`, JSON.stringify(endpoint), { ex: TTL });
  return endpoint;
}

export async function getEndpoint(id: string): Promise<CallbackEndpoint | null> {
  const data = await redis.get<string>(`cb:${id}`);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

export async function logRequest(req: CapturedRequest): Promise<void> {
  const key = `cb:${req.endpointId}:reqs`;
  const reqKey = `cb:req:${req.id}`;

  // Store the request
  await redis.set(reqKey, JSON.stringify(req), { ex: TTL });

  // Add to the endpoint's request list (newest first)
  await redis.lpush(key, req.id);
  await redis.ltrim(key, 0, MAX_REQUESTS - 1);
  await redis.expire(key, TTL);

  // Increment request count
  const endpoint = await getEndpoint(req.endpointId);
  if (endpoint) {
    endpoint.requestCount++;
    const ttl = await redis.ttl(`cb:${req.endpointId}`);
    await redis.set(`cb:${req.endpointId}`, JSON.stringify(endpoint), { ex: ttl > 0 ? ttl : TTL });
  }

  // Publish for SSE listeners
  await redis.publish(`cb:stream:${req.endpointId}`, JSON.stringify(req));
}

export async function getRequests(endpointId: string): Promise<CapturedRequest[]> {
  const key = `cb:${endpointId}:reqs`;
  const ids = await redis.lrange(key, 0, -1);
  if (!ids || ids.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.get(`cb:req:${id}`);
  }
  const results = await pipeline.exec();

  return results
    .filter((r): r is string => r !== null)
    .map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}

export async function getRequest(reqId: string): Promise<CapturedRequest | null> {
  const data = await redis.get<string>(`cb:req:${reqId}`);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}
