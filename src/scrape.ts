import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

type Availability = 'in_stock' | 'out_of_stock' | 'pre_order' | null;

interface CategoryEntry {
  name: string;
  url: string | null;
}

interface Spec {
  name: string;
  value: string | null;
}

interface RawPage {
  url: string;
  itemId: string | null;
  title: string | null;
  pageTitle: string;
  categoryTree: CategoryEntry[];
  description: string | null;
  currentPrice: string | null;
  oldPrice: string | null;
  priceBoxText: string | null;
  canAddToCart: boolean;
  mainImage: string | null;
  galleryImages: (string | null)[];
  specs: Spec[];
  rating: string | null;
}

interface Product {
  url: string;
  item_id: string | null;
  title: string | null;
  brand: string | null;
  product_category: string | null;
  category_tree: CategoryEntry[];
  description: string | null;
  price: number | null;
  sale_price: number | null;
  availability: Availability;
  image_url: string | null;
  additional_image_urls: string[];
  specs: Spec[];
  star_rating: number | null;
  review_count: number | null;
  gtin: string | null;
  mpn: string | null;
  scraped_at: string;
}

const PRODUCT_URL =
  'https://us-store.msi.com/Motherboards/Intel-Platform-Motherboard/INTEL-Z890/MAG-Z890-TOMAHAWK-WIFI';
const OUTPUT_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'output', 'product.json');

function clean(value: unknown): string | null {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() || null : null;
}

function money(value: unknown): number | null {
  const match = clean(value)?.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
  return match ? Number(match[1].replaceAll(',', '')) : null;
}

function number(value: unknown): number | null {
  const match = clean(value)?.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function stockStatus(value: unknown): Availability {
  const text = clean(value)?.toLowerCase();
  if (!text) return null;
  if (/out of stock|sold out|unavailable|notify me/.test(text)) return 'out_of_stock';
  if (/pre.?order|pre.?sale/.test(text)) return 'pre_order';
  if (/in stock|add to cart/.test(text)) return 'in_stock';
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

async function readPage(page: Page): Promise<RawPage> {
  // Pass browser-side code as a string so tsx does not inject Node-side helpers
  // (such as __name) into Playwright's isolated page context.
  return page.evaluate(String.raw`(() => {
    const text = (element) => {
      const content = element instanceof HTMLElement ? element.innerText : element?.textContent;
      return content?.replace(/\s+/g, ' ').trim() || null;
    };
    const priceBox = document.querySelector('#prices-wrapper');
    const crumbs = [...document.querySelectorAll('.breadcrumb .breadcrumb-item')]
      .slice(1, -1)
      .map((item) => ({
        name: text(item),
        url: item.querySelector('a')?.href || null,
      }))
      .filter((item) => item.name !== null);
    const scripts = [...document.querySelectorAll('script')]
      .map((script) => script.textContent).join('\n');
    const specs = [...document.querySelectorAll('table tr')]
      .filter((row) => row.querySelector('th[scope="row"]') && row.querySelector('td'))
      .map((row) => ({
        name: text(row.querySelector('th[scope="row"]')),
        value: text(row.querySelector('td')),
      }))
      .filter((spec) => spec.name !== null);

    return {
      url: location.href,
      itemId: document.querySelector('input[name="product_id"]')?.value ||
        scripts.match(/product_id=(\d+)/)?.[1] || null,
      title: text(document.querySelector('h2.crop-text-2.title')),
      pageTitle: document.title,
      categoryTree: crumbs,
      description: text(document.querySelector('h2.crop-text-2.title')?.nextElementSibling),
      currentPrice: text(document.querySelector('#prices-new')),
      oldPrice: text(priceBox?.querySelector('.prices-old, #prices-old, del, s')),
      priceBoxText: text(priceBox),
      canAddToCart: !!document.querySelector('#button-cart:not([disabled])'),
      mainImage: document.querySelector('#imagePopup')?.getAttribute('src') || null,
      galleryImages: [...document.querySelectorAll('img.product-detail-thumb-bto')]
        .map((image) => image.getAttribute('popup_img') || image.getAttribute('src')),
      specs,
      rating: text(document.querySelector('#average-rating-info')),
    };
  })()`) as Promise<RawPage>;
}

function normalize(raw: RawPage): Product {
  const currentPrice = money(raw.currentPrice);
  const oldPrice = money(raw.oldPrice);
  const hasDiscount = oldPrice !== null && currentPrice !== null && oldPrice > currentPrice;
  const imageUrls = uniqueUrls([raw.mainImage, ...raw.galleryImages], raw.url);
  const manufacturerNumber = raw.specs.find((spec) =>
    spec.name.toLowerCase() === 'manufacturer number')?.value || null;
  const rating = raw.rating?.match(/(\d+(?:\.\d+)?)\s*\((\d+)\)/);

  return {
    url: raw.url,
    item_id: clean(raw.itemId),
    title: clean(raw.title),
    brand: /\bMSI\b/i.test(raw.pageTitle) ? 'MSI' : null,
    product_category: raw.categoryTree.map((item) => item.name).join(' > ') || null,
    category_tree: raw.categoryTree,
    description: clean(raw.description),
    price: hasDiscount ? oldPrice : currentPrice,
    sale_price: hasDiscount ? currentPrice : null,
    availability: stockStatus(raw.priceBoxText) || (raw.canAddToCart ? 'in_stock' : null),
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

async function scrape(headless: boolean): Promise<Product> {
  const browser = await chromium.launch({ headless });
  try {
    const page = await browser.newPage();
    const response = await page.goto(PRODUCT_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    if (!response?.ok()) {
      throw new Error(`MSI returned HTTP ${response?.status() ?? 'unknown'} for the product page.`);
    }
    await page.locator('h2.crop-text-2.title').waitFor({ timeout: 20000 });
    await page.locator('#prices-wrapper').waitFor({ timeout: 20000 });

    const product = normalize(await readPage(page));
    if (!product.title || !product.image_url || !product.specs.length) {
      throw new Error('The product page did not contain the expected product details.');
    }
    return product;
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  let product: Product;
  try {
    product = await scrape(true);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('HTTP 403')) throw error;
    console.warn('MSI blocked headless Chromium (HTTP 403); retrying in a visible browser.');
    product = await scrape(false);
  }

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(product, null, 2)}\n`);
  console.log(`Saved ${product.title} to ${OUTPUT_FILE}`);
}

main().catch((error: unknown) => {
  console.error(`Scrape failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
