import Database from 'better-sqlite3';
import { DB_PATH } from './graphDb.js';

export function initUserSchema(reset = false) {
  const db = new Database(DB_PATH);
  if (reset) {
    db.exec('DROP TABLE IF EXISTS users');
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      roll_no TEXT UNIQUE NOT NULL,
      year TEXT,
      branch TEXT,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.close();
}

export function registerUser(userData) {
  const db = new Database(DB_PATH);
  const id = 'user_' + Date.now();
  
  try {
    const stmt = db.prepare(`
      INSERT INTO users (id, name, email, roll_no, year, branch, password) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, userData.name || '', userData.email || '', userData.roll_no, userData.year || '', userData.branch || '', userData.password);
    db.close();
    return {
      id,
      name: userData.name,
      year: userData.year,
      branch: userData.branch
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

export function loginUser(roll_no, password) {
  const db = new Database(DB_PATH, { readonly: true });
  const user = db.prepare('SELECT * FROM users WHERE roll_no = ?').get(roll_no);
  db.close();

  if (!user || user.password !== password) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    year: user.year,
    branch: user.branch
  };
}
