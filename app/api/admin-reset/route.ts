import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { secret } = await request.json();
  if (secret !== 'flower-reset-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await sql('DELETE FROM wishlist', []);
    await sql('DELETE FROM photos', []);
    await sql('DELETE FROM flowers', []);

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
  const flowers = await sql('SELECT COUNT(*) as count FROM flowers', []);
  const photos = await sql('SELECT COUNT(*) as count FROM photos', []);
  return NextResponse.json({
    flowers: flowers[0]?.count,
    photos: photos[0]?.count,
  });
}
