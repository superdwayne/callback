import { spawn } from 'child_process';
import chalk from 'chalk';

let tunnelProcess: ReturnType<typeof spawn> | null = null;

export async function createTunnel(localPort: number): Promise<string> {
  // Try cloudflared first
  try {
    return await cloudflaredTunnel(localPort);
  } catch {
    // Fall back to SSH tunnel
    console.log(chalk.dim('  cloudflared not found, trying SSH tunnel...'));
    try {
      return await sshTunnel(localPort);
    } catch (err) {
      throw new Error(
        'No tunnel provider available. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/'
      );
    }
  }
}

async function cloudflaredTunnel(localPort: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${localPort}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    tunnelProcess = proc;
    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error('Tunnel timeout after 15s'));
    }, 15000);

    const handler = (data: Buffer) => {
      output += data.toString();
      // cloudflared outputs the URL to stderr
      const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[0]);
      }
    };

    proc.stdout.on('data', handler);
    proc.stderr.on('data', handler);

    proc.on('error', () => {
      clearTimeout(timeout);
      reject(new Error('cloudflared not installed'));
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0 && !output.includes('trycloudflare.com')) {
        reject(new Error(`cloudflared exited with code ${code}`));
      }
    });
  });
}

async function sshTunnel(localPort: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use serveo.net as a free SSH tunnel
    const proc = spawn('ssh', ['-R', `80:localhost:${localPort}`, '-o', 'StrictHostKeyChecking=no', 'serveo.net'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    tunnelProcess = proc;
    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error('SSH tunnel timeout'));
    }, 15000);

    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString();
      const match = output.match(/https?:\/\/[a-z0-9]+\.serveo\.net/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[0]);
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proc.on('error', () => {
      clearTimeout(timeout);
      reject(new Error('SSH not available'));
    });
  });
}

export function closeTunnel(): void {
  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
  }
}
