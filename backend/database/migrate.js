import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../src/config/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FILES = [
  '001_initial.sql',
  '002_music.sql',
  '003_server_tags.sql',
  '004_voice_features.sql',
  '005_account_deletion.sql',
  '006_email_reports_mutes_automod.sql',
];

export async function migrate() {
  const client = await pool.connect();
  try {
    // Create tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query('SELECT name FROM _migrations');
    const applied = new Set(rows.map((r) => r.name));

    for (const file of FILES) {
      if (applied.has(file)) {
        console.log(`[migrate] Skipping (already applied): ${file}`);
        continue;
      }
      const sql = readFileSync(join(__dirname, 'migrations', file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      console.log(`[migrate] Applied: ${file}`);
    }

    console.log('[migrate] Done.');
  } finally {
    client.release();
  }
}

// Allow running directly: node database/migrate.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => pool.end())
    .catch((err) => { console.error('[migrate] Failed:', err); process.exit(1); });
}
