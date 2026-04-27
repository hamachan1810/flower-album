import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const flowers = await sql('SELECT id, name FROM flowers ORDER BY id', []);
    return NextResponse.json({ count: flowers.length, type: typeof flowers, isArray: Array.isArray(flowers), flowers });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
