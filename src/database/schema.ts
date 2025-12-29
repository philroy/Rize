import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  session_id?: string;
}

export interface Memory {
  id: number;
  type: 'fact' | 'preference' | 'emotion' | 'event';
  content: string;
  importance: number;
  timestamp: number;
  related_messages?: string;
}

export interface UserProfile {
  key: string;
  value: string;
  updated_at: number;
}

export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(__dirname, '../../rize.db');
    this.db = new Database(path);
    this.initialize();
  }

  private initialize() {
    // Messages table - conversation history
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        session_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    `);

    // Memories table - extracted knowledge about user
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('fact', 'preference', 'emotion', 'event')),
        content TEXT NOT NULL,
        importance INTEGER DEFAULT 5 CHECK(importance BETWEEN 1 AND 10),
        timestamp INTEGER NOT NULL,
        related_messages TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
    `);

    // User profile - key-value store for user data
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_profile (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  // Message operations
  addMessage(role: 'user' | 'assistant', content: string, sessionId?: string): number {
    const stmt = this.db.prepare(
      'INSERT INTO messages (role, content, timestamp, session_id) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(role, content, Date.now(), sessionId);
    return result.lastInsertRowid as number;
  }

  getRecentMessages(limit: number = 20): Message[] {
    const stmt = this.db.prepare(
      'SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?'
    );
    return stmt.all(limit) as Message[];
  }

  getMessagesBySession(sessionId: string): Message[] {
    const stmt = this.db.prepare(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC'
    );
    return stmt.all(sessionId) as Message[];
  }

  // Memory operations
  addMemory(type: Memory['type'], content: string, importance: number = 5, relatedMessages?: string): number {
    const stmt = this.db.prepare(
      'INSERT INTO memories (type, content, importance, timestamp, related_messages) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(type, content, importance, Date.now(), relatedMessages);
    return result.lastInsertRowid as number;
  }

  getMemories(type?: Memory['type'], limit?: number): Memory[] {
    if (type) {
      const stmt = this.db.prepare(
        `SELECT * FROM memories WHERE type = ? ORDER BY importance DESC, timestamp DESC ${limit ? 'LIMIT ?' : ''}`
      );
      return (limit ? stmt.all(type, limit) : stmt.all(type)) as Memory[];
    } else {
      const stmt = this.db.prepare(
        `SELECT * FROM memories ORDER BY importance DESC, timestamp DESC ${limit ? 'LIMIT ?' : ''}`
      );
      return (limit ? stmt.all(limit) : stmt.all()) as Memory[];
    }
  }

  searchMemories(query: string): Memory[] {
    const stmt = this.db.prepare(
      'SELECT * FROM memories WHERE content LIKE ? ORDER BY importance DESC, timestamp DESC'
    );
    return stmt.all(`%${query}%`) as Memory[];
  }

  // User profile operations
  setUserProfile(key: string, value: string): void {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO user_profile (key, value, updated_at) VALUES (?, ?, ?)'
    );
    stmt.run(key, value, Date.now());
  }

  getUserProfile(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM user_profile WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value || null;
  }

  getAllUserProfile(): Record<string, string> {
    const stmt = this.db.prepare('SELECT key, value FROM user_profile');
    const rows = stmt.all() as { key: string; value: string }[];
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);
  }

  close(): void {
    this.db.close();
  }
}
