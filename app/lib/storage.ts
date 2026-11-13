import { CatalogPageItem, EventMeta } from './types';

export const INITIAL_EVENTS: EventMeta[] = [];
export const INITIAL_PAGES: CatalogPageItem[] = [];

// Fetch current cloud state from Vercel Blob API
export async function getEvents(): Promise<EventMeta[]> {
  try {
    const res = await fetch(`/api/catalog?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return data.events || [];
    }
  } catch (err) {
    console.error('getEvents error:', err);
  }
  return [];
}

export async function getAllPages(): Promise<CatalogPageItem[]> {
  try {
    const res = await fetch(`/api/catalog?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return data.pages || [];
    }
  } catch (err) {
    console.error('getAllPages error:', err);
  }
  return [];
}

// Upload image to Vercel Blob and return public CDN URL
export async function uploadImageToBlob(dataUrl: string, filename: string): Promise<string> {
  // If already a cloud URL, return directly
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, dataUrl }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to upload image to cloud');
  }

  const data = await res.json();
  return data.url;
}

export async function saveEvent(ev: EventMeta): Promise<void> {
  await fetch('/api/catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save_event', payload: ev }),
  });
}

export async function toggleEventActive(name: string, active: boolean): Promise<void> {
  await fetch('/api/catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'toggle_event', payload: { name, active } }),
  });
}

export async function saveManyPages(pages: CatalogPageItem[]): Promise<void> {
  await fetch('/api/catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save_pages', payload: pages }),
  });
}

export async function deletePage(id: string): Promise<void> {
  await fetch('/api/catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete_page', payload: { id } }),
  });
}

export async function deleteBrandInEvent(eventName: string, brandName: string): Promise<void> {
  await fetch('/api/catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'delete_brand',
      payload: { eventName, brandName },
    }),
  });
}

export async function clearAllData(): Promise<void> {
  await fetch('/api/catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'clear_all' }),
  });
}
