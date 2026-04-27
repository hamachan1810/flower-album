import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { FlowerRaw, PhotoRaw } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const wishlist = await sql(`
      SELECT w.*, f.name, f.name_scientific, f.language, f.primary_emotions,
             f.scene_tags, f.season, f.birth_month, f.birth_day,
             f.habitat_description, f.source_culture, f.sentiment,
             f.compound_emotion, f.emotion_intensity, f.origin, f.source_culture_notes,
             f.created_at as flower_created_at
      FROM wishlist w
      JOIN flowers f ON w.flower_id = f.id
      WHERE w.is_captured = 0
      ORDER BY w.added_at DESC
    `) as unknown as (FlowerRaw & { flower_id: number; added_at: string; is_captured: number; flower_created_at: string })[];

    const result = await Promise.all(
      wishlist.map(async (item) => {
        const photos = await sql(
          'SELECT * FROM photos WHERE flower_id = $1 ORDER BY uploaded_at DESC',
          [item.flower_id]
        ) as unknown as PhotoRaw[];
        return {
          id: (item as unknown as { id: number }).id,
          flower_id: item.flower_id,
          added_at: item.added_at,
          is_captured: item.is_captured,
          flower: {
            id: item.flower_id,
            name: item.name,
            name_scientific: item.name_scientific,
            language: JSON.parse(item.language || '[]'),
            primary_emotions: JSON.parse(item.primary_emotions || '[]'),
            scene_tags: JSON.parse(item.scene_tags || '[]'),
            season: item.season,
            birth_month: item.birth_month,
            birth_day: item.birth_day,
            habitat_description: item.habitat_description,
            source_culture: item.source_culture,
            sentiment: item.sentiment,
            compound_emotion: item.compound_emotion,
            emotion_intensity: item.emotion_intensity,
            origin: item.origin,
            source_culture_notes: item.source_culture_notes,
            created_at: item.flower_created_at || '',
            photos: photos.map((p) => ({
              ...p,
              user_emotion_tags: JSON.parse(p.user_emotion_tags || '[]'),
            })),
          },
        };
      })
    );

    return NextResponse.json({ wishlist: result });
  } catch (error) {
    console.error('GET wishlist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flower_id } = body;

    if (!flower_id) {
      return NextResponse.json({ error: 'flower_id is required' }, { status: 400 });
    }

    // Check if already in wishlist
    const existing = await sql(
      'SELECT id FROM wishlist WHERE flower_id = $1 AND is_captured = 0',
      [flower_id]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Already in wishlist' }, { status: 409 });
    }

    const inserted = await sql(
      'INSERT INTO wishlist (flower_id) VALUES ($1) RETURNING *',
      [flower_id]
    );

    return NextResponse.json({ item: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('POST wishlist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
