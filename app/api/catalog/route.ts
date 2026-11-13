import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import { CatalogPageItem, EventMeta } from '../../lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CatalogDatabase {
  events: EventMeta[];
  pages: CatalogPageItem[];
}

const DATA_FILENAME = 'data/catalog.json';

async function getDatabase(): Promise<CatalogDatabase> {
  try {
    const { blobs } = await list({ prefix: DATA_FILENAME, limit: 1 });
    if (blobs.length > 0) {
      // Bypass Vercel Blob CDN 30-day cache with timestamp query param
      const freshUrl = `${blobs[0].url}?t=${Date.now()}`;
      const res = await fetch(freshUrl, { cache: 'no-store' });
      if (res.ok) {
        return (await res.json()) as CatalogDatabase;
      }
    }
  } catch (err) {
    console.error('Error fetching catalog db:', err);
  }
  return { events: [], pages: [] };
}

async function saveDatabase(data: CatalogDatabase): Promise<void> {
  await put(DATA_FILENAME, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export async function GET() {
  const db = await getDatabase();
  return NextResponse.json(db, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    const db = await getDatabase();

    if (action === 'save_event') {
      const existingIdx = db.events.findIndex((e) => e.name === payload.name);
      if (existingIdx >= 0) {
        db.events[existingIdx] = payload;
      } else {
        db.events.push(payload);
      }
    } else if (action === 'toggle_event') {
      const ev = db.events.find((e) => e.name === payload.name);
      if (ev) {
        ev.active = payload.active;
      } else {
        db.events.push({ name: payload.name, active: payload.active });
      }
    } else if (action === 'save_pages') {
      const newPages = payload as CatalogPageItem[];
      // Replace existing with same id or append
      newPages.forEach((np) => {
        const idx = db.pages.findIndex((p) => p.id === np.id);
        if (idx >= 0) {
          db.pages[idx] = np;
        } else {
          db.pages.push(np);
        }
      });
    } else if (action === 'delete_page') {
      db.pages = db.pages.filter((p) => p.id !== payload.id);
    } else if (action === 'delete_brand') {
      db.pages = db.pages.filter(
        (p) => !(p.event === payload.eventName && p.brand === payload.brandName)
      );
    } else if (action === 'clear_all') {
      db.events = [];
      db.pages = [];
    }

    await saveDatabase(db);
    return NextResponse.json({ success: true, db });
  } catch (err: any) {
    console.error('API catalog update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
