export interface CallbackSession {
  id: string;
  name: string;
  targetPort: number;
  proxyPort: number;
  url: string;
  publicUrl?: string;
  https: boolean;
  createdAt: string;
  endedAt?: string;
}

export interface CapturedRequest {
  id: string;
  sessionId: string;
  timestamp: string;
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string>;
  body: string | null;
  responseStatus: number;
  responseTime: number;
  verificationStatus?: 'valid' | 'invalid' | 'no-signature' | null;
}

export interface RouteConfig {
  path: string;
  targetPort: number;
}

export interface CallbackConfig {
  defaultPort?: number;
  mode?: 'local' | 'public';
  https?: boolean;
  name?: string;
  verifyProvider?: string;
  secret?: string;
  routes?: RouteConfig[];
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

export interface VerifyProvider {
  name: string;
  verify(request: CapturedRequest, secret: string): VerifyResult;
}

export interface TunnelProvider {
  name: string;
  connect(localPort: number): Promise<string>;
  disconnect(): Promise<void>;
}

export interface SharedSession {
  session: CallbackSession;
  requests: CapturedRequest[];
  exportedAt: string;
  version: string;
}
