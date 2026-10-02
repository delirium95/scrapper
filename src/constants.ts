import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PRODUCT_URL =
  'https://us-store.msi.com/Motherboards/Intel-Platform-Motherboard/INTEL-Z890/MAG-Z890-TOMAHAWK-WIFI';
export const OUTPUT_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'output', 'product.json');
export const BRAND_NAME = 'MSI';
export const MANUFACTURER_SPEC_NAME = 'manufacturer number';
export const CATEGORY_SEPARATOR = ' > ';

export const SELECTORS = {
  title: 'h2.crop-text-2.title',
  price: '#prices-new',
  priceBox: '#prices-wrapper',
  oldPrice: '.prices-old, #prices-old, del, s',
  addToCartEnabled: '#button-cart:not([disabled])',
  breadcrumbs: '.breadcrumb .breadcrumb-item',
  scripts: 'script',
  specRows: 'table tr',
  specName: 'th[scope="row"]',
  specValue: 'td',
  productId: 'input[name="product_id"]',
  mainImage: '#imagePopup',
  galleryImages: 'img.product-detail-thumb-bto',
  rating: '#average-rating-info',
} as const;

export const PRICE_TEXT_PATTERN = /\$\s*[\d,]+/;
export const PRICE_VALUE_PATTERN = /\$\s*([\d,]+(?:\.\d{1,2})?)/;
export const NUMBER_PATTERN = /\d+(?:\.\d+)?/;
export const RATING_PATTERN = /(\d+(?:\.\d+)?)\s*\((\d+)\)/;
export const AVAILABILITY_TEXT_PATTERN = /out of stock|sold out|unavailable|notify me|pre.?order|pre.?sale|in stock|add to cart/i;
export const STOCK_PATTERNS = {
  outOfStock: /out of stock|sold out|unavailable|notify me/,
  preOrder: /pre.?order|pre.?sale/,
  inStock: /in stock|add to cart/,
} as const;

export const BROWSER_OS = {
  darwin: 'Macintosh; Intel Mac OS X 10_15_7',
  win32: 'Windows NT 10.0; Win64; x64',
  other: 'X11; Linux x86_64',
} as const;

export const SUCCESS_MESSAGE = (title: string, outputFile: string): string =>
  `Saved ${title} to ${outputFile}`;
