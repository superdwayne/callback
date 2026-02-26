import { Command } from 'commander';
import chalk from 'chalk';
import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PLUGINS_DIR = join(homedir(), '.callback', 'plugins');

export function pluginsCommand(program: Command): void {
  const plugins = program
    .command('plugins')
    .description('Manage webhook verification plugins');

  plugins
    .command('list')
    .description('List installed plugins')
    .action(() => {
      if (!existsSync(PLUGINS_DIR)) {
        console.log(chalk.dim('No plugins installed.'));
        return;
      }
      const files = readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
      if (files.length === 0) {
        console.log(chalk.dim('No plugins installed.'));
        return;
      }
      console.log(chalk.bold('\nInstalled Plugins:\n'));
      for (const f of files) {
        console.log(`  ${chalk.cyan(f.replace(/\.(js|ts)$/, ''))}`);
      }
      console.log();
    });

  plugins
    .command('create <name>')
    .description('Create a new plugin template')
    .action((name: string) => {
      if (!existsSync(PLUGINS_DIR)) mkdirSync(PLUGINS_DIR, { recursive: true });
      const filePath = join(PLUGINS_DIR, `${name}.js`);
      const template = `// Callback webhook verification plugin: ${name}
// This plugin verifies incoming webhook signatures.

/**
 * @param {{ method: string, path: string, headers: Record<string, string>, body: string | null }} request
 * @param {string} secret - The webhook signing secret
 * @returns {{ valid: boolean, reason?: string }}
 */
module.exports.verify = function(request, secret) {
  // Implement your verification logic here
  // Example: check HMAC signature in headers
  return { valid: true, reason: 'Not yet implemented' };
};
`;
      writeFileSync(filePath, template);
      console.log(chalk.green(`Plugin template created: ${chalk.bold(filePath)}`));
    });
}
