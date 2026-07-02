import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Define DB_PATH
const DB_PATH: string = process.env.DB_PATH || path.join(process.cwd(), 'data', 'legendin.db');

// Ensure the database directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Read and execute schema
const schemaPath = path.join(process.cwd(), 'src', 'server', 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

// Export database instance
export { db };

// Export entity queries
function getAllUsers(): any[] {
  return db.all('SELECT * FROM users').map((user: any) => ({
    ...user,
    skills: JSON.parse(user.skills_json) || [],
    certifications: JSON.parse(user.certifications_json) || []
  }));
}

function getUserById(id: string): any | null {
  const user: any = db.get('SELECT * FROM users WHERE id = ?', [id]);
  return user ? {
    ...user,
    skills: JSON.parse(user.skills_json) || [],
    certifications: JSON.parse(user.certifications_json) || []
  } : null;
}

function getAllPosts(): any[] {
  return db.all('SELECT * FROM posts').map((post: any) => ({
    ...post,
    liked_by: JSON.parse(post.liked_by_json) || []
  }));
}

function getPostById(id: string): any | null {
  const post: any = db.get('SELECT * FROM posts WHERE id = ?', [id]);
  return post ? {
    ...post,
    liked_by: JSON.parse(post.liked_by_json) || []
  } : null;
}

export { getAllUsers, getUserById, getAllPosts, getPostById };