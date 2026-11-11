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
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 rounded-2xl p-6 text-white shadow-md">
        <div className="max-w-xl space-y-1.5">
          <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Katalog Event Resmi
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Katalog Jastipbun
          </h1>
          <p className="text-rose-100 text-xs sm:text-sm">
            Daftar harga dan ketersediaan barang per event aktif. Transparan tanpa biaya tersembunyi.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cari produk atau brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter by Event */}
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
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
                className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition ${
                  selectedEvent === ev
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {ev === 'all' ? 'Semua Event Aktif' : ev}
              </button>
            ))}
          </div>
        </div>

        {/* Filter by Brand */}
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Pilih Brand
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {activeBrandList.map((br) => (
              <button
                key={br}
                onClick={() => setSelectedBrand(br)}
                className={`text-xs px-3 py-1 rounded-md whitespace-nowrap font-medium transition ${
                  selectedBrand === br
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
        <div className="py-16 text-center text-slate-400 text-sm">Memuat katalog...</div>
      ) : groupedData.size === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-slate-200 p-8 space-y-3">
          <p className="text-slate-600 text-sm font-semibold">
            Tidak ada barang aktif yang tersedia sesuai pencarian / filter.
          </p>
          <button
            onClick={() => {
              setSelectedEvent('all');
              setSelectedBrand('all');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-rose-600 hover:underline"
          >
            Reset filter pencarian
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {Array.from(groupedData.entries()).map(([eventName, brandMap]) => (
            <section key={eventName} className="space-y-6">
              {/* Event Section Heading */}
              <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-2">
                <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
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
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wide bg-slate-100 px-3 py-1 rounded-lg">
                        Brand: {brandName}
                      </h3>
                      <span className="text-xs text-slate-400 font-medium">({brandItems.length} produk)</span>
                    </div>

                    {/* Product Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {brandItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                        >
                          {/* Image Box */}
                          <div
                            className="relative aspect-[3/4] bg-slate-100 cursor-pointer overflow-hidden group"
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
                                className={`text-[10px] font-bold px-2 py-0.5 rounded shadow ${
                                  item.status === 'ready'
                                    ? 'bg-emerald-500 text-white'
                                    : item.status === 'limited'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-600 text-white'
                                }`}
                              >
                                {item.status === 'ready' ? 'Ready' : item.status === 'limited' ? 'Sisa Dikit' : 'Habis'}
                              </span>
                            </div>
                          </div>

                          {/* Info & Price Breakdown */}
                          <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug">
                                {item.name}
                              </h4>
                              {item.notes && (
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{item.notes}</p>
                              )}
                            </div>

                            {/* Price Breakdown */}
                            <div className="pt-2 border-t border-slate-100 space-y-0.5">
                              <div className="flex items-baseline justify-between text-slate-500 text-[10px]">
                                <span>Harga Barang:</span>
                                <span className="font-mono font-medium">Rp {item.price.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex items-baseline justify-between text-rose-600 text-[10px]">
                                <span>Fee Jastip:</span>
                                <span className="font-mono font-medium">+Rp {item.fee.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 mt-1">
                                <span className="text-[11px] font-bold text-slate-800">Total Harga:</span>
                                <span className="text-sm font-black text-rose-600 font-mono">
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
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-xl overflow-hidden p-2">
            <img src={previewImage} alt="Preview Foto" className="w-full h-full object-contain max-h-[85vh]" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
