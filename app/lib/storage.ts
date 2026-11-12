import { CatalogPageItem, EventMeta } from './types';

const DB_NAME = 'jastipbun_db';
const PAGE_STORE = 'catalog_pages';
const EVENT_STORE = 'events';
const DB_VERSION = 4; // increment to reset default data

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

// Data awal kosong agar fresh
export const INITIAL_EVENTS: EventMeta[] = [];
export const INITIAL_PAGES: CatalogPageItem[] = [];

export async function getEvents(): Promise<EventMeta[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(EVENT_STORE, 'readonly');
      const store = tx.objectStore(EVENT_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as EventMeta[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
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
      req.onsuccess = () => resolve((req.result as CatalogPageItem[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
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
