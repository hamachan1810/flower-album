import { neon } from '@neondatabase/serverless';

// neon() supports both tagged template literals and function call syntax.
// We cast to allow the string + params overload used throughout this app.
const _sql = neon(process.env.DATABASE_URL!);

export const sql = _sql as unknown as (
  query: string,
  params?: unknown[]
) => Promise<Record<string, unknown>[]>;
