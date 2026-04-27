import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const searchQuery = `${name} flower`;
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('generator', 'search');
    url.searchParams.set('gsrnamespace', '6');
    url.searchParams.set('gsrsearch', searchQuery);
    url.searchParams.set('gsrlimit', '5');
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url|extmetadata');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'FlowerAlbum/1.0 (contact@example.com)',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Wikimedia API error' }, { status: 500 });
    }

    const data = await response.json();
    const pages = data.query?.pages;
    if (!pages) {
      return NextResponse.json({ result: null });
    }

    const firstPage = Object.values(pages)[0] as {
      imageinfo?: Array<{
        url?: string;
        extmetadata?: {
          License?: { value?: string };
          Artist?: { value?: string };
          LicenseShortName?: { value?: string };
        };
      }>;
    };

    if (!firstPage?.imageinfo?.[0]) {
      return NextResponse.json({ result: null });
    }

    const imageInfo = firstPage.imageinfo[0];
    const license = imageInfo.extmetadata?.LicenseShortName?.value ||
                    imageInfo.extmetadata?.License?.value || '';
    const artist = imageInfo.extmetadata?.Artist?.value || '';
    const attribution = artist ? `${artist} / Wikimedia Commons` : '© Wikimedia Commons';

    return NextResponse.json({
      result: {
        url: imageInfo.url,
        license,
        attribution,
      },
    });
  } catch (error) {
    console.error('Wikimedia error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
