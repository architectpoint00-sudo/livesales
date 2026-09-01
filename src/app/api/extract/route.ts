import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LiveSales/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    const extract = (patterns: RegExp[]) => {
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return m[1].trim().replace(/<[^>]*>/g, '').substring(0, 500);
      }
      return '';
    };

    const name = extract([
      /<meta property="og:title" content="([^"]+)"/i,
      /<title>([^<]+)<\/title>/i,
      /<h1[^>]*>([^<]+)<\/h1>/i,
    ]);

    const description = extract([
      /<meta property="og:description" content="([^"]+)"/i,
      /<meta name="description" content="([^"]+)"/i,
    ]);

    const image = extract([
      /<meta property="og:image" content="([^"]+)"/i,
    ]);

    const priceMatch = html.match(/["']price["']\s*:\s*["']?([\d.]+)/i)
      || html.match(/\$\s*([\d,]+\.?\d*)/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : undefined;

    const brand = extract([
      /<meta property="product:brand" content="([^"]+)"/i,
      /"brand"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i,
    ]);

    const category = extract([
      /<meta property="product:category" content="([^"]+)"/i,
    ]);

    return NextResponse.json({ name, description, image, price, brand, category });
  } catch {
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}
