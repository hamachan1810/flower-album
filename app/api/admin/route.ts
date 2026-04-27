import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

const SECRET = 'flower-admin-2026';

function getDb() {
  const url = process.env.DATABASE_URL!;
  return { sql: neon(url), url };
}

function sanitizeUrl(url: string) {
  // Only expose host and db name, hide credentials
  const hostMatch = url.match(/@([^/?]+)/);
  const dbName = url.split('/').pop()?.split('?')[0];
  return {
    host: hostMatch?.[1] ?? 'unknown',
    db: dbName ?? 'unknown',
  };
}

// GET /api/admin?secret=flower-admin-2026
// Shows current DB state with flower list and created_at
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sql, url } = getDb();
  const conn = sanitizeUrl(url);

  const flowerRows = await sql`SELECT id, name, created_at FROM flowers ORDER BY id`;
  const photoRows = await sql`SELECT COUNT(*)::int AS cnt FROM photos`;
  const wishlistRows = await sql`SELECT COUNT(*)::int AS cnt FROM wishlist`;

  return NextResponse.json({
    db_host: conn.host,
    db_name: conn.db,
    flower_count: flowerRows.length,
    photo_count: photoRows[0]?.cnt ?? 0,
    wishlist_count: wishlistRows[0]?.cnt ?? 0,
    flowers: flowerRows,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/admin  body: { secret: "flower-admin-2026" }
// Deletes all data and confirms with before/after counts
export async function POST(request: NextRequest) {
  const { secret } = await request.json();
  if (secret !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sql, url } = getDb();
  const conn = sanitizeUrl(url);

  // Before counts
  const beforeFlowers = await sql`SELECT COUNT(*)::int AS cnt FROM flowers`;
  const beforePhotos = await sql`SELECT COUNT(*)::int AS cnt FROM photos`;

  // DELETE in dependency order (not TRUNCATE – avoids pooler compatibility issues)
  await sql`DELETE FROM wishlist`;
  await sql`DELETE FROM photos`;
  await sql`DELETE FROM flowers`;

  // Reset auto-increment sequences
  await sql`ALTER SEQUENCE IF EXISTS flowers_id_seq RESTART WITH 1`;
  await sql`ALTER SEQUENCE IF EXISTS photos_id_seq RESTART WITH 1`;
  await sql`ALTER SEQUENCE IF EXISTS wishlist_id_seq RESTART WITH 1`;

  // After counts – confirm from same connection
  const afterFlowers = await sql`SELECT COUNT(*)::int AS cnt FROM flowers`;
  const afterPhotos = await sql`SELECT COUNT(*)::int AS cnt FROM photos`;

  return NextResponse.json({
    db_host: conn.host,
    db_name: conn.db,
    before: { flowers: beforeFlowers[0]?.cnt, photos: beforePhotos[0]?.cnt },
    after: { flowers: afterFlowers[0]?.cnt, photos: afterPhotos[0]?.cnt },
    success: afterFlowers[0]?.cnt === 0,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
