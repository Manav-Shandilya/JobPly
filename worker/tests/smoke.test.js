import { describe, it, expect, afterEach } from 'vitest';
import { createD1Mock } from './helpers/d1Mock.js';

describe('Worker test setup smoke test', () => {
  let db;
  let close;

  afterEach(() => {
    if (close) close();
  });

  it('should run a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should create a D1 mock with schema', () => {
    ({ db, close } = createD1Mock());
    expect(db).toBeDefined();
    expect(typeof db.prepare).toBe('function');
    expect(typeof db.batch).toBe('function');
    expect(typeof db.exec).toBe('function');
  });

  it('should insert and query data via D1 mock', () => {
    ({ db, close } = createD1Mock());

    // Insert a user
    const insertResult = db
      .prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
      .bind('test@example.com', 'hashed_pw', 'Test User')
      .run();

    expect(insertResult.success).toBe(true);
    expect(insertResult.meta.changes).toBe(1);

    // Query the user back
    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind('test@example.com')
      .first();

    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
  });

  it('should query all rows via D1 mock', () => {
    ({ db, close } = createD1Mock());

    db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
      .bind('a@test.com', 'hash1', 'Alice')
      .run();
    db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
      .bind('b@test.com', 'hash2', 'Bob')
      .run();

    const result = db.prepare('SELECT * FROM users').bind().all();

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
  });

  it('should support batch operations', () => {
    ({ db, close } = createD1Mock());

    const results = db.batch([
      db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').bind('x@test.com', 'hash', 'X'),
      db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').bind('y@test.com', 'hash', 'Y'),
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);

    const allUsers = db.prepare('SELECT * FROM users').bind().all();
    expect(allUsers.results).toHaveLength(2);
  });
});
