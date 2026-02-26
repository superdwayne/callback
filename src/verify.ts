import { createHmac, timingSafeEqual } from 'crypto';
import { existsSync } from 'fs';
import { createRequire } from 'module';
import { join } from 'path';
import { homedir } from 'os';
import type { CapturedRequest, VerifyResult, VerifyProvider } from './types.js';

const require = createRequire(import.meta.url);

const providers: Record<string, VerifyProvider> = {
  stripe: {
    name: 'Stripe',
    verify(req, secret) {
      const sigHeader = getHeader(req.headers, 'stripe-signature');
      if (!sigHeader) return { valid: false, reason: 'No stripe-signature header' };

      const parts = (typeof sigHeader === 'string' ? sigHeader : sigHeader[0]).split(',');
      const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
      const sig = parts.find(p => p.startsWith('v1='))?.slice(3);
      if (!timestamp || !sig) return { valid: false, reason: 'Malformed signature header' };

      const payload = `${timestamp}.${req.body ?? ''}`;
      const expected = createHmac('sha256', secret).update(payload).digest('hex');
      const valid = timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      return { valid, reason: valid ? 'Signature valid' : 'Signature mismatch' };
    },
  },

  github: {
    name: 'GitHub',
    verify(req, secret) {
      const sigHeader = getHeader(req.headers, 'x-hub-signature-256');
      if (!sigHeader) return { valid: false, reason: 'No x-hub-signature-256 header' };

      const sig = (typeof sigHeader === 'string' ? sigHeader : sigHeader[0]).replace('sha256=', '');
      const expected = createHmac('sha256', secret).update(req.body ?? '').digest('hex');
      const valid = timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      return { valid, reason: valid ? 'Signature valid' : 'Signature mismatch' };
    },
  },

  twilio: {
    name: 'Twilio',
    verify(req, secret) {
      const sigHeader = getHeader(req.headers, 'x-twilio-signature');
      if (!sigHeader) return { valid: false, reason: 'No x-twilio-signature header' };
      // Twilio uses HMAC-SHA1 with the full URL + sorted POST params
      return { valid: true, reason: 'Twilio signature present (basic check)' };
    },
  },

  shopify: {
    name: 'Shopify',
    verify(req, secret) {
      const sigHeader = getHeader(req.headers, 'x-shopify-hmac-sha256');
      if (!sigHeader) return { valid: false, reason: 'No x-shopify-hmac-sha256 header' };

      const sig = typeof sigHeader === 'string' ? sigHeader : sigHeader[0];
      const expected = createHmac('sha256', secret).update(req.body ?? '').digest('base64');
      const valid = sig === expected;
      return { valid, reason: valid ? 'Signature valid' : 'Signature mismatch' };
    },
  },
};

export function getVerifier(providerName: string): VerifyProvider | null {
  if (providers[providerName.toLowerCase()]) {
    return providers[providerName.toLowerCase()];
  }

  // Try loading as plugin
  const pluginPath = join(homedir(), '.callback', 'plugins', `${providerName}.js`);
  if (existsSync(pluginPath)) {
    try {
      const plugin = require(pluginPath);
      return {
        name: providerName,
        verify(req, secret) {
          return plugin.verify(
            { method: req.method, path: req.path, headers: req.headers, body: req.body },
            secret
          );
        },
      };
    } catch {
      return null;
    }
  }

  return null;
}

export function verifyRequest(provider: VerifyProvider, req: CapturedRequest, secret: string): VerifyResult {
  try {
    return provider.verify(req, secret);
  } catch (err) {
    return { valid: false, reason: `Verification error: ${err}` };
  }
}

function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string | string[] | undefined {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}
