import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@/lib/db';
import { FlowerRaw } from '@/lib/types';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(flowerName: string): string {
  return `花の和名「${flowerName}」について、以下をJSON形式のみで返してください（前置き・説明文は不要）。

{
  "name": "${flowerName}",
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
- nameフィールドは必ず「${flowerName}」をそのまま使用すること
- 花言葉は「${flowerName}」の正確な情報を返すこと
- 感情分類は花言葉の「文字通りの直接的な意味」で判断し、連想・象徴では判断しないこと
- 複数の文化圏で異なる花言葉がある場合は代表的なものを主とし、差異をsource_culture_notesに記載
- 不確かな情報は推測せず null とすること`;
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const { name } = await request.json() as { name: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const flowerName = name.trim();

    // Call Claude to get flower language data by name
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [{ type: 'text', text: buildPrompt(flowerName) }],
      }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const result = parseJsonSafe(textContent.text);
    if (!result) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Update flower in DB
    await sql(
      `UPDATE flowers SET
        name = $1, name_scientific = $2, language = $3, origin = $4,
        source_culture = $5, source_culture_notes = $6,
        birth_month = $7, birth_day = $8, season = $9,
        primary_emotions = $10, compound_emotion = $11,
        emotion_intensity = $12, sentiment = $13,
        scene_tags = $14, habitat_description = $15
      WHERE id = $16`,
      [
        result.name as string,
        (result.name_scientific as string) || null,
        JSON.stringify(result.language || []),
        (result.origin as string) || null,
        (result.source_culture as string) || null,
        (result.source_culture_notes as string) || null,
        (result.birth_month as number) || null,
        (result.birth_day as number) || null,
        (result.season as string) || null,
        JSON.stringify(result.primary_emotions || []),
        (result.compound_emotion as string) || null,
        (result.emotion_intensity as string) || null,
        (result.sentiment as string) || null,
        JSON.stringify(result.scene_tags || []),
        (result.habitat_description as string) || null,
        id,
      ]
    );

    const flowers = await sql('SELECT * FROM flowers WHERE id = $1', [id]) as unknown as FlowerRaw[];
    const flower = flowers[0];

    return NextResponse.json({
      flower: {
        ...flower,
        language: Array.isArray(flower.language) ? flower.language : JSON.parse(flower.language || '[]'),
        primary_emotions: Array.isArray(flower.primary_emotions) ? flower.primary_emotions : JSON.parse(flower.primary_emotions || '[]'),
        scene_tags: Array.isArray(flower.scene_tags) ? flower.scene_tags : JSON.parse(flower.scene_tags || '[]'),
      },
    });
  } catch (error) {
    console.error('Reanalyze error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Internal server error: ${msg}` }, { status: 500 });
  }
}
