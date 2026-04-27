import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { FlowerRaw } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const flowerId = searchParams.get('flower_id');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '10';

    if (!flowerId || !lat || !lng) {
      return NextResponse.json({ error: 'flower_id, lat, lng are required' }, { status: 400 });
    }

    const flowers = await sql('SELECT * FROM flowers WHERE id = $1', [parseInt(flowerId)]) as unknown as FlowerRaw[];
    const flower = flowers[0];
    if (!flower) {
      return NextResponse.json({ error: 'Flower not found' }, { status: 404 });
    }

    const taxonName = flower.name_scientific || flower.name;
    const url = new URL('https://api.inaturalist.org/v1/observations');
    url.searchParams.set('taxon_name', taxonName);
    url.searchParams.set('lat', lat);
    url.searchParams.set('lng', lng);
    url.searchParams.set('radius', radius);
    url.searchParams.set('quality_grade', 'research');
    url.searchParams.set('per_page', '50');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'FlowerAlbum/1.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'iNaturalist API error', observations: [] });
    }

    const data = await response.json();
    const observations = (data.results || []).map((obs: {
      id: number;
      location?: string;
      observed_on?: string;
      photos?: Array<{ url?: string }>;
    }) => {
      const location = obs.location ? obs.location.split(',') : [null, null];
      return {
        id: obs.id,
        lat: location[0] ? parseFloat(location[0]) : null,
        lng: location[1] ? parseFloat(location[1]) : null,
        observed_on: obs.observed_on,
        photos: (obs.photos || []).map((p) => ({ url: p.url })),
      };
    }).filter((obs: { lat: number | null; lng: number | null }) => obs.lat !== null && obs.lng !== null);

    return NextResponse.json({ observations });
  } catch (error) {
    console.error('iNaturalist error:', error);
    return NextResponse.json({ error: 'Internal server error', observations: [] }, { status: 500 });
  }
}
