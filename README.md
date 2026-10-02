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

The output file is overwritten on each run. The script runs Chromium in headless mode and reads product data from the live page. If a field is absent, it writes `null` (or an empty array for list fields).

## Extraction approach

- Breadcrumbs and product text come from the product page's visible DOM.
- The current price and stock status come from the product price panel. A higher crossed-out price is treated as the regular price and the current price as `sale_price`.
- Images come from the main product image and gallery thumbnails; duplicates are removed.
- Technical specifications come from rows containing a row heading and a value cell.
- The product ID is read from the page's hidden input or inline page script when present. The manufacturer number is used for `mpn`.

The scraper does not add a product to the cart or make any other changes to the site.

## Site access note

During development on October 2, 2026, the MSI site returned HTTP 403 to local headless Chromium. The included `output/product.json` is a sample captured from the live product page in a regular browser at that time. The scraper reports the HTTP status immediately if MSI rejects a run; it does not fabricate replacement data. Run `npm run scrape` from a network where the site permits headless browser access to refresh the sample.
