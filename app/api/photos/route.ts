import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { PhotoRaw } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const flowerId = searchParams.get('flower_id');

    const db = getDb();
    let photos: PhotoRaw[];

    if (flowerId) {
      photos = db.prepare('SELECT * FROM photos WHERE flower_id = ? ORDER BY uploaded_at DESC').all(parseInt(flowerId)) as PhotoRaw[];
    } else {
      photos = db.prepare('SELECT * FROM photos ORDER BY uploaded_at DESC').all() as PhotoRaw[];
    }

    const parsed = photos.map((p) => ({
      ...p,
      user_emotion_tags: JSON.parse(p.user_emotion_tags || '[]'),
    }));

    return NextResponse.json({ photos: parsed });
  } catch (error) {
    console.error('GET photos error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
