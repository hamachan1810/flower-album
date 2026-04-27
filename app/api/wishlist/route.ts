import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { FlowerRaw, PhotoRaw } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const wishlist = db.prepare(`
      SELECT w.*, f.name, f.name_scientific, f.language, f.primary_emotions,
             f.scene_tags, f.season, f.birth_month, f.birth_day,
             f.habitat_description, f.source_culture, f.sentiment,
             f.compound_emotion, f.emotion_intensity, f.origin, f.source_culture_notes
      FROM wishlist w
      JOIN flowers f ON w.flower_id = f.id
      WHERE w.is_captured = 0
      ORDER BY w.added_at DESC
    `).all() as (FlowerRaw & { flower_id: number; added_at: string; is_captured: number })[];

    const result = wishlist.map((item) => {
      const photos = db.prepare('SELECT * FROM photos WHERE flower_id = ? ORDER BY uploaded_at DESC').all(item.flower_id) as PhotoRaw[];
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
          created_at: item.created_at || '',
          photos: photos.map((p) => ({
            ...p,
            user_emotion_tags: JSON.parse(p.user_emotion_tags || '[]'),
          })),
        },
      };
    });

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

    const db = getDb();

    // Check if already in wishlist
    const existing = db.prepare('SELECT id FROM wishlist WHERE flower_id = ? AND is_captured = 0').get(flower_id);
    if (existing) {
      return NextResponse.json({ error: 'Already in wishlist' }, { status: 409 });
    }

    const info = db.prepare('INSERT INTO wishlist (flower_id) VALUES (?)').run(flower_id);
    const item = db.prepare('SELECT * FROM wishlist WHERE id = ?').get(info.lastInsertRowid);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('POST wishlist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
