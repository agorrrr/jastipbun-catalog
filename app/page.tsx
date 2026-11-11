'use client';

import { useState, useEffect, useMemo } from 'react';
import { CatalogItem, EventMeta } from './lib/types';
import { getAllCatalog, getEvents } from './lib/storage';

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [events, setEvents] = useState<EventMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Image lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [catItems, evList] = await Promise.all([getAllCatalog(), getEvents()]);
    setItems(catItems);
    setEvents(evList);
    setLoading(false);
  }

  // Set of Active Event Names only!
  const activeEventNames = useMemo(() => {
    return new Set(events.filter((e) => e.active).map((e) => e.name));
  }, [events]);

  // Filter items: only items belonging to an ACTIVE event!
  const availableItems = useMemo(() => {
    return items.filter((item) => activeEventNames.has(item.event));
  }, [items, activeEventNames]);

  // Unique Active Events and Brands for Filter Tabs
  const activeEventList = useMemo(() => {
    const set = new Set(availableItems.map((i) => i.event).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [availableItems]);

  const activeBrandList = useMemo(() => {
    const filtered = selectedEvent === 'all'
      ? availableItems
      : availableItems.filter((i) => i.event === selectedEvent);
    const set = new Set(filtered.map((i) => i.brand).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [availableItems, selectedEvent]);

  // Filtered by user selection & search
  const filteredItems = useMemo(() => {
    return availableItems.filter((item) => {
      const matchEvent = selectedEvent === 'all' || item.event === selectedEvent;
      const matchBrand = selectedBrand === 'all' || item.brand === selectedBrand;
      const matchSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.event.toLowerCase().includes(searchQuery.toLowerCase());
      return matchEvent && matchBrand && matchSearch;
    });
  }, [availableItems, selectedEvent, selectedBrand, searchQuery]);

  // Group items hierarchically: Event -> Brand -> Items[]
  const groupedData = useMemo(() => {
    const map = new Map<string, Map<string, CatalogItem[]>>();

    filteredItems.forEach((item) => {
      if (!map.has(item.event)) {
        map.set(item.event, new Map<string, CatalogItem[]>());
      }
      const brandMap = map.get(item.event)!;
      if (!brandMap.has(item.brand)) {
        brandMap.set(item.brand, []);
      }
      brandMap.get(item.brand)!.push(item);
    });

    return map;
  }, [filteredItems]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner - Matching Instagram @jastipbunn_ palette */}
      <div className="bg-gradient-to-r from-rosebrand-500 via-[#DE7486] to-[#C95B6E] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-cream-100/20 backdrop-blur-sm text-cream-50 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-goldbrand-500"></span>
              Live Shopping & Jastip Hunting
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white">
              Katalog Titipan Jastipbun
            </h1>
            <p className="text-cream-100/90 text-xs sm:text-sm">
              Katalog resmi per event & brand. Praktis, foto tajam dan ringan dibuka di handphone.
            </p>
          </div>

          <a
            href="https://www.instagram.com/jastipbunn_/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold transition text-white border border-white/20 shadow-xs"
          >
            <img src="/logo.jpg" alt="IG" className="w-6 h-6 rounded-full border border-white" />
            <span>@jastipbunn_ di Instagram →</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-cream-200 p-4 shadow-xs space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cari produk atau brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-lg border border-cream-300 focus:outline-none focus:ring-2 focus:ring-rosebrand-500 bg-cream-50/50"
          />
          <svg
            className="w-4 h-4 text-espresso-700/40 absolute left-3 top-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter by Event */}
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-espresso-700/70 mb-2">
            Pilih Event
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {activeEventList.map((ev) => (
              <button
                key={ev}
                onClick={() => {
                  setSelectedEvent(ev);
                  setSelectedBrand('all');
                }}
                className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap font-bold transition ${
                  selectedEvent === ev
                    ? 'bg-rosebrand-500 text-white shadow-xs'
                    : 'bg-cream-200 text-espresso-800 hover:bg-cream-300'
                }`}
              >
                {ev === 'all' ? 'Semua Event Aktif' : ev}
              </button>
            ))}
          </div>
        </div>

        {/* Filter by Brand */}
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-espresso-700/70 mb-2">
            Pilih Brand
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {activeBrandList.map((br) => (
              <button
                key={br}
                onClick={() => setSelectedBrand(br)}
                className={`text-xs px-3 py-1 rounded-md whitespace-nowrap font-semibold transition ${
                  selectedBrand === br
                    ? 'bg-espresso-800 text-cream-50'
                    : 'bg-cream-100 text-espresso-700 hover:bg-cream-200'
                }`}
              >
                {br === 'all' ? 'Semua Brand' : br}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Grouped by Event & Brand */}
      {loading ? (
        <div className="py-16 text-center text-espresso-700/50 text-sm">Memuat katalog...</div>
      ) : groupedData.size === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-cream-200 p-8 space-y-3">
          <p className="text-espresso-800 text-sm font-semibold">
            Tidak ada barang aktif yang tersedia sesuai pencarian / filter.
          </p>
          <button
            onClick={() => {
              setSelectedEvent('all');
              setSelectedBrand('all');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-rosebrand-600 hover:underline"
          >
            Reset filter pencarian
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {Array.from(groupedData.entries()).map(([eventName, brandMap]) => (
            <section key={eventName} className="space-y-6">
              {/* Event Section Heading */}
              <div className="flex items-center gap-3 border-b-2 border-cream-300 pb-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-rosebrand-500 shadow-xs"></span>
                <h2 className="text-xl sm:text-2xl font-black text-espresso-900 tracking-tight">
                  {eventName}
                </h2>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase">
                  Event Aktif
                </span>
              </div>

              {/* Sub-groups by Brand */}
              <div className="space-y-6 pl-1 sm:pl-3">
                {Array.from(brandMap.entries()).map(([brandName, brandItems]) => (
                  <div key={brandName} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-extrabold text-espresso-900 uppercase tracking-wide bg-cream-200/70 border border-cream-300 px-3 py-1 rounded-lg">
                        Brand: {brandName}
                      </h3>
                      <span className="text-xs text-espresso-700/60 font-medium">({brandItems.length} produk)</span>
                    </div>

                    {/* Product Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {brandItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl border border-cream-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                        >
                          {/* Image Box */}
                          <div
                            className="relative aspect-[3/4] bg-cream-100 cursor-pointer overflow-hidden group"
                            onClick={() => setPreviewImage(item.imageUrl)}
                          >
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            {/* Stock Badge */}
                            <div className="absolute top-2 right-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-xs ${
                                  item.status === 'ready'
                                    ? 'bg-emerald-600 text-white'
                                    : item.status === 'limited'
                                    ? 'bg-goldbrand-500 text-espresso-900'
                                    : 'bg-espresso-700/70 text-white'
                                }`}
                              >
                                {item.status === 'ready' ? 'Ready' : item.status === 'limited' ? 'Sisa Dikit' : 'Habis'}
                              </span>
                            </div>
                          </div>

                          {/* Info & Price Breakdown */}
                          <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-bold text-espresso-900 text-xs sm:text-sm line-clamp-2 leading-snug">
                                {item.name}
                              </h4>
                              {item.notes && (
                                <p className="text-[11px] text-espresso-700/70 mt-1 line-clamp-1">{item.notes}</p>
                              )}
                            </div>

                            {/* Price Breakdown */}
                            <div className="pt-2 border-t border-cream-200 space-y-0.5">
                              <div className="flex items-baseline justify-between text-espresso-700/70 text-[10px]">
                                <span>Harga Barang:</span>
                                <span className="font-mono font-medium">Rp {item.price.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex items-baseline justify-between text-rosebrand-600 text-[10px]">
                                <span>Fee Jastip:</span>
                                <span className="font-mono font-medium">+Rp {item.fee.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex items-baseline justify-between pt-1 border-t border-cream-200 mt-1">
                                <span className="text-[11px] font-bold text-espresso-900">Total:</span>
                                <span className="text-sm font-black text-rosebrand-600 font-mono">
                                  Rp {(item.price + item.fee).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-xl overflow-hidden p-2 border border-cream-200">
            <img src={previewImage} alt="Preview Foto" className="w-full h-full object-contain max-h-[85vh]" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-espresso-900/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
