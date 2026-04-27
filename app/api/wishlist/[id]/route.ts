import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    const existing = await sql('SELECT id FROM wishlist WHERE id = $1', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 });
    }

    await sql('DELETE FROM wishlist WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE wishlist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
