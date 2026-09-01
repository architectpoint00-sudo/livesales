export type SourcePlatform = 'woocommerce' | 'shopify' | 'generic';

export interface StockCheckResult {
  platform: SourcePlatform;
  quantity: number | null;
  inStock: boolean | null;
}

function fetchOpts() {
  return {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LiveSales/1.0)' },
    signal: AbortSignal.timeout(8000),
  };
}

function detectPlatform(html: string): SourcePlatform {
  if (/cdn\.shopify\.com|Shopify\.theme|shopify-section/i.test(html)) return 'shopify';
  if (/wp-json|wp-content|woocommerce/i.test(html)) return 'woocommerce';
  return 'generic';
}

function slugFromUrl(url: string): string {
  const path = new URL(url).pathname.replace(/\/$/, '');
  return path.split('/').pop() || '';
}

async function checkWooCommerceStock(url: string): Promise<Pick<StockCheckResult, 'quantity' | 'inStock'>> {
  const origin = new URL(url).origin;
  const slug = slugFromUrl(url);
  try {
    const res = await fetch(`${origin}/wp-json/wc/store/v1/products?slug=${encodeURIComponent(slug)}`, fetchOpts());
    const products = await res.json();
    const product = Array.isArray(products) ? products[0] : null;
    if (!product) return { quantity: null, inStock: null };
    return {
      quantity: typeof product.stock_quantity === 'number' ? product.stock_quantity : null,
      inStock: typeof product.is_in_stock === 'boolean' ? product.is_in_stock : null,
    };
  } catch {
    return { quantity: null, inStock: null };
  }
}

// Shopify's public endpoints (`/products/{handle}.js`, `/products.json`) only ever expose a
// boolean `available` per variant — exact inventory counts were removed from public storefront
// data years ago specifically to prevent competitor scraping. There is no way around this via
// public endpoints, so `quantity` is always null here — this is a platform limit, not a bug.
async function checkShopifyAvailability(url: string): Promise<Pick<StockCheckResult, 'quantity' | 'inStock'>> {
  try {
    const jsUrl = url.replace(/\/?$/, '').replace(/\.js$/, '') + '.js';
    const res = await fetch(jsUrl, fetchOpts());
    const product = await res.json();
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (variants.length === 0) return { quantity: null, inStock: null };
    const inStock = variants.some((v: { available?: boolean }) => v.available === true);
    return { quantity: null, inStock };
  } catch {
    return { quantity: null, inStock: null };
  }
}

const STOCK_PATTERNS = [
  /(\d+)\s*(?:in stock|left|remaining|available)/i,
  /(?:only)\s*(\d+)\s*(?:left|remaining)/i,
  /(\d+)\s*(?:în stoc|ramase|r[ăa]mase|disponibile)/i,
];

function checkGenericStock(html: string): Pick<StockCheckResult, 'quantity' | 'inStock'> {
  for (const pattern of STOCK_PATTERNS) {
    const match = html.match(pattern);
    if (match?.[1]) return { quantity: parseInt(match[1], 10), inStock: true };
  }
  if (/out of stock|sold out|stoc epuizat/i.test(html)) return { quantity: null, inStock: false };
  return { quantity: null, inStock: null };
}

export async function checkCompetitorSource(url: string, knownPlatform?: SourcePlatform): Promise<StockCheckResult> {
  const res = await fetch(url, fetchOpts());
  const html = await res.text();
  const platform = knownPlatform ?? detectPlatform(html);

  const result = platform === 'woocommerce'
    ? await checkWooCommerceStock(url)
    : platform === 'shopify'
      ? await checkShopifyAvailability(url)
      : checkGenericStock(html);

  return { platform, ...result };
}
