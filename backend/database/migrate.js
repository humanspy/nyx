import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../src/config/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    const files = ['001_initial.sql', '002_music.sql', '003_server_tags.sql', '004_voice_features.sql', '005_account_deletion.sql', '006_email_reports_mutes_automod.sql'];
    for (const file of files) {
      const sql = readFileSync(join(__dirname, 'migrations', file), 'utf8');
      await client.query(sql);
      console.log(`  Applied: ${file}`);
    }
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
