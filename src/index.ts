#!/usr/bin/env node

import { Command } from 'commander';
import { listenCommand } from './commands/listen.js';
import { inspectCommand } from './commands/inspect.js';
import { sessionsCommand } from './commands/sessions.js';
import { replayCommand } from './commands/replay.js';
import { shareCommand } from './commands/share.js';
import { importCommand } from './commands/import.js';
import { watchCommand } from './commands/watch.js';
import { initCommand } from './commands/init.js';
import { pluginsCommand } from './commands/plugins.js';

const program = new Command();

program
  .name('callback')
  .description('Generate instant live callback URLs for webhook testing')
  .version('1.0.0');

listenCommand(program);
inspectCommand(program);
sessionsCommand(program);
replayCommand(program);
shareCommand(program);
importCommand(program);
watchCommand(program);
initCommand(program);
pluginsCommand(program);

program.parse();
