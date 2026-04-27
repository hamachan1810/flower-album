import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { PhotoRaw } from '@/lib/types';
import { del } from '@vercel/blob';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.shot_date !== undefined) {
      setClauses.push(`shot_date = $${paramIndex}`);
      values.push(body.shot_date);
      paramIndex++;
    }
    if (body.shot_location !== undefined) {
      setClauses.push(`shot_location = $${paramIndex}`);
      values.push(body.shot_location);
      paramIndex++;
    }
    if (body.user_memo !== undefined) {
      setClauses.push(`user_memo = $${paramIndex}`);
      values.push(body.user_memo);
      paramIndex++;
    }
    if (body.user_emotion_tags !== undefined) {
      setClauses.push(`user_emotion_tags = $${paramIndex}`);
      values.push(JSON.stringify(body.user_emotion_tags));
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    values.push(id);
    await sql(
      `UPDATE photos SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    const photos = await sql('SELECT * FROM photos WHERE id = $1', [id]) as unknown as PhotoRaw[];
    const photo = photos[0];
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    const photos = await sql('SELECT * FROM photos WHERE id = $1', [id]) as unknown as PhotoRaw[];
    const photo = photos[0];
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Delete from Vercel Blob if it's our upload
    if (photo.file_path && photo.file_path.includes('blob.vercel-storage.com')) {
      try {
        await del(photo.file_path, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch {
        // Blob削除失敗は無視してDB削除を続行
      }
    }

    await sql('DELETE FROM photos WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
