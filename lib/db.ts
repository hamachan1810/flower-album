import { neon } from '@neondatabase/serverless';

// Lazy initialization: do not call neon() at module load time so that
// build-time environments without DATABASE_URL do not crash.
let _sql: ReturnType<typeof neon> | null = null;
function getClient() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

export const sql = (query: string, params?: unknown[]) =>
  getClient().query(query, params) as Promise<Record<string, unknown>[]>;
