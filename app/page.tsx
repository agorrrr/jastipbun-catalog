'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CatalogPageItem, EventMeta } from './lib/types';
import { getAllPages, getEvents } from './lib/storage';

export default function CatalogPage() {
  const [pages, setPages] = useState<CatalogPageItem[]>([]);
  const [events, setEvents] = useState<EventMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lightbox
  const [previewImage, setPreviewImage] = useState<CatalogPageItem | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [allPages, evList] = await Promise.all([getAllPages(), getEvents()]);
    setPages(allPages);
    setEvents(evList);
    setLoading(false);
  }

  // Active Events Only
  const activeEventNames = useMemo(() => {
    return new Set(events.filter((e) => e.active).map((e) => e.name));
  }, [events]);

  const availablePages = useMemo(() => {
    return pages.filter((p) => activeEventNames.has(p.event));
  }, [pages, activeEventNames]);

  // Unique Events and Brands for Filter Tabs
  const activeEventList = useMemo(() => {
    const set = new Set(availablePages.map((p) => p.event).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [availablePages]);

  const activeBrandList = useMemo(() => {
    const filtered = selectedEvent === 'all'
      ? availablePages
      : availablePages.filter((p) => p.event === selectedEvent);
    const set = new Set(filtered.map((p) => p.brand).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [availablePages, selectedEvent]);

  // Filtered pages
  const filteredPages = useMemo(() => {
    return availablePages.filter((p) => {
      const matchEvent = selectedEvent === 'all' || p.event === selectedEvent;
      const matchBrand = selectedBrand === 'all' || p.brand === selectedBrand;
      const matchSearch =
        !searchQuery.trim() ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.event.toLowerCase().includes(searchQuery.toLowerCase());
      return matchEvent && matchBrand && matchSearch;
    });
  }, [availablePages, selectedEvent, selectedBrand, searchQuery]);

  // Group pages: Event -> Brand -> Pages[]
  const groupedData = useMemo(() => {
    const map = new Map<string, Map<string, CatalogPageItem[]>>();

    filteredPages.forEach((p) => {
      if (!map.has(p.event)) {
        map.set(p.event, new Map<string, CatalogPageItem[]>());
      }
      const brandMap = map.get(p.event)!;
      if (!brandMap.has(p.brand)) {
        brandMap.set(p.brand, []);
      }
      brandMap.get(p.brand)!.push(p);
    });

    return map;
  }, [filteredPages]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner - Soft Muted Palette */}
      <div className="bg-gradient-to-r from-rosebrand-500 to-[#9E5865] rounded-2xl p-6 text-white shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-white text-[11px] font-semibold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Katalog Resmi
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white">
              Jastipbun
            </h1>
            <p className="text-white/85 text-xs sm:text-sm">
              Katalog belanja per event & brand. Klik halaman untuk melihat detail foto.
            </p>
          </div>

          <a
            href="https://www.instagram.com/jastipbunn_/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-xs px-3.5 py-2 rounded-xl text-xs font-semibold transition text-white border border-white/20"
          >
            <img src="/logo.jpg" alt="IG" className="w-5 h-5 rounded-full border border-white/60" />
            <span>@jastipbunn_ →</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-cream-200 p-4 shadow-xs space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cari brand atau event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-cream-300 focus:outline-none focus:ring-2 focus:ring-rosebrand-500 bg-cream-50/40"
          />
          <svg
            className="w-4 h-4 text-espresso-700/40 absolute left-3 top-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter by Event */}
        {activeEventList.length > 1 && (
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-espresso-700/60 mb-2">
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
                      ? 'bg-rosebrand-500 text-white shadow-xs'
                      : 'bg-cream-100 text-espresso-800 hover:bg-cream-200'
                  }`}
                >
                  {ev === 'all' ? 'Semua Event' : ev}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter by Brand */}
        {activeBrandList.length > 1 && (
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-espresso-700/60 mb-2">
              Pilih Brand
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {activeBrandList.map((br) => (
                <button
                  key={br}
                  onClick={() => setSelectedBrand(br)}
                  className={`text-xs px-3 py-1 rounded-md whitespace-nowrap font-medium transition ${
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
        )}
      </div>

      {/* Main Content: Grouped by Event & Brand */}
      {loading ? (
        <div className="py-16 text-center text-espresso-700/50 text-sm">Memuat katalog...</div>
      ) : groupedData.size === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-cream-200 p-8 space-y-3">
          <p className="text-espresso-800 text-sm font-semibold">
            Belum ada katalog aktif yang tersedia.
          </p>
          <p className="text-xs text-espresso-700/60">
            Admin dapat menambahkan event dan katalog dari menu admin.
          </p>
          <Link
            href="/admin"
            className="inline-block mt-2 text-xs font-bold text-rosebrand-600 hover:underline"
          >
            Buka Menu Admin →
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {Array.from(groupedData.entries()).map(([eventName, brandMap]) => (
            <section key={eventName} className="space-y-5">
              {/* Event Section Heading */}
              <div className="flex items-center gap-2.5 border-b border-cream-300 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rosebrand-500"></span>
                <h2 className="text-lg sm:text-xl font-bold text-espresso-900 tracking-tight">
                  {eventName}
                </h2>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                  Aktif
                </span>
              </div>

              {/* Sub-groups by Brand */}
              <div className="space-y-5 pl-1 sm:pl-2">
                {Array.from(brandMap.entries()).map(([brandName, brandPages]) => (
                  <div key={brandName} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-espresso-900 uppercase tracking-wide bg-cream-100 border border-cream-200 px-2.5 py-1 rounded-md">
                          Brand: {brandName}
                        </h3>
                        <span className="text-xs text-espresso-700/60 font-medium">({brandPages.length} Halaman)</span>
                      </div>
                      <span className="text-xs text-rosebrand-600 font-medium">Klik untuk zoom</span>
                    </div>

                    {/* Catalog Pages Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                      {brandPages.map((page) => (
                        <div
                          key={page.id}
                          onClick={() => setPreviewImage(page)}
                          className="bg-white rounded-xl border border-cream-200 overflow-hidden shadow-xs hover:shadow-sm transition cursor-pointer group flex flex-col"
                        >
                          <div className="relative aspect-[3/4] bg-cream-50 overflow-hidden">
                            <img
                              src={page.imageUrl}
                              alt={`${page.brand} Hal ${page.pageNumber}`}
                              loading="lazy"
                              className="w-full h-full object-contain group-hover:scale-102 transition duration-200 bg-white"
                            />
                            <div className="absolute top-2 left-2">
                              <span className="bg-espresso-900/75 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
                                Hal {page.pageNumber}
                              </span>
                            </div>
                          </div>

                          <div className="p-2 bg-cream-50/40 border-t border-cream-200 text-center">
                            <p className="text-xs font-bold text-espresso-900 truncate">
                              {page.brand}
                            </p>
                            <p className="text-[10px] text-espresso-700/60">
                              Halaman {page.pageNumber}
                            </p>
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

      {/* Lightbox Fullscreen Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-2 sm:p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[95vh] w-full bg-white rounded-2xl overflow-hidden p-3 sm:p-4 border border-cream-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-cream-200 mb-2">
              <div>
                <span className="text-xs font-bold text-rosebrand-600 uppercase tracking-wide">{previewImage.brand}</span>
                <h3 className="font-bold text-espresso-900 text-sm">
                  {previewImage.event} — Halaman {previewImage.pageNumber}
                </h3>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="bg-cream-100 text-espresso-800 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold hover:bg-cream-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Image */}
            <div className="flex-1 overflow-auto flex items-center justify-center bg-cream-50 rounded-xl p-2 max-h-[80vh]">
              <img
                src={previewImage.imageUrl}
                alt={`${previewImage.brand} Halaman ${previewImage.pageNumber}`}
                className="max-w-full max-h-[78vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
