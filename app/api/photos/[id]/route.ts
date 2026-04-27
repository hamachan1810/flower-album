import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { PhotoRaw } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const db = getDb();

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (body.shot_date !== undefined) {
      updates.push('shot_date = ?');
      values.push(body.shot_date);
    }
    if (body.shot_location !== undefined) {
      updates.push('shot_location = ?');
      values.push(body.shot_location);
    }
    if (body.user_memo !== undefined) {
      updates.push('user_memo = ?');
      values.push(body.user_memo);
    }
    if (body.user_emotion_tags !== undefined) {
      updates.push('user_emotion_tags = ?');
      values.push(JSON.stringify(body.user_emotion_tags));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE photos SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(id) as PhotoRaw;
    return NextResponse.json({
      photo: {
        ...photo,
        user_emotion_tags: JSON.parse(photo.user_emotion_tags || '[]'),
      },
    });
  } catch (error) {
    console.error('PATCH photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
