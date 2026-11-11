import { CatalogPageItem, EventMeta } from './types';

const DB_NAME = 'jastipbun_db';
const PAGE_STORE = 'catalog_pages';
const EVENT_STORE = 'events';
const DB_VERSION = 3;

// ponytail: basic indexeddb wrapper.
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('window undefined'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PAGE_STORE)) {
        db.createObjectStore(PAGE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(EVENT_STORE)) {
        db.createObjectStore(EVENT_STORE, { keyPath: 'name' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const INITIAL_EVENTS: EventMeta[] = [
  { name: 'Grand Indonesia Special Sale', active: true },
  { name: 'Pop Mart Pop-Up Mall Kelapa Gading', active: true },
  { name: 'Beauty Fair Senayan', active: false }
];

export const INITIAL_PAGES: CatalogPageItem[] = [
  {
    id: 'demo-p1',
    brand: 'Uniqlo',
    event: 'Grand Indonesia Special Sale',
    pageNumber: 1,
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'demo-p2',
    brand: 'Uniqlo',
    event: 'Grand Indonesia Special Sale',
    pageNumber: 2,
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'demo-p3',
    brand: 'Pop Mart',
    event: 'Pop Mart Pop-Up Mall Kelapa Gading',
    pageNumber: 1,
    imageUrl: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'demo-p4',
    brand: 'Sephora',
    event: 'Beauty Fair Senayan',
    pageNumber: 1,
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
  }
];

export async function getEvents(): Promise<EventMeta[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(EVENT_STORE, 'readonly');
      const store = tx.objectStore(EVENT_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const res = req.result as EventMeta[];
        if (!res || res.length === 0) {
          resolve(INITIAL_EVENTS);
        } else {
          resolve(res);
        }
      };
      req.onerror = () => resolve(INITIAL_EVENTS);
    });
  } catch {
    return INITIAL_EVENTS;
  }
}

export async function saveEvent(ev: EventMeta): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EVENT_STORE, 'readwrite');
    const store = tx.objectStore(EVENT_STORE);
    const req = store.put(ev);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function toggleEventActive(name: string, active: boolean): Promise<void> {
  const events = await getEvents();
  const existing = events.find(e => e.name === name) || { name, active: true };
  existing.active = active;
  await saveEvent(existing);
}

export async function getAllPages(): Promise<CatalogPageItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(PAGE_STORE, 'readonly');
      const store = tx.objectStore(PAGE_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const res = req.result as CatalogPageItem[];
        if (!res || res.length === 0) {
          resolve(INITIAL_PAGES);
        } else {
          resolve(res);
        }
      };
      req.onerror = () => resolve(INITIAL_PAGES);
    });
  } catch {
    return INITIAL_PAGES;
  }
}

export async function saveManyPages(pages: CatalogPageItem[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PAGE_STORE, 'readwrite');
    const store = tx.objectStore(PAGE_STORE);
    pages.forEach(p => store.put(p));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deletePage(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PAGE_STORE, 'readwrite');
    const store = tx.objectStore(PAGE_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBrandInEvent(eventName: string, brandName: string): Promise<void> {
  const all = await getAllPages();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PAGE_STORE, 'readwrite');
    const store = tx.objectStore(PAGE_STORE);
    all.filter(p => p.event === eventName && p.brand === brandName).forEach(p => store.delete(p.id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PAGE_STORE, EVENT_STORE], 'readwrite');
    tx.objectStore(PAGE_STORE).clear();
    tx.objectStore(EVENT_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
