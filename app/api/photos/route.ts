import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { PhotoRaw } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const flowerId = searchParams.get('flower_id');

    let photos: PhotoRaw[];

    if (flowerId) {
      photos = await sql(
        'SELECT * FROM photos WHERE flower_id = $1 ORDER BY uploaded_at DESC',
        [parseInt(flowerId)]
      ) as unknown as PhotoRaw[];
    } else {
      photos = await sql(
        'SELECT * FROM photos ORDER BY uploaded_at DESC'
      ) as unknown as PhotoRaw[];
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
