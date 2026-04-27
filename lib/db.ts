import { neon } from '@neondatabase/serverless';

const _sql = neon(process.env.DATABASE_URL!);

// Use sql.query() for conventional parameterized queries ($1, $2, ...)
export const sql = (query: string, params?: unknown[]) =>
  _sql.query(query, params) as Promise<Record<string, unknown>[]>;
