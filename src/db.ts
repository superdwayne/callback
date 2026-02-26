import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CallbackSession, CapturedRequest } from './types.js';

const CALLBACK_HOME = join(homedir(), '.callback');
const SESSIONS_DIR = join(CALLBACK_HOME, 'sessions');
const DB_PATH = join(CALLBACK_HOME, 'callback.db');

export function ensureCallbackHome(): void {
  if (!existsSync(CALLBACK_HOME)) mkdirSync(CALLBACK_HOME, { recursive: true });
  if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });
}

export function getDb(): Database.Database {
  ensureCallbackHome();
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_port INTEGER NOT NULL,
      proxy_port INTEGER NOT NULL,
      url TEXT NOT NULL,
      public_url TEXT,
      https INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      headers TEXT NOT NULL DEFAULT '{}',
      query TEXT NOT NULL DEFAULT '{}',
      body TEXT,
      response_status INTEGER NOT NULL DEFAULT 200,
      response_time REAL NOT NULL DEFAULT 0,
      verification_status TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_requests_session ON requests(session_id);
    CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
  `);

  return db;
}

export function createSession(db: Database.Database, session: CallbackSession): void {
  db.prepare(`
    INSERT INTO sessions (id, name, target_port, proxy_port, url, public_url, https, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    session.id, session.name, session.targetPort, session.proxyPort,
    session.url, session.publicUrl ?? null, session.https ? 1 : 0, session.createdAt
  );
}

export function endSession(db: Database.Database, sessionId: string): void {
  db.prepare(`UPDATE sessions SET ended_at = datetime('now') WHERE id = ?`).run(sessionId);
}

export function getSessions(db: Database.Database): CallbackSession[] {
  const rows = db.prepare(`SELECT * FROM sessions ORDER BY created_at DESC`).all() as any[];
  return rows.map(rowToSession);
}

export function getSession(db: Database.Database, sessionId: string): CallbackSession | null {
  const row = db.prepare(`SELECT * FROM sessions WHERE id = ? OR name = ?`).get(sessionId, sessionId) as any;
  return row ? rowToSession(row) : null;
}

export function logRequest(db: Database.Database, req: CapturedRequest): void {
  db.prepare(`
    INSERT INTO requests (id, session_id, timestamp, method, path, headers, query, body, response_status, response_time, verification_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.id, req.sessionId, req.timestamp, req.method, req.path,
    JSON.stringify(req.headers), JSON.stringify(req.query), req.body,
    req.responseStatus, req.responseTime, req.verificationStatus ?? null
  );
}

export function getRequests(db: Database.Database, sessionId: string): CapturedRequest[] {
  const rows = db.prepare(`
    SELECT * FROM requests WHERE session_id = ? ORDER BY timestamp ASC
  `).all(sessionId) as any[];
  return rows.map(rowToRequest);
}

export function getRequest(db: Database.Database, sessionId: string, requestId: string): CapturedRequest | null {
  const row = db.prepare(`
    SELECT * FROM requests WHERE session_id = ? AND id = ?
  `).get(sessionId, requestId) as any;
  return row ? rowToRequest(row) : null;
}

function rowToSession(row: any): CallbackSession {
  return {
    id: row.id,
    name: row.name,
    targetPort: row.target_port,
    proxyPort: row.proxy_port,
    url: row.url,
    publicUrl: row.public_url ?? undefined,
    https: !!row.https,
    createdAt: row.created_at,
    endedAt: row.ended_at ?? undefined,
  };
}

function rowToRequest(row: any): CapturedRequest {
  return {
    id: row.id,
    sessionId: row.session_id,
    timestamp: row.timestamp,
    method: row.method,
    path: row.path,
    headers: JSON.parse(row.headers),
    query: JSON.parse(row.query),
    body: row.body,
    responseStatus: row.response_status,
    responseTime: row.response_time,
    verificationStatus: row.verification_status ?? null,
  };
}
