import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@/lib/db';
import { FlowerRaw, PhotoRaw } from '@/lib/types';
import { put } from '@vercel/blob';

export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ANALYZE_PROMPT = `この花の写真を分析し、以下をJSON形式のみで返してください（前置き・説明文は不要）。

{
  "name": "和名",
  "name_scientific": "学名",
  "language": ["花言葉1", "花言葉2"],
  "origin": "花言葉の由来",
  "source_culture": "出典文化圏",
  "source_culture_notes": "他の文化圏での違いがあれば記載",
  "birth_month": 月(数値),
  "birth_day": 日(数値),
  "season": "春/夏/秋/冬",
  "primary_emotions": ["joy"など1〜3個"],
  "compound_emotion": "love"など / null,
  "emotion_intensity": "strong/medium/soft",
  "sentiment": "positive/negative/neutral",
  "scene_tags": ["告白"など],
  "habitat_description": "どんな場所で見つけやすいか（住宅街の植え込み・川沿いの土手・山の日陰など、日常の散歩で出会える環境を具体的に）"
}

【重要ルール】
- 感情分類は花言葉の「文字通りの直接的な意味」で判断し、連想・象徴では判断しないこと
- 複数の文化圏で異なる花言葉がある場合は代表的なものを主とし、差異をsource_culture_notesに記載
- 不確かな情報は推測せず "unknown" とすること`;

function parseJsonSafe(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const mediaType = (file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') || 'image/jpeg';

      // Upload to Vercel Blob
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `uploads/${timestamp}-${random}.${ext}`;

      let publicPath = '';
      try {
        const blob = await put(filename, buffer, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        publicPath = blob.url;
      } catch (err) {
        console.error('Blob upload error:', err);
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
      }

      // Analyze with Anthropic
      let analysisResult: Record<string, unknown> | null = null;
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64,
                  },
                },
                {
                  type: 'text',
                  text: ANALYZE_PROMPT,
                },
              ],
            },
          ],
        });

        const textContent = response.content.find((c) => c.type === 'text');
        if (textContent && textContent.type === 'text') {
          analysisResult = parseJsonSafe(textContent.text);
        }
      } catch (err) {
        console.error('Anthropic API error:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        results.push({ error: `Anthropic error: ${errMsg}`, file_path: publicPath });
        continue;
      }

      if (!analysisResult) {
        results.push({ error: 'Failed to parse analysis result', file_path: publicPath });
        continue;
      }

      // Check if flower already exists
      const existingFlowers = await sql(
        'SELECT * FROM flowers WHERE name = $1',
        [analysisResult.name as string]
      ) as unknown as FlowerRaw[];
      let flower = existingFlowers[0];

      if (!flower) {
        const inserted = await sql(
          `INSERT INTO flowers (name, name_scientific, language, origin, source_culture, source_culture_notes,
            birth_month, birth_day, season, primary_emotions, compound_emotion, emotion_intensity,
            sentiment, scene_tags, habitat_description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *`,
          [
            analysisResult.name as string,
            (analysisResult.name_scientific as string) || null,
            JSON.stringify(analysisResult.language || []),
            (analysisResult.origin as string) || null,
            (analysisResult.source_culture as string) || null,
            (analysisResult.source_culture_notes as string) || null,
            (analysisResult.birth_month as number) || null,
            (analysisResult.birth_day as number) || null,
            (analysisResult.season as string) || null,
            JSON.stringify(analysisResult.primary_emotions || []),
            (analysisResult.compound_emotion as string) || null,
            (analysisResult.emotion_intensity as string) || null,
            (analysisResult.sentiment as string) || null,
            JSON.stringify(analysisResult.scene_tags || []),
            (analysisResult.habitat_description as string) || null,
          ]
        ) as unknown as FlowerRaw[];
        flower = inserted[0];
      }

      // Create photo record
      const photoInserted = await sql(
        `INSERT INTO photos (flower_id, file_path, is_wikimedia)
         VALUES ($1, $2, 0) RETURNING *`,
        [flower.id, publicPath]
      ) as unknown as PhotoRaw[];
      const photo = photoInserted[0];

      // Mark wishlist as captured if exists
      await sql(
        'UPDATE wishlist SET is_captured = 1 WHERE flower_id = $1',
        [flower.id]
      );

      results.push({
        flower: {
          ...flower,
          language: JSON.parse(flower.language || '[]'),
          primary_emotions: JSON.parse(flower.primary_emotions || '[]'),
          scene_tags: JSON.parse(flower.scene_tags || '[]'),
        },
        photo: {
          ...photo,
          user_emotion_tags: JSON.parse(photo.user_emotion_tags || '[]'),
        },
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Analyze error:', error);
    const errMsg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return NextResponse.json({ error: `Internal server error: ${errMsg}` }, { status: 500 });
  }
}
