import { Command } from 'commander';
import chalk from 'chalk';
import { createLocalConfig } from '../config.js';

export function initCommand(program: Command): void {
  program
    .command('init')
    .description('Create a .callbackrc.json config file')
    .action(() => {
      const path = createLocalConfig();
      console.log(chalk.green(`Created config file: ${chalk.bold(path)}`));
      console.log(chalk.dim('Edit this file to set default options.'));
    });
}
