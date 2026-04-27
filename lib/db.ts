import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'flowers.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS flowers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_scientific TEXT,
      language TEXT DEFAULT '[]',
      origin TEXT,
      source_culture TEXT,
      source_culture_notes TEXT,
      birth_month INTEGER,
      birth_day INTEGER,
      season TEXT,
      primary_emotions TEXT DEFAULT '[]',
      compound_emotion TEXT,
      emotion_intensity TEXT,
      sentiment TEXT,
      scene_tags TEXT DEFAULT '[]',
      habitat_description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flower_id INTEGER NOT NULL REFERENCES flowers(id),
      file_path TEXT,
      is_wikimedia INTEGER DEFAULT 0,
      wikimedia_url TEXT,
      shot_date TEXT,
      shot_location TEXT,
      user_memo TEXT,
      user_emotion_tags TEXT DEFAULT '[]',
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flower_id INTEGER NOT NULL REFERENCES flowers(id),
      added_at TEXT DEFAULT (datetime('now')),
      is_captured INTEGER DEFAULT 0
    );
  `);

  return db;
}
