export enum AvailabilityStatus {
  InStock = 'in_stock',
  OutOfStock = 'out_of_stock',
  PreOrder = 'pre_order',
}

export interface CategoryEntry {
  name: string;
  url: string | null;
}

export interface Spec {
  name: string;
  value: string | null;
}

export interface RawPage {
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

export interface Product {
  url: string;
  item_id: string | null;
  title: string | null;
  brand: string | null;
  product_category: string | null;
  category_tree: CategoryEntry[];
  description: string | null;
  price: number | null;
  sale_price: number | null;
  availability: AvailabilityStatus | null;
  image_url: string | null;
  additional_image_urls: string[];
  specs: Spec[];
  star_rating: number | null;
  review_count: number | null;
  gtin: string | null;
  mpn: string | null;
  scraped_at: string;
}
