import {
  BRAND_NAME,
  BROWSER_OS,
  CATEGORY_SEPARATOR,
  MANUFACTURER_SPEC_NAME,
  NUMBER_PATTERN,
  PRICE_VALUE_PATTERN,
  RATING_PATTERN,
  STOCK_PATTERNS,
} from './constants.js';
import { AvailabilityStatus, type Product, type RawPage } from './types.js';

function clean(value: unknown): string | null {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() || null : null;
}

function money(value: unknown): number | null {
  const match = clean(value)?.match(PRICE_VALUE_PATTERN);
  return match ? Number(match[1].replaceAll(',', '')) : null;
}

function number(value: unknown): number | null {
  const match = clean(value)?.match(NUMBER_PATTERN);
  return match ? Number(match[0]) : null;
}

function stockStatus(value: unknown): AvailabilityStatus | null {
  const text = clean(value)?.toLowerCase();
  if (!text) return null;
  if (STOCK_PATTERNS.outOfStock.test(text)) return AvailabilityStatus.OutOfStock;
  if (STOCK_PATTERNS.preOrder.test(text)) return AvailabilityStatus.PreOrder;
  if (STOCK_PATTERNS.inStock.test(text)) return AvailabilityStatus.InStock;
  return null;
}

function uniqueUrls(urls: (string | null)[], baseUrl: string): string[] {
  const resolved = urls.map((url) => {
    try {
      return url ? new URL(url, baseUrl).href : null;
    } catch {
      return null;
    }
  });
  return [...new Set(resolved.filter((url): url is string => url !== null))];
}

export function browserIdentity(chromeMajor: string): { userAgent: string; extraHTTPHeaders: Record<string, string> } {
  const os = process.platform === 'darwin' ? BROWSER_OS.darwin :
    process.platform === 'win32' ? BROWSER_OS.win32 : BROWSER_OS.other;
  return {
    userAgent: `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`,
    extraHTTPHeaders: {
      'sec-ch-ua': `"Chromium";v="${chromeMajor}", "Not=A?Brand";v="99"`,
    },
  };
}

export function normalize(raw: RawPage): Product {
  const currentPrice = money(raw.currentPrice);
  const oldPrice = money(raw.oldPrice);
  const hasDiscount = oldPrice !== null && currentPrice !== null && oldPrice > currentPrice;
  const imageUrls = uniqueUrls([raw.mainImage, ...raw.galleryImages], raw.url);
  const manufacturerNumber = raw.specs.find((spec) =>
    spec.name.toLowerCase() === MANUFACTURER_SPEC_NAME)?.value || null;
  const rating = raw.rating?.match(RATING_PATTERN);

  return {
    url: raw.url,
    item_id: clean(raw.itemId),
    title: clean(raw.title),
    brand: raw.pageTitle.toLowerCase().includes(BRAND_NAME.toLowerCase()) ? BRAND_NAME : null,
    product_category: raw.categoryTree.map((item) => item.name).join(CATEGORY_SEPARATOR) || null,
    category_tree: raw.categoryTree,
    description: clean(raw.description),
    price: hasDiscount ? oldPrice : currentPrice,
    sale_price: hasDiscount ? currentPrice : null,
    availability: stockStatus(raw.priceBoxText) || (raw.canAddToCart ? AvailabilityStatus.InStock : null),
    image_url: imageUrls[0] || null,
    additional_image_urls: imageUrls.slice(1),
    specs: raw.specs.map((spec) => ({ name: spec.name, value: clean(spec.value) })),
    star_rating: rating ? number(rating[1]) : null,
    review_count: rating ? number(rating[2]) : null,
    gtin: null,
    mpn: clean(manufacturerNumber),
    scraped_at: new Date().toISOString(),
  };
}
