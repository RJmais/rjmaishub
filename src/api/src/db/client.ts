import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import type { Env } from '../index';

/**
 * Cliente por requisição — em Workers, sockets TCP NÃO sobrevivem entre
 * requisições; um cliente cacheado no isolate volta morto na requisição
 * seguinte (era a causa dos 503 alternados de 07/07). O pooling real fica
 * no Supavisor (transaction mode, porta 6543), que torna a conexão por
 * requisição barata.
 */
export function getDb(env: Env) {
  const client = postgres(env.DATABASE_URL, {
    prepare: false,      // Required for Supavisor / PgBouncer transaction mode
    max: 1,              // One connection per request-scoped client
    connect_timeout: 10, // Fail fast (never hang), with slack for cold handshakes
    idle_timeout: 20,    // Self-close if the runtime keeps the isolate alive
  });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof getDb>;
