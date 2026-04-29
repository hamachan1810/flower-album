import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sql } from '@/lib/db';
import { FlowerRaw, PhotoRaw } from '@/lib/types';
import { put } from '@vercel/blob';
import convert from 'heic-convert';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

const PROMPT = `この写真に写っている花を特定し、以下のJSON形式のみで返してください（前置き・説明文は不要）。

{
  "name": "花の和名（日本語）",
  "name_scientific": "学名",
  "language": ["花言葉1", "花言葉2"],
  "origin": "花言葉の由来",
  "source_culture": "出典文化圏",
  "source_culture_notes": "他の文化圏での違いがあれば記載",
  "birth_month": 月(数値),
  "birth_day": 日(数値),
  "season": "春/夏/秋/冬",
  "primary_emotions": ["joy"など1〜3個],
  "compound_emotion": "love"など / null,
  "emotion_intensity": "strong/medium/soft",
  "sentiment": "positive/negative/neutral",
  "scene_tags": ["告白"など],
  "habitat_description": "どんな場所で見つけやすいか（住宅街の植え込み・川沿いの土手・山の日陰など、日常の散歩で出会える環境を具体的に）"
}

【重要ルール】
- 花が特定できない場合は name を null にすること
- 花言葉は特定した花の正確な情報を返すこと
- 感情分類は花言葉の「文字通りの直接的な意味」で判断し、連想・象徴では判断しないこと
- 不確かな情報は推測せず null とすること`;

function parseJsonSafe(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
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
      let buffer = Buffer.from(bytes);
      const originalType = file.type.toLowerCase();
      const originalExt = (file.name.split('.').pop() || 'jpg').toLowerCase();

      // HEIC/HEIF → JPEG変換
      const isHeic =
        originalType === 'image/heic' ||
        originalType === 'image/heif' ||
        originalExt === 'heic' ||
        originalExt === 'heif';

      let mimeType: string = originalType || 'image/jpeg';
      let uploadExt = originalExt;

      if (isHeic) {
        const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        const converted = await convert({
          buffer: uint8 as unknown as ArrayBuffer,
          format: 'JPEG',
          quality: 0.9,
        });
        buffer = Buffer.from(converted) as Buffer<ArrayBuffer>;
        mimeType = 'image/jpeg';
        uploadExt = 'jpg';
      }

      const base64 = buffer.toString('base64');

      // Vercel Blobにアップロード
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const filename = `uploads/${timestamp}-${random}.${uploadExt}`;

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

      // Gemini Visionで花を識別 + 花言葉取得
      let analysisResult: Record<string, unknown> | null = null;
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const response = await model.generateContent([
          { text: PROMPT },
          {
            inlineData: {
              mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
              data: base64,
            },
          },
        ]);
        const text = response.response.text();
        analysisResult = parseJsonSafe(text);
      } catch (err) {
        console.error('Gemini API error:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        results.push({ error: `Gemini error: ${errMsg}`, file_path: publicPath });
        continue;
      }

      // 花を特定できなかった場合
      if (!analysisResult || !analysisResult.name) {
        results.push({ error: 'flower_not_identified', file_path: publicPath });
        continue;
      }

      // 同名の花が既存であれば再利用、なければ新規作成
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
            analysisResult.name,
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

      // 写真レコード作成
      const photoInserted = await sql(
        `INSERT INTO photos (flower_id, file_path, is_wikimedia) VALUES ($1, $2, 0) RETURNING *`,
        [flower.id, publicPath]
      ) as unknown as PhotoRaw[];
      const photo = photoInserted[0];

      await sql('UPDATE wishlist SET is_captured = 1 WHERE flower_id = $1', [flower.id]);

      results.push({
        flower: {
          ...flower,
          language: Array.isArray(flower.language) ? flower.language : JSON.parse(flower.language || '[]'),
          primary_emotions: Array.isArray(flower.primary_emotions) ? flower.primary_emotions : JSON.parse(flower.primary_emotions || '[]'),
          scene_tags: Array.isArray(flower.scene_tags) ? flower.scene_tags : JSON.parse(flower.scene_tags || '[]'),
        },
        photo: {
          ...photo,
          user_emotion_tags: Array.isArray(photo.user_emotion_tags) ? photo.user_emotion_tags : JSON.parse(photo.user_emotion_tags || '[]'),
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
