import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import selfsigned from 'selfsigned';
import chalk from 'chalk';

const CERTS_DIR = join(homedir(), '.callback', 'certs');
const KEY_PATH = join(CERTS_DIR, 'localhost.key');
const CERT_PATH = join(CERTS_DIR, 'localhost.cert');

export async function generateCert(): Promise<{ key: string; cert: string }> {
  if (existsSync(KEY_PATH) && existsSync(CERT_PATH)) {
    return {
      key: readFileSync(KEY_PATH, 'utf-8'),
      cert: readFileSync(CERT_PATH, 'utf-8'),
    };
  }

  if (!existsSync(CERTS_DIR)) mkdirSync(CERTS_DIR, { recursive: true });

  console.log(chalk.dim('  Generating self-signed certificate...'));

  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = await selfsigned.generate(attrs, {
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      { name: 'subjectAltName', altNames: [
        { type: 2, value: 'localhost' },
        { type: 2, value: '*.localhost' },
        { type: 7, ip: '127.0.0.1' },
      ]},
    ],
  });

  writeFileSync(KEY_PATH, pems.private);
  writeFileSync(CERT_PATH, pems.cert);

  console.log(chalk.yellow('  Warning: Using self-signed certificate. To trust it:'));
  console.log(chalk.dim(`    macOS: security add-trusted-cert -p ssl "${CERT_PATH}"`));
  console.log(chalk.dim(`    Linux: cp "${CERT_PATH}" /usr/local/share/ca-certificates/ && update-ca-certificates`));

  return { key: pems.private, cert: pems.cert };
}
