# MSI product page scraper

Scrapes the specified MSI US Store motherboard page and writes a normalized JSON object to `output/product.json`.

## Run

Requires Node.js 20 or newer. The scraper is written in TypeScript and runs through `tsx`.

```bash
npm install
npx playwright install chromium
npm run scrape
```

Run `npm run typecheck` to check the TypeScript types without generating files.

The output file is overwritten on each run. The scraper starts in headless Chromium. If MSI responds with HTTP 403, it retries once in a visible Playwright Chromium window. If a field is absent, it writes `null` (or an empty array for list fields).

## Extraction approach

- Breadcrumbs and product text come from the product page's visible DOM.
- The current price and stock status come from the product price panel. A higher crossed-out price is treated as the regular price and the current price as `sale_price`.
- Images come from the main product image and gallery thumbnails; duplicates are removed.
- Technical specifications come from rows containing a row heading and a value cell.
- The product ID is read from the page's hidden input or inline page script when present. The manufacturer number is used for `mpn`.

The scraper does not add a product to the cart or make any other changes to the site.

## Site access note

During development on October 2, 2026, MSI's Akamai protection returned HTTP 403 to local headless Chromium but HTTP 200 to visible Playwright Chromium. The fallback lets the three commands above refresh `output/product.json` on a desktop while still trying headless mode first. A machine without a graphical desktop may remain blocked by MSI. The scraper does not fabricate replacement data.
