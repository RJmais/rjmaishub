import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import type { Env } from '../index';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _cachedUrl: string | null = null;

export function getDb(env: Env) {
  if (!_db || _cachedUrl !== env.DATABASE_URL) {
    const client = postgres(env.DATABASE_URL, {
      prepare: false,     // Required for Supabase PgBouncer / transaction pooler
      max: 1,             // Workers have many short-lived isolates — keep pool minimal
      connect_timeout: 5, // Fail fast: unreachable DB must throw, never hang the request
    });
    _db = drizzle(client, { schema });
    _cachedUrl = env.DATABASE_URL;
  }
  return _db;
}

export type Db = ReturnType<typeof getDb>;
