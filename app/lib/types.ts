export interface EventMeta {
  name: string;
  active: boolean;
}

export interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  event: string;
  price: number;
  fee: number;
  status: 'ready' | 'limited' | 'sold_out';
  imageUrl: string;
  pageNumber?: number;
  notes?: string;
}
