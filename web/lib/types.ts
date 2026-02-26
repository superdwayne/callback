export interface CallbackEndpoint {
  id: string;
  url: string;
  createdAt: number;
  expiresAt: number;
  requestCount: number;
}

export interface CapturedRequest {
  id: string;
  endpointId: string;
  timestamp: number;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: string | null;
  ip: string | null;
  size: number;
}
