import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { secret } = await request.json();
  if (secret !== 'flower-reset-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await sql('TRUNCATE TABLE wishlist, photos, flowers RESTART IDENTITY CASCADE', []);

    const flowers = await sql('SELECT COUNT(*) as count FROM flowers', []);
    const photos = await sql('SELECT COUNT(*) as count FROM photos', []);
    const wishlist = await sql('SELECT COUNT(*) as count FROM wishlist', []);

    return NextResponse.json({
      success: true,
      remaining: {
        flowers: flowers[0]?.count,
        photos: photos[0]?.count,
        wishlist: wishlist[0]?.count,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const countResult = await sql('SELECT COUNT(*) as count FROM flowers', []);
  const selectResult = await sql('SELECT id, name FROM flowers ORDER BY id', []);
  const dbUrl = process.env.DATABASE_URL || '';
  const hostMatch = dbUrl.match(/@([^/?]+)/);
  const dbName = dbUrl.split('/').pop()?.split('?')[0];
  return NextResponse.json({
    count: countResult[0]?.count,
    rows: selectResult,
    db_host: hostMatch ? hostMatch[1] : 'unknown',
    db_name: dbName,
  });
}
