import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Creates an in-memory SQLite database that mimics the Cloudflare D1 API interface.
 *
 * Supports:
 * - prepare(sql).bind(...params).run()
 * - prepare(sql).bind(...params).first()
 * - prepare(sql).bind(...params).all()
 * - batch(stmts) — executes an array of prepared statements in a transaction
 *
 * @param {object} [options]
 * @param {boolean} [options.applySchema=true] - Whether to apply schema.sql on creation
 * @returns {{ db: object, close: () => void }} D1-compatible mock and cleanup function
 */
export function createD1Mock(options = {}) {
  const { applySchema = true } = options;
  const sqlite = new Database(':memory:');

  // Enable WAL mode and foreign keys like D1
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  if (applySchema) {
    const schemaPath = resolve(import.meta.dirname, '../../schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    sqlite.exec(schema);
  }

  /**
   * Creates a D1-compatible prepared statement wrapper.
   */
  function prepare(sql) {
    let boundParams = [];

    const stmt = {
      bind(...params) {
        boundParams = params;
        return stmt;
      },

      run() {
        const prepared = sqlite.prepare(sql);
        const info = prepared.run(...boundParams);
        return {
          success: true,
          meta: {
            changes: info.changes,
            last_row_id: info.lastInsertRowid,
            duration: 0,
          },
        };
      },

      first(columnName) {
        const prepared = sqlite.prepare(sql);
        const row = prepared.get(...boundParams);
        if (!row) return null;
        if (columnName) return row[columnName];
        return row;
      },

      all() {
        const prepared = sqlite.prepare(sql);
        const rows = prepared.all(...boundParams);
        return {
          success: true,
          results: rows,
          meta: {
            duration: 0,
          },
        };
      },
    };

    return stmt;
  }

  /**
   * Executes an array of prepared statements in a transaction, matching D1's batch API.
   */
  function batch(stmts) {
    const transaction = sqlite.transaction(() => {
      return stmts.map((s) => {
        // Each stmt is expected to already be bound — call .run(), .first(), or .all()
        // D1 batch expects each to return a result, so we default to .run()
        if (typeof s.run === 'function') {
          return s.run();
        }
        return s;
      });
    });
    return transaction();
  }

  /**
   * Execute raw SQL (useful for schema setup). Mimics D1's exec method.
   */
  function exec(sql) {
    sqlite.exec(sql);
    return { success: true };
  }

  const db = {
    prepare,
    batch,
    exec,
  };

  function close() {
    sqlite.close();
  }

  return { db, close };
}
