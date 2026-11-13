'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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

  // Lightbox State
  const [lightboxGroup, setLightboxGroup] = useState<CatalogPageItem[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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

  // Lightbox navigation
  const openLightbox = (groupList: CatalogPageItem[], index: number) => {
    setLightboxGroup(groupList);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxGroup(null);
  };

  const showPrev = useCallback(() => {
    if (!lightboxGroup) return;
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : lightboxGroup.length - 1));
  }, [lightboxGroup]);

  const showNext = useCallback(() => {
    if (!lightboxGroup) return;
    setLightboxIndex((prev) => (prev < lightboxGroup.length - 1 ? prev + 1 : 0));
  }, [lightboxGroup]);

  // Keyboard navigation (Arrow keys + Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxGroup) return;
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
      if (e.key === 'Escape') closeLightbox();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxGroup, showPrev, showNext]);

  // Touch Swipe for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 45) {
      showNext(); // swipe left -> next
    } else if (diff < -45) {
      showPrev(); // swipe right -> prev
    }
    setTouchStartX(null);
  };

  const currentItem = lightboxGroup ? lightboxGroup[lightboxIndex] : null;

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rosebrand-500 to-[#9E5865] rounded-2xl p-4 sm:p-6 text-white shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 relative z-10">
          <div className="max-w-xl space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-white text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Katalog Resmi
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-tight text-white">
              Jastipbun
            </h1>
            <p className="text-white/85 text-xs sm:text-sm leading-relaxed">
              Katalog belanja per event & brand. Klik halaman untuk buka dan geser foto.
            </p>
          </div>

          <a
            href="https://www.instagram.com/jastipbunn_/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-xs px-3.5 py-2 rounded-xl text-xs font-semibold transition text-white border border-white/20 w-full sm:w-auto justify-center"
          >
            <img src="/logo.jpg" alt="IG" className="w-5 h-5 rounded-full border border-white/60" />
            <span>@jastipbunn_ di Instagram →</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-cream-200 p-3 sm:p-4 shadow-xs space-y-3 sm:space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cari brand atau event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-cream-300 focus:outline-none focus:ring-2 focus:ring-rosebrand-500 bg-cream-50/40"
          />
          <svg
            className="w-4 h-4 text-espresso-700/40 absolute left-3 top-2.5 sm:top-3"
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
            <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-espresso-700/60 mb-1.5">
              Pilih Event
            </span>
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
              {activeEventList.map((ev) => (
                <button
                  key={ev}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setSelectedBrand('all');
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition active:scale-95 ${
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
            <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-espresso-700/60 mb-1.5">
              Pilih Brand
            </span>
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
              {activeBrandList.map((br) => (
                <button
                  key={br}
                  onClick={() => setSelectedBrand(br)}
                  className={`text-xs px-3 py-1 rounded-md whitespace-nowrap font-medium transition active:scale-95 ${
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
        <div className="py-12 sm:py-16 text-center bg-white rounded-xl border border-cream-200 p-6 sm:p-8 space-y-2">
          <p className="text-espresso-800 text-sm font-semibold">
            Belum ada katalog aktif yang tersedia.
          </p>
          <p className="text-xs text-espresso-700/60">
            Nantikan update katalog terbaru segera.
          </p>
        </div>
      ) : (
        <div className="space-y-8 sm:space-y-10">
          {Array.from(groupedData.entries()).map(([eventName, brandMap]) => (
            <section key={eventName} className="space-y-4 sm:space-y-5">
              {/* Event Section Heading */}
              <div className="flex items-center gap-2 border-b border-cream-300 pb-2">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rosebrand-500"></span>
                <h2 className="text-base sm:text-xl font-bold text-espresso-900 tracking-tight">
                  {eventName}
                </h2>
                <span className="text-[9px] sm:text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                  Aktif
                </span>
              </div>

              {/* Sub-groups by Brand */}
              <div className="space-y-5">
                {Array.from(brandMap.entries()).map(([brandName, brandPages]) => (
                  <div key={brandName} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-espresso-900 uppercase tracking-wide bg-cream-100 border border-cream-200 px-2.5 py-1 rounded-md">
                          Brand: {brandName}
                        </h3>
                        <span className="text-[11px] sm:text-xs text-espresso-700/60 font-medium">({brandPages.length} Halaman)</span>
                      </div>
                      <span className="text-[11px] text-rosebrand-600 font-medium">Buka & Geser →</span>
                    </div>

                    {/* Catalog Pages Grid (Responsive for Mobile: 2 cols, Tablet: 3-4 cols, Desktop: 5 cols) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
                      {brandPages.map((page, idx) => (
                        <div
                          key={page.id}
                          onClick={() => openLightbox(brandPages, idx)}
                          className="bg-white rounded-xl border border-cream-200 overflow-hidden shadow-xs hover:shadow-sm transition cursor-pointer group flex flex-col active:scale-[0.98]"
                        >
                          <div className="relative aspect-[3/4] bg-cream-50 overflow-hidden">
                            <img
                              src={page.imageUrl}
                              alt={`${page.brand} Hal ${page.pageNumber}`}
                              loading="lazy"
                              className="w-full h-full object-contain group-hover:scale-102 transition duration-200 bg-white"
                            />
                            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
                              <span className="bg-espresso-900/75 text-white text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
                                Hal {page.pageNumber}
                              </span>
                            </div>
                          </div>

                          <div className="p-2 bg-cream-50/40 border-t border-cream-200 text-center">
                            <p className="text-[11px] sm:text-xs font-bold text-espresso-900 truncate">
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

      {/* Lightbox Fullscreen with Next/Prev and Swipe Support */}
      {currentItem && lightboxGroup && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex flex-col justify-between p-2 sm:p-4 select-none touch-none"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Bar: Info & Close Button */}
          <div
            className="flex items-center justify-between py-2 px-3 bg-white/10 rounded-xl text-white backdrop-blur-md shrink-0 mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-[11px] font-bold text-rosebrand-200 uppercase tracking-wide block">
                {currentItem.brand} — {currentItem.event}
              </span>
              <span className="text-xs font-semibold text-white">
                Halaman {currentItem.pageNumber} ({lightboxIndex + 1} dari {lightboxGroup.length})
              </span>
            </div>

            <button
              onClick={closeLightbox}
              className="bg-white/20 hover:bg-white/30 active:scale-90 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold transition"
              title="Tutup (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Center Image Container with Previous & Next Navigation */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-hidden min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Button */}
            {lightboxGroup.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  showPrev();
                }}
                className="absolute left-1 sm:left-4 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/75 active:scale-90 text-white flex items-center justify-center text-xl font-bold transition border border-white/20 backdrop-blur-xs shadow-lg"
                title="Halaman Sebelumnya (←)"
              >
                ‹
              </button>
            )}

            {/* Main Image */}
            <img
              src={currentItem.imageUrl}
              alt={`${currentItem.brand} Halaman ${currentItem.pageNumber}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
            />

            {/* Next Button */}
            {lightboxGroup.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  showNext();
                }}
                className="absolute right-1 sm:right-4 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/75 active:scale-90 text-white flex items-center justify-center text-xl font-bold transition border border-white/20 backdrop-blur-xs shadow-lg"
                title="Halaman Berikutnya (→)"
              >
                ›
              </button>
            )}
          </div>

          {/* Bottom Bar: Touch Indicator & Quick Page Dots on Mobile */}
          <div
            className="py-2 text-center text-white/70 text-[11px] shrink-0 mt-2 flex items-center justify-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={showPrev}
              disabled={lightboxGroup.length <= 1}
              className="px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20 active:scale-95 text-xs text-white"
            >
              ← Sebelumnya
            </button>
            <span className="text-[10px] opacity-75 hidden sm:inline">
              Gunakan tombol panah ‹ ›, tombol keyboard (← / →), atau geser layar di HP
            </span>
            <span className="text-[10px] opacity-75 sm:hidden">
              Geser layar untuk ganti halaman
            </span>
            <button
              onClick={showNext}
              disabled={lightboxGroup.length <= 1}
              className="px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20 active:scale-95 text-xs text-white"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
