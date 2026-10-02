# MSI product page scraper

Scrapes the specified MSI US Store motherboard page and writes a normalized JSON object to `output/product.json`.

## Run

Requires Node.js 20 or newer. The scraper is written in TypeScript; `npm run scrape` compiles it and runs the generated JavaScript.

```bash
npm install
npx playwright install chromium
npm run scrape
```

Run `npm run typecheck` to check the TypeScript types without generating files.

The output file is overwritten on each run. The scraper runs in headless Playwright Chromium and reads product data from the live page. If a field is absent, it writes `null` (or an empty array for list fields).

`src/scrape.ts` runs the browser and extracts the page. Selectors and fixed values are in `src/constants.ts`, errors in `src/errors.ts`, types in `src/types.ts`, and normalization helpers in `src/utils.ts`.

## Extraction approach

- Breadcrumbs and product text come from the product page's visible DOM.
- The current price and stock status come from the product price panel. A higher crossed-out price is treated as the regular price and the current price as `sale_price`.
- Images come from the main product image and gallery thumbnails; duplicates are removed.
- Technical specifications come from rows containing a row heading and a value cell.
- The product ID is read from the page's hidden input or inline page script when present. The manufacturer number is used for `mpn`.

The scraper does not add a product to the cart or make any other changes to the site.

## Site access note

During development on October 2, 2026, MSI's Akamai protection returned HTTP 403 when Playwright's default headless browser advertised `HeadlessChrome`. The scraper sets ordinary Chromium request headers and successfully loaded the page in headless mode. Site access can still change; a non-success HTTP response is reported rather than replaced with fabricated data.
