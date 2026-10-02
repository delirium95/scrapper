import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, errors as playwrightErrors, type Page } from 'playwright';
import {
  AVAILABILITY_TEXT_PATTERN,
  OUTPUT_FILE,
  PRICE_TEXT_PATTERN,
  PRODUCT_URL,
  RATING_PATTERN,
  SELECTORS,
  SUCCESS_MESSAGE,
} from './constants.js';
import { ERROR_MESSAGES, formatScrapeError } from './errors.js';
import type { Product, RawPage } from './types.js';
import { browserIdentity, normalize } from './utils.js';

async function readPage(page: Page): Promise<RawPage> {
  // Pass browser-side code as a string so tsx does not inject Node-side helpers
  // (such as __name) into Playwright's isolated page context.
  return page.evaluate(String.raw`(() => {
    const selectors = ${JSON.stringify(SELECTORS)};
    const ratingPattern = ${RATING_PATTERN};
    const text = (element) => {
      const content = element instanceof HTMLElement ? element.innerText : element?.textContent;
      return content?.replace(/\s+/g, ' ').trim() || null;
    };
    const priceBox = document.querySelector(selectors.priceBox);
    const crumbs = [...document.querySelectorAll(selectors.breadcrumbs)]
      .slice(1, -1)
      .map((item) => ({
        name: text(item),
        url: item.querySelector('a')?.href || null,
      }))
      .filter((item) => item.name !== null);
    const scripts = [...document.querySelectorAll(selectors.scripts)]
      .map((script) => script.textContent).join('\n');
    const specs = [...document.querySelectorAll(selectors.specRows)]
      .filter((row) => row.querySelector(selectors.specName) && row.querySelector(selectors.specValue))
      .map((row) => ({
        name: text(row.querySelector(selectors.specName)),
        value: text(row.querySelector(selectors.specValue)),
      }))
      .filter((spec) => spec.name !== null);
    const title = document.querySelector(selectors.title);

    return {
      url: location.href,
      itemId: document.querySelector(selectors.productId)?.value ||
        scripts.match(/product_id=(\d+)/)?.[1] || null,
      title: text(title),
      pageTitle: document.title,
      categoryTree: crumbs,
      description: text(title?.nextElementSibling),
      currentPrice: text(document.querySelector(selectors.price)),
      oldPrice: text(priceBox?.querySelector(selectors.oldPrice)),
      priceBoxText: text(priceBox),
      canAddToCart: !!document.querySelector(selectors.addToCartEnabled),
      mainImage: document.querySelector(selectors.mainImage)?.getAttribute('src') || null,
      galleryImages: [...document.querySelectorAll(selectors.galleryImages)]
        .map((image) => image.getAttribute('popup_img') || image.getAttribute('src')),
      specs,
      rating: [...document.querySelectorAll(selectors.rating)]
        .map(text).find((value) => value && ratingPattern.test(value)) || null,
    };
  })()`) as Promise<RawPage>;
}

async function scrape(): Promise<Product> {
  const browser = await chromium.launch({ headless: true });
  try {
    const chromeMajor = browser.version().split('.')[0];
    const context = await browser.newContext(browserIdentity(chromeMajor));
    const page = await context.newPage();
    const response = await page.goto(PRODUCT_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    if (!response?.ok()) {
      throw new Error(ERROR_MESSAGES.httpError(response?.status()));
    }

    await page.locator(SELECTORS.title).waitFor({ timeout: 20000 });
    await page.locator(SELECTORS.price).filter({ hasText: PRICE_TEXT_PATTERN }).waitFor({ timeout: 20000 });
    await page.locator(SELECTORS.priceBox)
      .filter({ hasText: AVAILABILITY_TEXT_PATTERN })
      .or(page.locator(SELECTORS.addToCartEnabled))
      .first()
      .waitFor({ timeout: 20000 });
    try {
      await page.locator(SELECTORS.rating).filter({ hasText: RATING_PATTERN }).first().waitFor({ timeout: 5000 });
    } catch (error) {
      if (!(error instanceof playwrightErrors.TimeoutError)) throw error;
    }

    const product = normalize(await readPage(page));
    if (!product.title || !product.image_url || !product.specs.length) {
      throw new Error(ERROR_MESSAGES.missingDetails);
    }
    if (product.price === null && product.sale_price === null) {
      throw new Error(ERROR_MESSAGES.missingPrice);
    }
    if (product.availability === null) {
      throw new Error(ERROR_MESSAGES.missingAvailability);
    }
    return product;
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const product = await scrape();
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(product, null, 2)}\n`);
  console.log(SUCCESS_MESSAGE(product.title ?? '', OUTPUT_FILE));
}

main().catch((error: unknown) => {
  console.error(formatScrapeError(error));
  process.exitCode = 1;
});
