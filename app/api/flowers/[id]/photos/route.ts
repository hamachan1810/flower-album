import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import convert from 'heic-convert';
import { sql } from '@/lib/db';
import { PhotoRaw } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const flowerId = parseInt(params.id);
    if (isNaN(flowerId)) {
      return NextResponse.json({ error: 'Invalid flower id' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);
    const originalType = file.type.toLowerCase();
    const originalExt = (file.name.split('.').pop() || 'jpg').toLowerCase();

    const isHeic =
      originalType === 'image/heic' ||
      originalType === 'image/heif' ||
      originalExt === 'heic' ||
      originalExt === 'heif';

    let uploadExt = originalExt;
    if (isHeic) {
      const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const converted = await convert({
        buffer: uint8 as unknown as ArrayBuffer,
        format: 'JPEG',
        quality: 0.9,
      });
      buffer = Buffer.from(converted) as Buffer<ArrayBuffer>;
      uploadExt = 'jpg';
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `uploads/${timestamp}-${random}.${uploadExt}`;

    const blob = await put(filename, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const inserted = await sql(
      `INSERT INTO photos (flower_id, file_path, is_wikimedia) VALUES ($1, $2, 0) RETURNING *`,
      [flowerId, blob.url]
    ) as unknown as PhotoRaw[];

    const photo = inserted[0];
    return NextResponse.json({
      photo: {
        ...photo,
        user_emotion_tags: Array.isArray(photo.user_emotion_tags)
          ? photo.user_emotion_tags
          : JSON.parse(photo.user_emotion_tags || '[]'),
      },
    });
  } catch (error) {
    console.error('Add photo error:', error);
    return NextResponse.json({ error: 'Failed to add photo' }, { status: 500 });
  }
}
