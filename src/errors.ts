export const ERROR_MESSAGES = {
  httpError: (status?: number) => `MSI returned HTTP ${status ?? 'unknown'} for the product page.`,
  missingDetails: 'The product page did not contain the expected product details.',
  missingPrice: 'The product page did not contain a readable price.',
  missingAvailability: 'The product page did not contain a readable availability status.',
  scrapeFailed: (message: string) => `Scrape failed: ${message}`,
} as const;

export function formatScrapeError(error: unknown): string {
  return ERROR_MESSAGES.scrapeFailed(error instanceof Error ? error.message : String(error));
}
