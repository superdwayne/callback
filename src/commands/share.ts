import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { getDb, getSession, getRequests } from '../db.js';
import type { SharedSession } from '../types.js';

export function shareCommand(program: Command): void {
  program
    .command('share <sessionId>')
    .description('Export a session for sharing')
    .option('--output <file>', 'Output file path')
    .action((sessionId: string, options) => {
      const db = getDb();
      const session = getSession(db, sessionId);
      if (!session) {
        console.error(chalk.red(`Session "${sessionId}" not found.`));
        process.exit(1);
      }

      const requests = getRequests(db, session.id);
      const shared: SharedSession = {
        session,
        requests,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      const filename = options.output ?? `callback-${session.name}-${session.id.slice(0, 8)}.json`;
      writeFileSync(filename, JSON.stringify(shared, null, 2));
      console.log(chalk.green(`Session exported to ${chalk.bold(filename)}`));
      console.log(chalk.dim(`Contains ${requests.length} requests`));
      db.close();
    });
}
