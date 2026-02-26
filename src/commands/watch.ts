import { Command } from 'commander';
import chalk from 'chalk';

export function watchCommand(program: Command): void {
  program
    .command('watch <url>')
    .description('Watch a live callback session (team mode)')
    .action((url: string) => {
      console.log(chalk.bold('Connecting to live session...'));
      console.log(chalk.dim(`URL: ${url}`));
      console.log(chalk.yellow('Team watch mode requires --team flag on the host. Coming soon.'));
    });
}
