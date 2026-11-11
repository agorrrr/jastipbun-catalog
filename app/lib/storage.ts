import { CatalogItem, EventMeta } from './types';

const DB_NAME = 'jastipbun_db';
const ITEM_STORE = 'catalog_items';
const EVENT_STORE = 'events';
const DB_VERSION = 2;

// ponytail: basic indexeddb wrapper. add transaction retry/migrations if schema changes.
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('window undefined'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ITEM_STORE)) {
        db.createObjectStore(ITEM_STORE, { keyPath: 'id' });
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

export const INITIAL_ITEMS: CatalogItem[] = [
  {
    id: 'demo-1',
    name: 'Uniqlo UT Graphic T-Shirt KAWS Edition',
    brand: 'Uniqlo',
    event: 'Grand Indonesia Special Sale',
    price: 199000,
    fee: 25000,
    status: 'ready',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=60',
    notes: 'Size S, M, L, XL available'
  },
  {
    id: 'demo-2',
    name: 'Pop Mart The Monsters Labubu Vinyl Figure',
    brand: 'Pop Mart',
    event: 'Pop Mart Pop-Up Mall Kelapa Gading',
    price: 349000,
    fee: 45000,
    status: 'limited',
    imageUrl: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=500&auto=format&fit=crop&q=60',
    notes: 'Blind box asli store, limit 2 per orang'
  },
  {
    id: 'demo-3',
    name: 'Zara Linen Blend Overshirt Striped',
    brand: 'Zara',
    event: 'Grand Indonesia Special Sale',
    price: 799000,
    fee: 50000,
    status: 'ready',
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=60',
    notes: 'Bahan adem, cocok outdoor'
  },
  {
    id: 'demo-4',
    name: 'Sephora Rare Beauty Soft Pinch Liquid Blush',
    brand: 'Sephora',
    event: 'Beauty Fair Senayan',
    price: 435000,
    fee: 30000,
    status: 'sold_out',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=60',
    notes: 'Shade Hope / Encourage'
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

export async function getAllCatalog(): Promise<CatalogItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(ITEM_STORE, 'readonly');
      const store = tx.objectStore(ITEM_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const res = req.result as CatalogItem[];
        if (!res || res.length === 0) {
          resolve(INITIAL_ITEMS);
        } else {
          resolve(res);
        }
      };
      req.onerror = () => resolve(INITIAL_ITEMS);
    });
  } catch {
    return INITIAL_ITEMS;
  }
}

export async function saveManyCatalogItems(items: CatalogItem[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ITEM_STORE, 'readwrite');
    const store = tx.objectStore(ITEM_STORE);
    items.forEach(it => store.put(it));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCatalogItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ITEM_STORE, 'readwrite');
    const store = tx.objectStore(ITEM_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearCatalog(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([ITEM_STORE, EVENT_STORE], 'readwrite');
    tx.objectStore(ITEM_STORE).clear();
    tx.objectStore(EVENT_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
