import { Command } from 'commander';

export function listenCommand(program: Command): void {
  program
    .command('listen <port>')
    .description('Start a callback URL listener forwarding to localhost:<port>')
    .option('--name <name>', 'Custom subdomain name')
    .option('--public', 'Create a publicly accessible URL')
    .option('--local', 'Force local-only mode')
    .option('--https', 'Enable HTTPS')
    .option('--quiet', 'Disable TUI, output one line per request')
    .option('--team', 'Enable team collaboration mode')
    .option('--verify <provider>', 'Enable webhook signature verification')
    .option('--secret <secret>', 'Webhook signing secret')
    .option('--route <routes...>', 'Route paths to ports (e.g., /stripe:3001)')
    .action(async (port: string, options) => {
      const { startListener } = await import('../proxy.js');
      await startListener(parseInt(port, 10), options);
    });
}
