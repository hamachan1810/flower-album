import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { FlowerRaw, PhotoRaw } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    const flowers = await sql('SELECT * FROM flowers WHERE id = $1', [id]) as unknown as FlowerRaw[];
    const flower = flowers[0];
    if (!flower) {
      return NextResponse.json({ error: 'Flower not found' }, { status: 404 });
    }

    const photos = await sql(
      'SELECT * FROM photos WHERE flower_id = $1 ORDER BY uploaded_at DESC',
      [id]
    ) as unknown as PhotoRaw[];

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

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields = [
      'name', 'name_scientific', 'origin', 'source_culture',
      'source_culture_notes', 'birth_month', 'birth_day',
      'season', 'compound_emotion', 'emotion_intensity', 'sentiment',
      'habitat_description',
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    const jsonFields = ['language', 'primary_emotions', 'scene_tags'];
    for (const field of jsonFields) {
      if (body[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(JSON.stringify(body[field]));
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    values.push(id);
    await sql(
      `UPDATE flowers SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    const flowers = await sql('SELECT * FROM flowers WHERE id = $1', [id]) as unknown as FlowerRaw[];
    const flower = flowers[0];
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
