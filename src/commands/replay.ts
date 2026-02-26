import { Command } from 'commander';
import chalk from 'chalk';
import http from 'http';
import { getDb, getSession, getRequests, getRequest } from '../db.js';
import { formatMs } from '../utils.js';

export function replayCommand(program: Command): void {
  program
    .command('replay <sessionId> [requestId]')
    .description('Replay captured requests against a local service')
    .option('--all', 'Replay all requests in order')
    .option('--target <port>', 'Override destination port')
    .option('--delay <ms>', 'Delay between replayed requests (ms)', '0')
    .action(async (sessionId: string, requestId: string | undefined, options) => {
      const db = getDb();
      const session = getSession(db, sessionId);
      if (!session) {
        console.error(chalk.red(`Session "${sessionId}" not found.`));
        process.exit(1);
      }

      const targetPort = options.target ? parseInt(options.target, 10) : session.targetPort;
      const delay = parseInt(options.delay, 10);

      if (requestId) {
        const req = getRequest(db, session.id, requestId);
        if (!req) {
          console.error(chalk.red(`Request "${requestId}" not found.`));
          process.exit(1);
        }
        await replayOne(req.method, req.path, req.headers, req.body, targetPort);
      } else if (options.all) {
        const requests = getRequests(db, session.id);
        console.log(chalk.bold(`Replaying ${requests.length} requests to localhost:${targetPort}\n`));
        for (let i = 0; i < requests.length; i++) {
          const req = requests[i];
          if (i > 0 && delay > 0) await sleep(delay);
          await replayOne(req.method, req.path, req.headers, req.body, targetPort);
        }
        console.log(chalk.green('\nReplay complete.'));
      } else {
        console.error(chalk.red('Provide a request ID or use --all'));
        process.exit(1);
      }
      db.close();
    });
}

async function replayOne(
  method: string, path: string,
  headers: Record<string, string | string[] | undefined>,
  body: string | null, port: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const reqHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (v && k.toLowerCase() !== 'host' && k.toLowerCase() !== 'content-length') {
        reqHeaders[k] = Array.isArray(v) ? v.join(', ') : v;
      }
    }

    const req = http.request({
      hostname: 'localhost',
      port,
      path,
      method,
      headers: reqHeaders,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const elapsed = Date.now() - start;
        const status = (res.statusCode ?? 0) < 400 ? chalk.green(res.statusCode) : chalk.red(res.statusCode);
        console.log(`  ${chalk.bold(method.padEnd(7))} ${path.padEnd(30)} ${status}  ${formatMs(elapsed)}`);
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error(chalk.red(`  Failed: ${err.message}`));
      resolve();
    });

    if (body) req.write(body);
    req.end();
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
