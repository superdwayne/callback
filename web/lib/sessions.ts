const STORAGE_KEY = "callback_sessions";

export interface SavedSession {
  id: string;
  url: string;
  createdAt: number;
  expiresAt: number;
}

export function getSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const sessions: SavedSession[] = JSON.parse(raw);
    // Filter out expired sessions
    const now = Date.now();
    const active = sessions.filter((s) => s.expiresAt > now);
    // Persist the cleaned list
    if (active.length !== sessions.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
    }
    return active;
  } catch {
    return [];
  }
}

export function saveSession(session: SavedSession): void {
  if (typeof window === "undefined") return;
  const sessions = getSessions();
  // Don't duplicate
  if (sessions.some((s) => s.id === session.id)) return;
  sessions.unshift(session);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function removeSession(id: string): void {
  if (typeof window === "undefined") return;
  const sessions = getSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}
