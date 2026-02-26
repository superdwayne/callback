import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { getDb, createSession, logRequest } from '../db.js';
import type { SharedSession } from '../types.js';

export function importCommand(program: Command): void {
  program
    .command('import <file>')
    .description('Import a shared session')
    .action((file: string) => {
      let data: SharedSession;
      try {
        data = JSON.parse(readFileSync(file, 'utf-8'));
      } catch {
        console.error(chalk.red(`Failed to read or parse "${file}"`));
        process.exit(1);
      }

      if (!data.session || !data.requests) {
        console.error(chalk.red('Invalid session file format.'));
        process.exit(1);
      }

      const db = getDb();

      // Mark as imported by appending to name
      const session = { ...data.session, name: `${data.session.name} (shared)` };
      try {
        createSession(db, session);
      } catch {
        console.error(chalk.yellow('Session already exists, skipping session creation.'));
      }

      let imported = 0;
      for (const req of data.requests) {
        try {
          logRequest(db, req);
          imported++;
        } catch {
          // skip duplicates
        }
      }

      console.log(chalk.green(`Imported ${imported} requests from "${data.session.name}"`));
      console.log(chalk.dim(`Session ID: ${data.session.id}`));
      db.close();
    });
}
