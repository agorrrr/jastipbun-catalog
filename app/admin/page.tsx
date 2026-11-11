'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CatalogItem } from '../lib/types';
import { getAllCatalog, saveManyCatalogItems, deleteCatalogItem, clearCatalog } from '../lib/storage';

interface DraftItem {
  id: string;
  pageNumber: number;
  imageUrl: string;
  name: string;
  brand: string;
  event: string;
  price: number;
  fee: number;
  status: 'ready' | 'limited' | 'sold_out';
  notes: string;
}

export default function AdminPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [event, setEvent] = useState('');
  const [brand, setBrand] = useState('');
  const [defaultFee, setDefaultFee] = useState<number>(25000);
  const [defaultPrice, setDefaultPrice] = useState<number>(150000);

  // PDF processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  async function loadCatalog() {
    setLoading(true);
    const data = await getAllCatalog();
    setItems(data);
    setLoading(false);
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!brand.trim() || !event.trim()) {
      alert('Isi nama Event dan Brand dulu sebelum upload PDF!');
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
        setProgressText(`Mengonversi halaman ${i} dari ${numPages}...`);
        const page = await pdf.getPage(i);

        // Viewport scale 1.2 cukup tajam tapi tetap ringan
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          // Kompresi WebP/JPEG ringan kualitas 0.8
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

          // Coba ambil teks halaman jika ada
          let pageText = '';
          try {
            const textContent = await page.getTextContent();
            pageText = textContent.items
              .map((item: any) => item.str)
              .filter((s: string) => s && s.trim().length > 1)
              .slice(0, 5)
              .join(' ');
          } catch {
            pageText = '';
          }

          extracted.push({
            id: `item-${Date.now()}-${i}`,
            pageNumber: i,
            imageUrl: dataUrl,
            name: pageText.trim() ? `${brand} - ${pageText.substring(0, 35)}...` : `${brand} Item #${i}`,
            brand: brand.trim(),
            event: event.trim(),
            price: defaultPrice,
            fee: defaultFee,
            status: 'ready',
            notes: `Halaman ${i} dari katalog PDF`,
          });
        }
      }

      setDrafts(extracted);
      setProgressText(`Selesai! ${extracted.length} halaman berhasil diekstrak.`);
    } catch (err: any) {
      console.error(err);
      alert('Gagal membaca PDF: ' + err.message);
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
    await loadCatalog();
    alert(`${newItems.length} barang berhasil disimpan ke katalog publik!`);
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus barang ini dari katalog?')) return;
    await deleteCatalogItem(id);
    await loadCatalog();
  }

  async function handleClearAll() {
    if (!confirm('Yakin ingin mengosongkan semua data katalog?')) return;
    await clearCatalog();
    await loadCatalog();
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Katalog Jastip</h1>
          <p className="text-sm text-slate-500">
            Upload PDF katalog brand/event. Sistem langsung konversi jadi item kartu foto ringan untuk pembeli.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold text-rose-600 hover:text-rose-700 gap-1"
        >
          ← Lihat Katalog Publik
        </Link>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center">1</span>
          Upload & Ekstrak PDF Katalog
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nama Event *</label>
            <input
              type="text"
              placeholder="Contoh: Jakarta Sneaker Day 2026"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Brand *</label>
            <input
              type="text"
              placeholder="Contoh: Uniqlo, Pop Mart, Zara"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Default Harga Barang (Rp)</label>
            <input
              type="number"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(Number(e.target.value))}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Default Jastip Fee (Rp)</label>
            <input
              type="number"
              value={defaultFee}
              onChange={(e) => setDefaultFee(Number(e.target.value))}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* File drop zone */}
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition cursor-pointer relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            disabled={isProcessing}
            onChange={handlePdfUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="space-y-2 pointer-events-none">
            <svg className="w-12 h-12 text-slate-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-semibold text-slate-700">
              {isProcessing ? progressText : 'Klik atau drag & drop file PDF katalog ke sini'}
            </p>
            <p className="text-xs text-slate-500">
              PDF akan otomatis dipotong per halaman menjadi gambar JPEG terkompresi tanpa membebani browser pembeli.
            </p>
          </div>
        </div>
      </div>

      {/* Drafts Review Section */}
      {drafts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center">2</span>
                Review Hasil Ekstrak ({drafts.length} Item)
              </h2>
              <p className="text-xs text-slate-500">
                Sesuaikan nama, harga, dan hapus halaman yang bukan produk (cover, ketentuan).
              </p>
            </div>
            <button
              onClick={saveAllDrafts}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-lg shadow transition"
            >
              Simpan Semua ke Katalog Publik →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {drafts.map((draft, idx) => (
              <div key={draft.id} className="border border-slate-200 rounded-lg overflow-hidden flex flex-col bg-slate-50">
                <div className="relative aspect-[3/4] bg-slate-200">
                  <img
                    src={draft.imageUrl}
                    alt={draft.name}
                    className="w-full h-full object-contain bg-white"
                  />
                  <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    Hal {draft.pageNumber}
                  </span>
                  <button
                    onClick={() => removeDraft(idx)}
                    title="Hapus item ini"
                    className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-700 shadow"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">Nama Barang</label>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => updateDraft(idx, 'name', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 font-medium bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500">Harga (Rp)</label>
                      <input
                        type="number"
                        value={draft.price}
                        onChange={(e) => updateDraft(idx, 'price', Number(e.target.value))}
                        className="w-full border border-slate-300 rounded px-2 py-1 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500">Fee (Rp)</label>
                      <input
                        type="number"
                        value={draft.fee}
                        onChange={(e) => updateDraft(idx, 'fee', Number(e.target.value))}
                        className="w-full border border-slate-300 rounded px-2 py-1 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">Status Stok</label>
                    <select
                      value={draft.status}
                      onChange={(e) => updateDraft(idx, 'status', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-xs font-medium"
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

      {/* Existing Catalog Items */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Daftar Katalog Aktif ({items.length} Item)</h2>
            <p className="text-xs text-slate-500">Semua barang yang saat ini tampil di dashboard pelanggan Jastipbun.</p>
          </div>
          <button
            onClick={handleClearAll}
            className="text-xs text-red-600 hover:text-red-700 underline font-medium"
          >
            Kosongkan Semua
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Memuat data katalog...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">Belum ada barang di katalog. Silakan upload PDF di atas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase">
                  <th className="py-2.5 px-3">Foto</th>
                  <th className="py-2.5 px-3">Nama Produk</th>
                  <th className="py-2.5 px-3">Brand</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Harga</th>
                  <th className="py-2.5 px-3">Fee Jastip</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <img src={it.imageUrl} alt={it.name} className="w-12 h-12 object-cover rounded bg-slate-100 border border-slate-200" />
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 max-w-[200px] truncate">{it.name}</td>
                    <td className="py-2 px-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                        {it.brand}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{it.event}</td>
                    <td className="py-2 px-3 font-mono">Rp {it.price.toLocaleString('id-ID')}</td>
                    <td className="py-2 px-3 font-mono text-rose-600">+Rp {it.fee.toLocaleString('id-ID')}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        it.status === 'ready'
                          ? 'bg-emerald-100 text-emerald-800'
                          : it.status === 'limited'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {it.status === 'ready' ? 'Ready' : it.status === 'limited' ? 'Sisa Dikit' : 'Habis'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleDelete(it.id)}
                        className="text-red-600 hover:text-red-800 font-semibold text-xs"
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
