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
  const [brand, setBrand] = useState('');

  // PDF processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [draftPages, setDraftPages] = useState<CatalogPageItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetEvent = selectedEventName.trim();
    if (!brand.trim() || !targetEvent) {
      alert('Pilih Event dan isi nama Brand dulu sebelum upload PDF!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
      alert('Library PDF belum siap. Muat ulang halaman.');
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    setIsProcessing(true);
    setProgressText('Membaca file PDF...');
    setDraftPages([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const extracted: CatalogPageItem[] = [];

      for (let i = 1; i <= numPages; i++) {
        setProgressText(`Mengonversi halaman ${i} dari ${numPages}...`);
        const page = await pdf.getPage(i);

        const viewport = page.getViewport({ scale: 1.4 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

          extracted.push({
            id: `page-${Date.now()}-${i}`,
            brand: brand.trim(),
            event: targetEvent,
            pageNumber: i,
            imageUrl: dataUrl,
          });
        }
      }

      setDraftPages(extracted);
      setProgressText(`Selesai! ${extracted.length} halaman siap disimpan.`);
    } catch (err: any) {
      console.error(err);
      alert('Gagal memproses PDF: ' + err.message);
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
    alert(`${draftPages.length} halaman katalog ${brand} berhasil disimpan!`);
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
              Kelola status event aktif/nonaktif dan upload katalog PDF.
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

      {/* PDF Upload Section */}
      <div className="bg-white rounded-xl border border-cream-200 shadow-xs p-6 space-y-6">
        <h2 className="text-lg font-bold text-espresso-900">Upload File PDF Katalog</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-espresso-800 uppercase mb-1">Pilih Event *</label>
            <select
              value={selectedEventName}
              onChange={(e) => setSelectedEventName(e.target.value)}
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
            <label className="block text-xs font-semibold text-espresso-800 uppercase mb-1">Nama Brand *</label>
            <input
              type="text"
              placeholder="Contoh: Zara, Uniqlo, Gentle Monster"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full text-xs rounded-lg border border-cream-300 px-3 py-2.5 bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-rosebrand-500"
            />
          </div>
        </div>

        {/* Drop zone */}
        <div className="border-2 border-dashed border-cream-300 rounded-xl p-8 text-center hover:bg-cream-50 transition cursor-pointer relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            disabled={isProcessing}
            onChange={handlePdfUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="space-y-2 pointer-events-none">
            <svg className="w-10 h-10 text-rosebrand-500/60 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-bold text-espresso-900">
              {isProcessing ? progressText : 'Klik atau seret file PDF katalog ke sini'}
            </p>
            <p className="text-xs text-espresso-700/60">
              Semua halaman PDF akan dikonversi menjadi galeri gambar tajam & ringan per halaman tanpa merusak desain katalog asli.
            </p>
          </div>
        </div>
      </div>

      {/* Review Extracted Pages */}
      {draftPages.length > 0 && (
        <div className="bg-white rounded-xl border border-cream-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-espresso-900">
                Review Halaman Katalog ({draftPages.length} Halaman)
              </h2>
              <p className="text-xs text-espresso-700/70">
                Brand: <strong>{brand}</strong> | Event: <strong>{selectedEventName}</strong>. Hapus halaman yang tidak dibutuhkan sebelum disimpan.
              </p>
            </div>
            <button
              onClick={saveAllDrafts}
              className="px-5 py-2.5 bg-rosebrand-500 hover:bg-rosebrand-600 text-white font-bold text-sm rounded-lg shadow-xs transition"
            >
              Simpan Semua Halaman ke Publik →
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
                    title="Hapus halaman"
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
            <p className="text-xs text-espresso-700/70">Katalog PDF yang sudah diunggah dan tayang di publik.</p>
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
          <p className="text-sm text-espresso-700/60 py-6 text-center">Belum ada katalog PDF yang diunggah.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(catalogGroups).map(([key, grp]) => (
              <div key={key} className="border border-cream-200 rounded-xl p-3 flex gap-3 bg-cream-50/50 items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={grp.preview} alt={grp.brand} className="w-14 h-16 object-cover rounded-lg border border-cream-200 bg-white" />
                  <div>
                    <h3 className="font-extrabold text-espresso-900 text-sm">{grp.brand}</h3>
                    <p className="text-xs text-espresso-700/70">{grp.event}</p>
                    <span className="text-[11px] font-bold text-rosebrand-600">{grp.count} Halaman</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteBrandCatalog(grp.event, grp.brand)}
                  className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
