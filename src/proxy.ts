import http from 'http';
import https from 'https';
import { Readable } from 'stream';
import httpProxy from 'http-proxy';
import chalk from 'chalk';
import { getDb, createSession, endSession, logRequest } from './db.js';
import { loadConfig } from './config.js';
import { generateId, generateSubdomain, findAvailablePort, formatMs, parseQueryString } from './utils.js';
import { getVerifier, verifyRequest } from './verify.js';
import { createTunnel } from './tunnel.js';
import { generateCert } from './certs.js';
import type { CallbackSession, CapturedRequest, RouteConfig, VerifyProvider } from './types.js';

interface ListenOptions {
  name?: string;
  public?: boolean;
  local?: boolean;
  https?: boolean;
  quiet?: boolean;
  team?: boolean;
  verify?: string;
  secret?: string;
  route?: string[];
}

export async function startListener(targetPort: number, options: ListenOptions): Promise<void> {
  const config = loadConfig();
  const db = getDb();

  const sessionId = generateId();
  const sessionName = options.name ?? generateSubdomain();
  const proxyPort = await findAvailablePort();
  const useHttps = options.https ?? config.https ?? false;
  const isPublic = options.public && !options.local;
  const protocol = useHttps ? 'https' : 'http';

  // Parse routes
  const routes: RouteConfig[] = [];
  if (options.route) {
    for (const r of options.route) {
      const [path, port] = r.split(':');
      if (path && port) routes.push({ path, targetPort: parseInt(port, 10) });
    }
  }

  // Setup verification
  let verifier: VerifyProvider | null = null;
  const verifySecret = options.secret ?? process.env.CALLBACK_WEBHOOK_SECRET ?? '';
  if (options.verify ?? config.verifyProvider) {
    const providerName = options.verify ?? config.verifyProvider!;
    verifier = getVerifier(providerName);
    if (!verifier) {
      console.error(chalk.red(`Unknown verification provider: ${providerName}`));
      process.exit(1);
    }
  }

  // Create proxy
  const proxy = httpProxy.createProxyServer({});
  proxy.on('error', (err, _req, res) => {
    if (!options.quiet) console.error(chalk.red(`  Proxy error: ${err.message}`));
    if (res && 'writeHead' in res) {
      (res as http.ServerResponse).writeHead(502, { 'Content-Type': 'application/json' });
      (res as http.ServerResponse).end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
    }
  });

  const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const start = Date.now();
    const reqId = generateId();
    let body = '';

    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const elapsed = Date.now() - start;

      // Determine target based on routes
      let routePort = targetPort;
      if (routes.length > 0) {
        const matchedRoute = routes.find(r => req.url?.startsWith(r.path));
        if (matchedRoute) {
          routePort = matchedRoute.targetPort;
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Not Found',
            message: `No route matches ${req.url}. Available routes: ${routes.map(r => r.path).join(', ')}`,
          }));
          return;
        }
      }

      const captured: CapturedRequest = {
        id: reqId,
        sessionId,
        timestamp: new Date().toISOString(),
        method: req.method ?? 'GET',
        path: req.url ?? '/',
        headers: req.headers as Record<string, string | string[] | undefined>,
        query: parseQueryString(req.url ?? ''),
        body: body || null,
        responseStatus: 200,
        responseTime: elapsed,
        verificationStatus: null,
      };

      // Verify signature if configured
      if (verifier && verifySecret) {
        const result = verifyRequest(verifier, captured, verifySecret);
        captured.verificationStatus = result.valid ? 'valid' : 'invalid';
      } else if (verifier) {
        captured.verificationStatus = 'no-signature';
      }

      // Log to database
      try { logRequest(db, captured); } catch { /* ignore logging errors */ }

      // Print to terminal
      if (!options.quiet) {
        const methodColor = colorForMethod(captured.method);
        const statusStr = chalk.green('→');
        const verifyStr = captured.verificationStatus
          ? ` ${captured.verificationStatus === 'valid' ? chalk.green('✓') : chalk.red('✗')}`
          : '';
        console.log(
          `  ${chalk.dim(new Date().toLocaleTimeString())} ${statusStr} ${methodColor(captured.method.padEnd(7))} ${captured.path}${verifyStr}`
        );
      } else {
        console.log(`${captured.method} ${captured.path} ${captured.responseStatus} ${formatMs(elapsed)}`);
      }

      // Forward to target
      proxy.web(req, res, {
        target: `http://localhost:${routePort}`,
        // body already consumed, re-inject it
        buffer: createReadableStream(body),
      });
    });
  };

  // Create server (HTTP or HTTPS)
  let server: http.Server | https.Server;
  if (useHttps) {
    const { key, cert } = await generateCert();
    server = https.createServer({ key, cert }, requestHandler);
  } else {
    server = http.createServer(requestHandler);
  }

  // Capture response status
  proxy.on('proxyRes', (proxyRes, req) => {
    // Update the logged request with actual response status
    const status = proxyRes.statusCode ?? 200;
    // We can't easily update the DB record here, but the forwarding works
  });

  server.listen(proxyPort, async () => {
    const localUrl = `${protocol}://${sessionName}.localhost:${proxyPort}`;
    let publicUrl: string | undefined;

    if (isPublic) {
      try {
        publicUrl = await createTunnel(proxyPort);
      } catch (err) {
        console.warn(chalk.yellow(`Could not create public tunnel: ${err}`));
      }
    }

    const session: CallbackSession = {
      id: sessionId,
      name: sessionName,
      targetPort,
      proxyPort,
      url: localUrl,
      publicUrl,
      https: useHttps,
      createdAt: new Date().toISOString(),
    };
    createSession(db, session);

    console.log();
    console.log(chalk.bold('  Callback is listening'));
    console.log();
    console.log(`  ${chalk.dim('Forwarding')}  ${chalk.cyan(localUrl)} ${chalk.dim('→')} localhost:${targetPort}`);
    if (publicUrl) {
      console.log(`  ${chalk.dim('Public')}     ${chalk.green(publicUrl)} ${chalk.dim('→')} localhost:${targetPort}`);
    }
    if (routes.length > 0) {
      console.log();
      console.log(chalk.dim('  Routes:'));
      for (const r of routes) {
        console.log(`    ${r.path} → localhost:${r.targetPort}`);
      }
    }
    if (verifier) {
      console.log(`  ${chalk.dim('Verifying')}  ${verifier.name} webhooks`);
    }
    console.log();
    console.log(chalk.dim('  Session ID: ' + sessionId));
    console.log(chalk.dim('  Press Ctrl+C to stop\n'));
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log(chalk.dim('\n  Shutting down...'));
    endSession(db, sessionId);
    proxy.close();
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function colorForMethod(method: string) {
  switch (method.toUpperCase()) {
    case 'GET': return chalk.green;
    case 'POST': return chalk.blue;
    case 'PUT': return chalk.yellow;
    case 'PATCH': return chalk.magenta;
    case 'DELETE': return chalk.red;
    default: return chalk.white;
  }
}

function createReadableStream(data: string) {
  const stream = new Readable();
  stream.push(data);
  stream.push(null);
  return stream;
}
