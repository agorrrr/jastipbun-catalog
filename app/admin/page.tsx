'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CatalogPageItem, EventMeta } from '../lib/types';
import {
  getAllPages,
  getEvents,
  saveEvent,
  toggleEventActive,
  saveManyPages,
  deletePage,
  deleteBrandInEvent,
  clearAllData
} from '../lib/storage';

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Data state
  const [pages, setPages] = useState<CatalogPageItem[]>([]);
  const [events, setEvents] = useState<EventMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedEventName, setSelectedEventName] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [brandMode, setBrandMode] = useState<'existing' | 'new'>('new');
  const [selectedExistingBrand, setSelectedExistingBrand] = useState('');
  const [newBrandName, setNewBrandName] = useState('');

  // Upload & processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [draftPages, setDraftPages] = useState<CatalogPageItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = sessionStorage.getItem('jastipbun_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      loadData();
    }
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (username.trim() === 'ibun' && password.trim() === 'ibuncantik') {
      sessionStorage.setItem('jastipbun_auth', 'true');
      setIsAuthenticated(true);
      setAuthError('');
      loadData();
    } else {
      setAuthError('Username atau password salah.');
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('jastipbun_auth');
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  }

  async function loadData() {
    setLoading(true);
    const [allPages, evList] = await Promise.all([getAllPages(), getEvents()]);
    setPages(allPages);
    setEvents(evList);
    if (evList.length > 0 && !selectedEventName) {
      setSelectedEventName(evList[0].name);
    }
    setLoading(false);
  }

  // Brands already in the currently selected event
  const existingBrandsInSelectedEvent = Array.from(
    new Set(
      pages
        .filter((p) => p.event === selectedEventName)
        .map((p) => p.brand)
        .filter(Boolean)
    )
  );

  async function handleToggleEvent(name: string, currentStatus: boolean) {
    await toggleEventActive(name, !currentStatus);
    await loadData();
  }

  async function handleAddNewEvent() {
    if (!newEventName.trim()) return;
    const clean = newEventName.trim();
    await saveEvent({ name: clean, active: true });
    setNewEventName('');
    await loadData();
    setSelectedEventName(clean);
  }

  // Quick action: Click "+ Tambah Halaman" on existing brand card
  function handleQuickAddToBrand(eventName: string, targetBrand: string) {
    setSelectedEventName(eventName);
    setBrandMode('existing');
    setSelectedExistingBrand(targetBrand);
    if (uploadSectionRef.current) {
      uploadSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    // trigger file picker directly
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  // Effective brand name based on mode
  const currentBrand =
    brandMode === 'existing' ? selectedExistingBrand.trim() : newBrandName.trim();

  // Compress an image file to lightweight JPEG DataURL
  function compressImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(event.target?.result as string);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFilesUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const targetEvent = selectedEventName.trim();
    if (!currentBrand || !targetEvent) {
      alert('Pilih Event dan tentukan nama Brand dulu sebelum upload file!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Hitung nomor halaman lanjutan untuk brand ini
    const existingCount = pages.filter(
      (p) => p.event === targetEvent && p.brand.toLowerCase() === currentBrand.toLowerCase()
    ).length;
    let nextStartPage = existingCount + draftPages.length + 1;

    setIsProcessing(true);
    setProgressText('Memulai proses file...');

    const extracted: CatalogPageItem[] = [];

    try {
      for (let fIdx = 0; fIdx < files.length; fIdx++) {
        const file = files[fIdx];

        if (file.type === 'application/pdf') {
          // Process PDF
          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib) {
            alert('Library PDF belum siap. Muat ulang halaman.');
            setIsProcessing(false);
            return;
          }
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          setProgressText(`Membaca PDF: ${file.name}...`);
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const numPages = pdf.numPages;

          for (let i = 1; i <= numPages; i++) {
            setProgressText(`Mengonversi halaman ${i} dari ${numPages}...`);
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.4 });
            const canvas = document.createElement('canvas');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            const context = canvas.getContext('2d');

            if (context) {
              await page.render({ canvasContext: context, viewport }).promise;
              const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

              extracted.push({
                id: `page-${Date.now()}-${fIdx}-${i}`,
                brand: currentBrand,
                event: targetEvent,
                pageNumber: nextStartPage++,
                imageUrl: dataUrl,
              });
            }
          }
        } else if (file.type.startsWith('image/')) {
          // Process Direct Image (JPG, PNG, WebP)
          setProgressText(`Memproses foto (${fIdx + 1} dari ${files.length})...`);
          const dataUrl = await compressImageFile(file);
          extracted.push({
            id: `page-${Date.now()}-${fIdx}`,
            brand: currentBrand,
            event: targetEvent,
            pageNumber: nextStartPage++,
            imageUrl: dataUrl,
          });
        }
      }

      setDraftPages((prev) => [...prev, ...extracted]);
      setProgressText(`Selesai! ${extracted.length} halaman/foto baru siap disimpan.`);
    } catch (err: any) {
      console.error(err);
      alert('Gagal memproses file: ' + err.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeDraftPage(index: number) {
    setDraftPages(draftPages.filter((_, i) => i !== index));
  }

  async function saveAllDrafts() {
    if (draftPages.length === 0) return;
    await saveManyPages(draftPages);
    setDraftPages([]);
    await loadData();
    alert(`${draftPages.length} halaman/foto berhasil ditambahkan ke katalog ${currentBrand}!`);
  }

  async function handleDeleteSinglePage(id: string) {
    if (!confirm('Hapus halaman ini?')) return;
    await deletePage(id);
    await loadData();
  }

  async function handleDeleteBrandCatalog(eventName: string, brandName: string) {
    if (!confirm(`Hapus seluruh katalog brand "${brandName}" pada event "${eventName}"?`)) return;
    await deleteBrandInEvent(eventName, brandName);
    await loadData();
  }

  async function handleClearAll() {
    if (!confirm('Kosongkan semua data katalog dan event?')) return;
    await clearAllData();
    await loadData();
  }

  // Summary by Brand & Event
  const catalogGroups = pages.reduce((acc, p) => {
    const key = `${p.event}__${p.brand}`;
    if (!acc[key]) {
      acc[key] = { event: p.event, brand: p.brand, count: 0, preview: p.imageUrl };
    }
    acc[key].count++;
    return acc;
  }, {} as Record<string, { event: string; brand: string; count: number; preview: string }>);

  // If not authenticated, show Login Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-14 bg-white p-7 rounded-2xl border border-cream-200 shadow-sm">
        <div className="text-center space-y-2 mb-6">
          <img
            src="/logo.jpg"
            alt="Logo Jastipbun"
            className="w-16 h-16 rounded-full mx-auto border border-rosebrand-500/40 shadow-xs"
          />
          <h1 className="text-xl font-bold text-espresso-900">Login Admin</h1>
          <p className="text-xs text-espresso-700/60">
            Akses khusus pengelola Jastipbun.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-espresso-800 uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full text-sm rounded-lg border border-cream-300 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-rosebrand-500 bg-cream-50/50"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-espresso-800 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm rounded-lg border border-cream-300 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-rosebrand-500 bg-cream-50/50"
            />
            {authError && <p className="text-xs text-rosebrand-600 mt-2 font-semibold">{authError}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-rosebrand-500 hover:bg-rosebrand-600 text-white font-bold text-sm rounded-lg shadow-xs transition"
          >
            Masuk →
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-cream-200 text-center">
          <Link href="/" className="text-xs text-espresso-700/70 hover:text-espresso-900 font-medium">
            ← Kembali ke Katalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-200 pb-4">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full border border-rosebrand-500/50 shadow-xs" />
          <div>
            <h1 className="text-2xl font-bold text-espresso-900">Panel Admin Jastipbun</h1>
            <p className="text-xs text-espresso-700/70">
              Kelola event aktif/nonaktif dan tambah foto/katalog ke brand baru maupun brand eksis.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-bold text-rosebrand-600 hover:underline"
          >
            Lihat Katalog Publik
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-cream-300 hover:bg-cream-200 text-espresso-800"
          >
            Keluar Admin
          </button>
        </div>
      </div>

      {/* Event Management Section */}
      <div className="bg-white rounded-xl border border-cream-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cream-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-espresso-900">Status Event Hunting</h2>
            <p className="text-xs text-espresso-700/70">
              Hanya event <strong>Aktif</strong> yang akan tampil di katalog publik.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Nama event baru..."
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              className="text-xs border border-cream-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rosebrand-500 bg-cream-50/50"
            />
            <button
              onClick={handleAddNewEvent}
              className="text-xs bg-espresso-800 text-cream-50 font-bold px-3 py-1.5 rounded-lg hover:bg-espresso-900 transition"
            >
              + Tambah Event
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <p className="text-xs text-espresso-700/60 py-2">Belum ada event. Tambahkan event di atas.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {events.map((ev) => (
              <div
                key={ev.name}
                className={`p-3 rounded-lg border flex items-center justify-between transition ${
                  ev.active
                    ? 'bg-emerald-50/60 border-emerald-300/80'
                    : 'bg-cream-100/50 border-cream-200 opacity-60'
                }`}
              >
                <div>
                  <p className="font-bold text-xs text-espresso-900">{ev.name}</p>
                  <span className={`text-[10px] font-bold ${ev.active ? 'text-emerald-700' : 'text-espresso-700/60'}`}>
                    {ev.active ? '● Aktif' : '○ Nonaktif'}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleEvent(ev.name, ev.active)}
                  className={`text-xs font-bold px-3 py-1 rounded-md transition ${
                    ev.active
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-cream-300 text-espresso-800 hover:bg-cream-400'
                  }`}
                >
                  {ev.active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Section (Support PDF or Multiple Images) */}
      <div ref={uploadSectionRef} className="bg-white rounded-xl border border-cream-200 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cream-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-espresso-900">Upload PDF atau Foto Katalog</h2>
            <p className="text-xs text-espresso-700/70">
              Bisa upload file PDF katalog ATAU langsung pilih banyak foto dari galeri HP.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-espresso-800 uppercase mb-1">Pilih Event *</label>
            <select
              value={selectedEventName}
              onChange={(e) => {
                setSelectedEventName(e.target.value);
                setBrandMode('new');
              }}
              className="w-full text-xs rounded-lg border border-cream-300 px-3 py-2.5 bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-rosebrand-500 font-semibold"
            >
              {events.length === 0 ? (
                <option value="">(Belum ada event - Buat di atas)</option>
              ) : (
                events.map((e) => (
                  <option key={e.name} value={e.name}>
                    {e.name} {e.active ? '(Aktif)' : '(Nonaktif)'}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-espresso-800 uppercase">
                Pilih / Masukkan Brand *
              </label>
              {existingBrandsInSelectedEvent.length > 0 && (
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBrandMode('existing')}
                    className={`font-semibold ${
                      brandMode === 'existing'
                        ? 'text-rosebrand-600 underline'
                        : 'text-espresso-700/60 hover:text-espresso-800'
                    }`}
                  >
                    Brand Eksis ({existingBrandsInSelectedEvent.length})
                  </button>
                  <span className="text-cream-300">|</span>
                  <button
                    type="button"
                    onClick={() => setBrandMode('new')}
                    className={`font-semibold ${
                      brandMode === 'new'
                        ? 'text-rosebrand-600 underline'
                        : 'text-espresso-700/60 hover:text-espresso-800'
                    }`}
                  >
                    + Brand Baru
                  </button>
                </div>
              )}
            </div>

            {brandMode === 'existing' && existingBrandsInSelectedEvent.length > 0 ? (
              <select
                value={selectedExistingBrand}
                onChange={(e) => setSelectedExistingBrand(e.target.value)}
                className="w-full text-xs rounded-lg border border-cream-300 px-3 py-2.5 bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-rosebrand-500 font-bold text-rosebrand-600"
              >
                <option value="">-- Pilih Brand yang Mau Ditambahkan Foto --</option>
                {existingBrandsInSelectedEvent.map((b) => (
                  <option key={b} value={b}>
                    {b} (Lanjutkan halaman katalog)
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Contoh: Zara, Uniqlo, Gentle Monster"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                className="w-full text-xs rounded-lg border border-cream-300 px-3 py-2.5 bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-rosebrand-500"
              />
            )}
          </div>
        </div>

        {/* Drop zone for PDF and Images */}
        <div className="border-2 border-dashed border-cream-300 rounded-xl p-8 text-center hover:bg-cream-50 transition cursor-pointer relative">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,image/png,image/jpeg,image/webp"
            disabled={isProcessing}
            onChange={handleFilesUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="space-y-2 pointer-events-none">
            <svg className="w-10 h-10 text-rosebrand-500/60 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-bold text-espresso-900">
              {isProcessing ? progressText : 'Klik atau seret file PDF / Foto ke sini'}
            </p>
            <p className="text-xs text-espresso-700/60">
              Mendukung file <strong>PDF</strong> atau <strong>Foto langsung (JPG, PNG, WebP)</strong>. Nomor halaman otomatis melanjutkan yang sudah ada.
            </p>
            {currentBrand && (
              <p className="text-[11px] font-bold text-rosebrand-600">
                Target: Brand &quot;{currentBrand}&quot; ({selectedEventName})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Review Extracted / Uploaded Pages */}
      {draftPages.length > 0 && (
        <div className="bg-white rounded-xl border border-cream-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-espresso-900">
                Review Halaman / Foto Tambahan ({draftPages.length} Item)
              </h2>
              <p className="text-xs text-espresso-700/70">
                Brand: <strong>{currentBrand}</strong> | Event: <strong>{selectedEventName}</strong>. Halaman akan otomatis bersambung di urutan berikutnya.
              </p>
            </div>
            <button
              onClick={saveAllDrafts}
              className="px-5 py-2.5 bg-rosebrand-500 hover:bg-rosebrand-600 text-white font-bold text-sm rounded-lg shadow-xs transition"
            >
              Simpan Semua ke Katalog Publik →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            {draftPages.map((draft, idx) => (
              <div key={draft.id} className="border border-cream-200 rounded-lg overflow-hidden flex flex-col bg-cream-50/50">
                <div className="relative aspect-[3/4] bg-cream-100">
                  <img
                    src={draft.imageUrl}
                    alt={`Hal ${draft.pageNumber}`}
                    className="w-full h-full object-contain bg-white"
                  />
                  <span className="absolute top-1.5 left-1.5 bg-espresso-900/80 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    Hal {draft.pageNumber}
                  </span>
                  <button
                    onClick={() => removeDraftPage(idx)}
                    title="Hapus foto"
                    className="absolute top-1.5 right-1.5 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-red-700 shadow-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary of Uploaded Brand Catalogs */}
      <div className="bg-white rounded-xl border border-cream-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-espresso-900">Daftar Katalog Brand Aktif</h2>
            <p className="text-xs text-espresso-700/70">Klik &quot;+ Tambah Foto&quot; pada brand untuk menyambung halaman katalog.</p>
          </div>
          <button
            onClick={handleClearAll}
            className="text-xs text-red-600 hover:text-red-700 underline font-bold"
          >
            Kosongkan Database
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-espresso-700/60 py-6 text-center">Memuat katalog...</p>
        ) : Object.keys(catalogGroups).length === 0 ? (
          <p className="text-sm text-espresso-700/60 py-6 text-center">Belum ada katalog yang diunggah.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(catalogGroups).map(([key, grp]) => (
              <div key={key} className="border border-cream-200 rounded-xl p-3.5 flex flex-col justify-between bg-cream-50/50 space-y-3">
                <div className="flex items-center gap-3">
                  <img src={grp.preview} alt={grp.brand} className="w-14 h-18 object-cover rounded-lg border border-cream-200 bg-white shadow-xs shrink-0" />
                  <div>
                    <h3 className="font-extrabold text-espresso-900 text-sm">{grp.brand}</h3>
                    <p className="text-xs text-espresso-700/70">{grp.event}</p>
                    <span className="text-[11px] font-bold text-rosebrand-600">{grp.count} Halaman</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-cream-200/80">
                  <button
                    onClick={() => handleQuickAddToBrand(grp.event, grp.brand)}
                    className="text-xs font-bold text-rosebrand-600 hover:text-rosebrand-700 bg-white hover:bg-cream-100 border border-cream-300 px-3 py-1.5 rounded-lg shadow-2xs transition"
                  >
                    + Tambah Foto / PDF
                  </button>
                  <button
                    onClick={() => handleDeleteBrandCatalog(grp.event, grp.brand)}
                    className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
