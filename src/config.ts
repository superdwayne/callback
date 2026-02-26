import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CallbackConfig } from './types.js';

const GLOBAL_CONFIG = join(homedir(), '.callback', 'config.json');
const LOCAL_CONFIG = '.callbackrc.json';

export function loadConfig(): CallbackConfig {
  const globalCfg = loadFile(GLOBAL_CONFIG);
  const localCfg = loadFile(join(process.cwd(), LOCAL_CONFIG));
  return { ...globalCfg, ...localCfg };
}

export function createLocalConfig(): string {
  const path = join(process.cwd(), LOCAL_CONFIG);
  const defaultConfig: CallbackConfig = {
    defaultPort: 3000,
    mode: 'local',
    https: false,
  };
  writeFileSync(path, JSON.stringify(defaultConfig, null, 2) + '\n');
  return path;
}

function loadFile(path: string): Partial<CallbackConfig> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return {};
  }
}
