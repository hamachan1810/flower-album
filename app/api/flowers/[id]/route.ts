import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { FlowerRaw, PhotoRaw } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const db = getDb();

    const flower = db.prepare('SELECT * FROM flowers WHERE id = ?').get(id) as FlowerRaw | undefined;
    if (!flower) {
      return NextResponse.json({ error: 'Flower not found' }, { status: 404 });
    }

    const photos = db.prepare('SELECT * FROM photos WHERE flower_id = ? ORDER BY uploaded_at DESC').all(id) as PhotoRaw[];

    return NextResponse.json({
      flower: {
        ...flower,
        language: JSON.parse(flower.language || '[]'),
        primary_emotions: JSON.parse(flower.primary_emotions || '[]'),
        scene_tags: JSON.parse(flower.scene_tags || '[]'),
        photos: photos.map((p) => ({
          ...p,
          user_emotion_tags: JSON.parse(p.user_emotion_tags || '[]'),
        })),
      },
    });
  } catch (error) {
    console.error('GET flower error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const fields = [
      'name', 'name_scientific', 'origin', 'source_culture',
      'source_culture_notes', 'birth_month', 'birth_day',
      'season', 'compound_emotion', 'emotion_intensity', 'sentiment',
      'habitat_description'
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    const jsonFields = ['language', 'primary_emotions', 'scene_tags'];
    for (const field of jsonFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(JSON.stringify(body[field]));
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE flowers SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const flower = db.prepare('SELECT * FROM flowers WHERE id = ?').get(id) as FlowerRaw;
    return NextResponse.json({
      flower: {
        ...flower,
        language: JSON.parse(flower.language || '[]'),
        primary_emotions: JSON.parse(flower.primary_emotions || '[]'),
        scene_tags: JSON.parse(flower.scene_tags || '[]'),
      },
    });
  } catch (error) {
    console.error('PATCH flower error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
