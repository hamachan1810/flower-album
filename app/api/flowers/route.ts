import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
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

    let query = 'SELECT * FROM flowers WHERE 1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (q) {
      query += ` AND (name LIKE $${paramIndex} OR name_scientific LIKE $${paramIndex + 1})`;
      params.push(`%${q}%`, `%${q}%`);
      paramIndex += 2;
    }
    if (emotion) {
      query += ` AND primary_emotions LIKE $${paramIndex}`;
      params.push(`%${emotion}%`);
      paramIndex++;
    }
    if (season) {
      query += ` AND season = $${paramIndex}`;
      params.push(season);
      paramIndex++;
    }
    if (sceneTag) {
      query += ` AND scene_tags LIKE $${paramIndex}`;
      params.push(`%${sceneTag}%`);
      paramIndex++;
    }
    if (sourceCulture) {
      query += ` AND source_culture LIKE $${paramIndex}`;
      params.push(`%${sourceCulture}%`);
      paramIndex++;
    }
    if (birthMonth) {
      query += ` AND birth_month = $${paramIndex}`;
      params.push(parseInt(birthMonth));
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const flowers = await sql(query, params) as unknown as FlowerRaw[];

    const result = [];
    for (const f of flowers) {
      const photos = await sql(
        'SELECT * FROM photos WHERE flower_id = $1 ORDER BY uploaded_at DESC',
        [f.id]
      ) as unknown as PhotoRaw[];

      const language = Array.isArray(f.language) ? f.language : JSON.parse(f.language || '[]');
      const primary_emotions = Array.isArray(f.primary_emotions) ? f.primary_emotions : JSON.parse(f.primary_emotions || '[]');
      const scene_tags = Array.isArray(f.scene_tags) ? f.scene_tags : JSON.parse(f.scene_tags || '[]');

      result.push({
        ...f,
        language,
        primary_emotions,
        scene_tags,
        photos: photos.map((p) => ({
          ...p,
          user_emotion_tags: Array.isArray(p.user_emotion_tags) ? p.user_emotion_tags : JSON.parse(p.user_emotion_tags || '[]'),
        })),
      });
    }

    return NextResponse.json({ flowers: result }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('GET flowers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
