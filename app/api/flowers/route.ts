import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { FlowerRaw, PhotoRaw } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const emotion = searchParams.get('emotion');
    const season = searchParams.get('season');
    const sceneTag = searchParams.get('scene_tag');
    const sourceCulture = searchParams.get('source_culture');
    const birthMonth = searchParams.get('birth_month');

    const db = getDb();

    let query = 'SELECT * FROM flowers WHERE 1=1';
    const params: (string | number)[] = [];

    if (q) {
      query += ' AND (name LIKE ? OR name_scientific LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (emotion) {
      query += ' AND primary_emotions LIKE ?';
      params.push(`%${emotion}%`);
    }
    if (season) {
      query += ' AND season = ?';
      params.push(season);
    }
    if (sceneTag) {
      query += ' AND scene_tags LIKE ?';
      params.push(`%${sceneTag}%`);
    }
    if (sourceCulture) {
      query += ' AND source_culture LIKE ?';
      params.push(`%${sourceCulture}%`);
    }
    if (birthMonth) {
      query += ' AND birth_month = ?';
      params.push(parseInt(birthMonth));
    }

    query += ' ORDER BY created_at DESC';

    const flowers = db.prepare(query).all(...params) as FlowerRaw[];

    const result = flowers.map((f) => {
      const photos = db.prepare('SELECT * FROM photos WHERE flower_id = ? ORDER BY uploaded_at DESC').all(f.id) as PhotoRaw[];
      return {
        ...f,
        language: JSON.parse(f.language || '[]'),
        primary_emotions: JSON.parse(f.primary_emotions || '[]'),
        scene_tags: JSON.parse(f.scene_tags || '[]'),
        photos: photos.map((p) => ({
          ...p,
          user_emotion_tags: JSON.parse(p.user_emotion_tags || '[]'),
        })),
      };
    });

    return NextResponse.json({ flowers: result });
  } catch (error) {
    console.error('GET flowers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
