import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from './config';

export const pool = new Pool(config.db);

export async function initDatabase(): Promise<void> {
  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(schema);
  console.log('Database schema initialized');
}
