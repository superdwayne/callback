import { Command } from 'commander';
import chalk from 'chalk';
import { getDb, getSession, getRequests, getRequest } from '../db.js';
import { formatTimestamp, formatMs, tryParseJson } from '../utils.js';

export function inspectCommand(program: Command): void {
  program
    .command('inspect <sessionId> [requestId]')
    .description('Inspect requests from a session')
    .action((sessionId: string, requestId?: string) => {
      const db = getDb();
      const session = getSession(db, sessionId);
      if (!session) {
        console.error(chalk.red(`Session "${sessionId}" not found.`));
        process.exit(1);
      }

      if (requestId) {
        const req = getRequest(db, session.id, requestId);
        if (!req) {
          console.error(chalk.red(`Request "${requestId}" not found in session.`));
          process.exit(1);
        }
        console.log(chalk.bold(`\n${req.method} ${req.path}`));
        console.log(chalk.dim(`ID: ${req.id}`));
        console.log(chalk.dim(`Time: ${formatTimestamp(req.timestamp)}`));
        console.log(chalk.dim(`Response: ${req.responseStatus} (${formatMs(req.responseTime)})`));
        if (req.verificationStatus) {
          const color = req.verificationStatus === 'valid' ? chalk.green : chalk.red;
          console.log(`Verification: ${color(req.verificationStatus)}`);
        }
        console.log(chalk.bold('\nHeaders:'));
        const headers = typeof req.headers === 'string' ? JSON.parse(req.headers) : req.headers;
        for (const [key, val] of Object.entries(headers)) {
          console.log(`  ${chalk.cyan(key)}: ${val}`);
        }
        if (req.body) {
          console.log(chalk.bold('\nBody:'));
          const parsed = tryParseJson(req.body);
          console.log(typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : parsed);
        }
      } else {
        const requests = getRequests(db, session.id);
        console.log(chalk.bold(`\nSession: ${session.name} (${session.id})`));
        console.log(chalk.dim(`URL: ${session.url}`));
        console.log(chalk.dim(`${requests.length} requests\n`));

        if (requests.length === 0) {
          console.log(chalk.dim('  No requests captured.'));
          return;
        }

        for (const req of requests) {
          const status = req.responseStatus < 400 ? chalk.green(req.responseStatus) : chalk.red(req.responseStatus);
          console.log(
            `  ${chalk.dim(req.id.padEnd(12))}  ${chalk.bold(req.method.padEnd(7))} ${req.path.padEnd(30)} ${status}  ${formatMs(req.responseTime).padStart(8)}  ${chalk.dim(formatTimestamp(req.timestamp))}`
          );
        }
      }
      db.close();
    });
}
