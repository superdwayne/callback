import { Command } from 'commander';
import chalk from 'chalk';
import { getDb, getSessions } from '../db.js';
import { formatTimestamp } from '../utils.js';

export function sessionsCommand(program: Command): void {
  program
    .command('sessions')
    .description('List all callback sessions')
    .action(() => {
      const db = getDb();
      const sessions = getSessions(db);

      if (sessions.length === 0) {
        console.log(chalk.dim('No sessions yet. Run `callback listen <port>` to start one.'));
        return;
      }

      console.log(chalk.bold('\nCallback Sessions\n'));
      for (const s of sessions) {
        const status = s.endedAt ? chalk.dim('ended') : chalk.green('active');
        console.log(
          `  ${chalk.cyan(s.id.padEnd(12))}  ${s.name.padEnd(20)} ${status.padEnd(16)} ${s.url.padEnd(35)} ${chalk.dim(formatTimestamp(s.createdAt))}`
        );
      }
      console.log();
      db.close();
    });
}
