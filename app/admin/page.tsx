'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CatalogItem, EventMeta } from '../lib/types';
import {
  getAllCatalog,
  getEvents,
  saveEvent,
  toggleEventActive,
  saveManyCatalogItems,
  deleteCatalogItem,
  clearCatalog
} from '../lib/storage';

interface DraftItem {
  id: string;
  pageNumber: number;
  partIndex?: number;
  imageUrl: string;
  name: string;
  brand: string;
  event: string;
  price: number;
  fee: number;
  status: 'ready' | 'limited' | 'sold_out';
  notes: string;
}

const DEFAULT_PIN = 'admin123';

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [inputPin, setInputPin] = useState('');
  const [authError, setAuthError] = useState('');

  // Catalog & Event state
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [events, setEvents] = useState<EventMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedEventName, setSelectedEventName] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [brand, setBrand] = useState('');
  const [defaultFee, setDefaultFee] = useState<number>(25000);
  const [defaultPrice, setDefaultPrice] = useState<number>(150000);
  const [splitMode, setSplitMode] = useState<'1' | '2' | '4'>('1');

  // PDF processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
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
    if (inputPin === DEFAULT_PIN) {
      sessionStorage.setItem('jastipbun_auth', 'true');
      setIsAuthenticated(true);
      setAuthError('');
      loadData();
    } else {
      setAuthError('PIN Admin salah. Default: admin123');
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('jastipbun_auth');
    setIsAuthenticated(false);
    setInputPin('');
  }

  async function loadData() {
    setLoading(true);
    const [catItems, evList] = await Promise.all([getAllCatalog(), getEvents()]);
    setItems(catItems);
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
      alert('Library PDF.js belum siap. Muat ulang halaman.');
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    setIsProcessing(true);
    setProgressText('Membaca file PDF...');
    setDrafts([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const extracted: DraftItem[] = [];

      for (let i = 1; i <= numPages; i++) {
        setProgressText(`Memproses halaman ${i} dari ${numPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;

          if (splitMode === '1') {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            extracted.push({
              id: `item-${Date.now()}-${i}`,
              pageNumber: i,
              imageUrl: dataUrl,
              name: `${brand} - Produk Hal ${i}`,
              brand: brand.trim(),
              event: targetEvent,
              price: defaultPrice,
              fee: defaultFee,
              status: 'ready',
              notes: `Halaman ${i}`
            });
          } else if (splitMode === '2') {
            const halfH = Math.floor(canvas.height / 2);
            for (let part = 0; part < 2; part++) {
              const partCanvas = document.createElement('canvas');
              partCanvas.width = canvas.width;
              partCanvas.height = halfH;
              const pCtx = partCanvas.getContext('2d');
              if (pCtx) {
                pCtx.drawImage(canvas, 0, part * halfH, canvas.width, halfH, 0, 0, canvas.width, halfH);
                extracted.push({
                  id: `item-${Date.now()}-${i}-${part + 1}`,
                  pageNumber: i,
                  partIndex: part + 1,
                  imageUrl: partCanvas.toDataURL('image/jpeg', 0.8),
                  name: `${brand} - Produk Hal ${i} (#${part + 1})`,
                  brand: brand.trim(),
                  event: targetEvent,
                  price: defaultPrice,
                  fee: defaultFee,
                  status: 'ready',
                  notes: `Halaman ${i} bagian ${part === 0 ? 'atas' : 'bawah'}`
                });
              }
            }
          } else if (splitMode === '4') {
            const halfW = Math.floor(canvas.width / 2);
            const halfH = Math.floor(canvas.height / 2);
            let partCount = 1;
            for (let row = 0; row < 2; row++) {
              for (let col = 0; col < 2; col++) {
                const partCanvas = document.createElement('canvas');
                partCanvas.width = halfW;
                partCanvas.height = halfH;
                const pCtx = partCanvas.getContext('2d');
                if (pCtx) {
                  pCtx.drawImage(canvas, col * halfW, row * halfH, halfW, halfH, 0, 0, halfW, halfH);
                  extracted.push({
                    id: `item-${Date.now()}-${i}-${partCount}`,
                    pageNumber: i,
                    partIndex: partCount,
                    imageUrl: partCanvas.toDataURL('image/jpeg', 0.8),
                    name: `${brand} - Item Hal ${i} (#${partCount})`,
                    brand: brand.trim(),
                    event: targetEvent,
                    price: defaultPrice,
                    fee: defaultFee,
                    status: 'ready',
                    notes: `Halaman ${i} kuadran ${partCount}`
                  });
                  partCount++;
                }
              }
            }
          }
        }
      }

      setDrafts(extracted);
      setProgressText(`Selesai! ${extracted.length} item berhasil diekstrak.`);
    } catch (err: any) {
      console.error(err);
      alert('Gagal memproses PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function updateDraft(index: number, key: keyof DraftItem, value: any) {
    const updated = [...drafts];
    updated[index] = { ...updated[index], [key]: value };
    setDrafts(updated);
  }

  function removeDraft(index: number) {
    setDrafts(drafts.filter((_, i) => i !== index));
  }

  async function saveAllDrafts() {
    if (drafts.length === 0) return;
    const newItems: CatalogItem[] = drafts.map(d => ({
      id: d.id,
      name: d.name,
      brand: d.brand,
      event: d.event,
      price: Number(d.price) || 0,
      fee: Number(d.fee) || 0,
      status: d.status,
      imageUrl: d.imageUrl,
      pageNumber: d.pageNumber,
      notes: d.notes,
    }));

    await saveManyCatalogItems(newItems);
    setDrafts([]);
    await loadData();
    alert(`${newItems.length} barang berhasil disimpan ke katalog publik!`);
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus barang ini dari katalog?')) return;
    await deleteCatalogItem(id);
    await loadData();
  }

  async function handleClearAll() {
    if (!confirm('Kosongkan semua data katalog dan event?')) return;
    await clearCatalog();
    await loadData();
  }

  // If not authenticated, show Login Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white p-6 rounded-2xl border border-cream-200 shadow-md">
        <div className="text-center space-y-2 mb-6">
          <img
            src="/logo.jpg"
            alt="Logo Jastipbun"
            className="w-16 h-16 rounded-full mx-auto border-2 border-rosebrand-500 shadow-xs"
          />
          <h1 className="text-xl font-bold text-espresso-900">Login Admin Jastipbun</h1>
          <p className="text-xs text-espresso-700/60">
            Akses khusus pemilik untuk kelola status event, upload PDF, dan edit harga.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-espresso-800 uppercase mb-1">
              Masukkan PIN Admin
            </label>
            <input
              type="password"
              placeholder="Default: admin123"
              value={inputPin}
              onChange={(e) => setInputPin(e.target.value)}
              className="w-full text-sm rounded-lg border border-cream-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rosebrand-500 bg-cream-50/50"
              autoFocus
            />
            {authError && <p className="text-xs text-rosebrand-600 mt-1 font-bold">{authError}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-rosebrand-500 hover:bg-rosebrand-600 text-white font-bold text-sm rounded-lg shadow-xs transition"
          >
            Masuk Panel Admin →
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-cream-200 text-center">
          <Link href="/" className="text-xs text-espresso-700/70 hover:text-espresso-900 font-semibold">
            ← Kembali ke Katalog Publik
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
          <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full border border-rosebrand-500 shadow-xs" />
          <div>
            <h1 className="text-2xl font-bold text-espresso-900">Panel Admin Jastipbun</h1>
            <p className="text-xs text-espresso-700/70">
              Kelola status event aktif/nonaktif, potong PDF multi-produk, dan atur harga.
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
            <h2 className="text-lg font-bold text-espresso-900">Manajemen Status Event</h2>
            <p className="text-xs text-espresso-700/70">
              Hanya event dengan status <strong>Aktif</strong> yang akan tampil di katalog publik pembeli.
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {events.map((ev) => (
            <div
              key={ev.name}
              className={`p-3 rounded-lg border flex items-center justify-between transition ${
                ev.active
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-cream-100/50 border-cream-200 opacity-60'
              }`}
            >
              <div>
                <p className="font-bold text-xs text-espresso-900">{ev.name}</p>
                <span className={`text-[10px] font-bold ${ev.active ? 'text-emerald-700' : 'text-espresso-700/60'}`}>
                  {ev.active ? '● Aktif (Tampil)' : '○ Nonaktif (Disembunyikan)'}
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
      </div>

      {/* PDF Upload & Extraction Section */}
      <div className="bg-white rounded-xl border border-cream-200 shadow-xs p-6 space-y-6">
        <h2 className="text-lg font-bold text-espresso-900">Upload & Potong Katalog PDF</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-espresso-800 uppercase mb-1">Pilih Event *</label>
            <select
              value={selectedEventName}
              onChange={(e) => setSelectedEventName(e.target.value)}
              className="w-full text-xs rounded-lg border border-cream-300 px-3 py-2 bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-rosebrand-500"
            >
              {events.map((e) => (
                <option key={e.name} value={e.name}>
                  {e.name} {e.active ? '(Aktif)' : '(Nonaktif)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-espresso-800 uppercase mb-1">Brand *</label>
            <input
              type="text"
              placeholder="Contoh: Uniqlo, Pop Mart"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full text-xs rounded-lg border border-cream-300 px-3 py-2 bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-rosebrand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-espresso-800 uppercase mb-1">
              Cara Potong Per Halaman
            </label>
            <select
              value={splitMode}
              onChange={(e) => setSplitMode(e.target.value as any)}
              className="w-full text-xs rounded-lg border border-cream-300 px-3 py-2 bg-cream-50/50 font-bold text-rosebrand-600 focus:outline-none focus:ring-2 focus:ring-rosebrand-500"
            >
              <option value="1">1 Produk (Full 1 Halaman)</option>
              <option value="2">2 Produk (Atas & Bawah)</option>
              <option value="4">4 Produk (Grid 2x2)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-espresso-800 uppercase mb-1">Default Harga (Rp)</label>
            <input
              type="number"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(Number(e.target.value))}
              className="w-full text-xs rounded-lg border border-cream-300 px-3 py-2 bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-rosebrand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-espresso-800 uppercase mb-1">Default Fee Jastip (Rp)</label>
            <input
              type="number"
              value={defaultFee}
              onChange={(e) => setDefaultFee(Number(e.target.value))}
              className="w-full text-xs rounded-lg border border-cream-300 px-3 py-2 bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-rosebrand-500 font-mono"
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
              Mode potong aktif: <strong>{splitMode === '1' ? '1 halaman = 1 kartu' : splitMode === '2' ? '1 halaman = 2 kartu (atas & bawah)' : '1 halaman = 4 kartu (grid 2x2)'}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Review Extracted Items */}
      {drafts.length > 0 && (
        <div className="bg-white rounded-xl border border-cream-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-espresso-900">
                Review Hasil Potongan ({drafts.length} Item)
              </h2>
              <p className="text-xs text-espresso-700/70">
                Cek tiap item, sesuaikan nama/harga, dan hapus potongan yang bukan produk sebelum disimpan.
              </p>
            </div>
            <button
              onClick={saveAllDrafts}
              className="px-5 py-2.5 bg-rosebrand-500 hover:bg-rosebrand-600 text-white font-bold text-sm rounded-lg shadow-xs transition"
            >
              Simpan ke Katalog Publik →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {drafts.map((draft, idx) => (
              <div key={draft.id} className="border border-cream-200 rounded-lg overflow-hidden flex flex-col bg-cream-50/50">
                <div className="relative aspect-[3/4] bg-cream-100">
                  <img
                    src={draft.imageUrl}
                    alt={draft.name}
                    className="w-full h-full object-contain bg-white"
                  />
                  <span className="absolute top-2 left-2 bg-espresso-900/80 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    Hal {draft.pageNumber} {draft.partIndex ? `(#${draft.partIndex})` : ''}
                  </span>
                  <button
                    onClick={() => removeDraft(idx)}
                    title="Hapus item"
                    className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-700 shadow-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-espresso-700/70">Nama Barang</label>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => updateDraft(idx, 'name', e.target.value)}
                      className="w-full border border-cream-300 rounded px-2 py-1 font-semibold bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-espresso-700/70">Harga (Rp)</label>
                      <input
                        type="number"
                        value={draft.price}
                        onChange={(e) => updateDraft(idx, 'price', Number(e.target.value))}
                        className="w-full border border-cream-300 rounded px-2 py-1 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-espresso-700/70">Fee (Rp)</label>
                      <input
                        type="number"
                        value={draft.fee}
                        onChange={(e) => updateDraft(idx, 'fee', Number(e.target.value))}
                        className="w-full border border-cream-300 rounded px-2 py-1 bg-white font-mono text-rosebrand-600 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-espresso-700/70">Status Stok</label>
                    <select
                      value={draft.status}
                      onChange={(e) => updateDraft(idx, 'status', e.target.value)}
                      className="w-full border border-cream-300 rounded px-2 py-1 bg-white text-xs font-bold"
                    >
                      <option value="ready">Ready</option>
                      <option value="limited">Sisa Dikit</option>
                      <option value="sold_out">Habis</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Items Table */}
      <div className="bg-white rounded-xl border border-cream-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-espresso-900">Semua Item Katalog ({items.length} Item)</h2>
            <p className="text-xs text-espresso-700/70">Daftar item tersimpan saat ini di sistem.</p>
          </div>
          <button
            onClick={handleClearAll}
            className="text-xs text-red-600 hover:text-red-700 underline font-bold"
          >
            Kosongkan Database
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-espresso-700/60 py-6 text-center">Memuat item...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-espresso-700/60 py-6 text-center">Belum ada item di katalog.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-espresso-800 border-collapse">
              <thead>
                <tr className="border-b border-cream-200 bg-cream-50 text-espresso-700/70 font-bold uppercase">
                  <th className="py-2.5 px-3">Foto</th>
                  <th className="py-2.5 px-3">Nama Produk</th>
                  <th className="py-2.5 px-3">Brand</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Harga</th>
                  <th className="py-2.5 px-3">Fee</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-cream-50/60">
                    <td className="py-2 px-3">
                      <img src={it.imageUrl} alt={it.name} className="w-12 h-12 object-cover rounded bg-cream-100 border border-cream-200" />
                    </td>
                    <td className="py-2 px-3 font-bold text-espresso-900 max-w-[200px] truncate">{it.name}</td>
                    <td className="py-2 px-3 font-semibold text-espresso-800">{it.brand}</td>
                    <td className="py-2 px-3 text-espresso-700/80">{it.event}</td>
                    <td className="py-2 px-3 font-mono">Rp {it.price.toLocaleString('id-ID')}</td>
                    <td className="py-2 px-3 font-mono text-rosebrand-600 font-bold">+Rp {it.fee.toLocaleString('id-ID')}</td>
                    <td className="py-2 px-3 font-mono font-black text-espresso-900">
                      Rp {(it.price + it.fee).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        it.status === 'ready'
                          ? 'bg-emerald-100 text-emerald-800'
                          : it.status === 'limited'
                          ? 'bg-goldbrand-100 text-espresso-900'
                          : 'bg-cream-300 text-espresso-700'
                      }`}>
                        {it.status === 'ready' ? 'Ready' : it.status === 'limited' ? 'Sisa Dikit' : 'Habis'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleDelete(it.id)}
                        className="text-red-600 hover:text-red-800 font-bold text-xs"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
