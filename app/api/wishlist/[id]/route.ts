import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const db = getDb();

    const existing = db.prepare('SELECT id FROM wishlist WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM wishlist WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE wishlist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
