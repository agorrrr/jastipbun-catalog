'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CatalogItem, CartItem } from './lib/types';
import { getAllCatalog } from './lib/storage';

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [adminPhone, setAdminPhone] = useState('6281234567890'); // ponytail: hardcoded default admin wa. add settings panel when multi-admin needed.

  // Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  async function loadCatalog() {
    setLoading(true);
    const data = await getAllCatalog();
    setItems(data);
    setLoading(false);
  }

  // Unique Events and Brands
  const events = useMemo(() => {
    const set = new Set(items.map((i) => i.event).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [items]);

  const brands = useMemo(() => {
    const filtered = selectedEvent === 'all'
      ? items
      : items.filter((i) => i.event === selectedEvent);
    const set = new Set(filtered.map((i) => i.brand).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [items, selectedEvent]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchEvent = selectedEvent === 'all' || item.event === selectedEvent;
      const matchBrand = selectedBrand === 'all' || item.brand === selectedBrand;
      const matchSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.event.toLowerCase().includes(searchQuery.toLowerCase());
      return matchEvent && matchBrand && matchSearch;
    });
  }, [items, selectedEvent, selectedBrand, searchQuery]);

  // Cart Handlers
  function addToCart(item: CatalogItem) {
    if (item.status === 'sold_out') return;
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { item, qty: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.item.id === id) {
            const newQty = c.qty + delta;
            return newQty > 0 ? { ...c, qty: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  }

  function updateItemVariant(id: string, variant: string) {
    setCart((prev) =>
      prev.map((c) => (c.item.id === id ? { ...c, variant } : c))
    );
  }

  const totalItemCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const totalBarang = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
  const totalFee = cart.reduce((sum, c) => sum + c.item.fee * c.qty, 0);
  const grandTotal = totalBarang + totalFee;

  function checkoutViaWhatsApp() {
    if (cart.length === 0) return;

    let text = `*Halo Admin Jastipbun, saya mau titip pesanan:*\n\n`;
    if (customerName.trim()) text += `👤 *Nama:* ${customerName.trim()}\n`;
    if (customerAddress.trim()) text += `📍 *Alamat/Kota:* ${customerAddress.trim()}\n`;
    text += `\n*Daftar Titipan:*\n`;

    cart.forEach((c, idx) => {
      const subtotal = (c.item.price + c.item.fee) * c.qty;
      text += `${idx + 1}. *${c.item.name}* (${c.item.brand})\n`;
      text += `   - Event: ${c.item.event}\n`;
      if (c.variant) text += `   - Varian/Size: ${c.variant}\n`;
      text += `   - Qty: ${c.qty} pcs @ Rp ${(c.item.price + c.item.fee).toLocaleString('id-ID')} (Barang: Rp ${c.item.price.toLocaleString('id-ID')} + Fee: Rp ${c.item.fee.toLocaleString('id-ID')})\n`;
      text += `   - Subtotal: Rp ${subtotal.toLocaleString('id-ID')}\n\n`;
    });

    text += `*Ringkasan Biaya:*\n`;
    text += `• Total Barang: Rp ${totalBarang.toLocaleString('id-ID')}\n`;
    text += `• Total Jastip Fee: Rp ${totalFee.toLocaleString('id-ID')}\n`;
    text += `*TOTAL ESTIMASI: Rp ${grandTotal.toLocaleString('id-ID')}*\n\n`;
    text += `Mohon info ketersediaan barang di venue/store ya kak. Terima kasih! 🙏`;

    const encoded = encodeURIComponent(text);
    const cleanPhone = adminPhone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Event Banner */}
      <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-2">
          <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Live Shopping & Jastip Hunting
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Katalog Titipan Jastipbun
          </h1>
          <p className="text-rose-100 text-xs sm:text-sm">
            Katalog cepat tanpa download file PDF berat. Pilih barang per brand & event, hitungan fee transparan, langsung order ke WhatsApp.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cari barang, brand, atau event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <svg
            className="w-5 h-5 text-slate-400 absolute left-3 top-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Event Tabs */}
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Pilih Event
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {events.map((ev) => (
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
                {ev === 'all' ? 'Semua Event' : ev}
              </button>
            ))}
          </div>
        </div>

        {/* Brand Tabs */}
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Pilih Brand
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {brands.map((br) => (
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

      {/* Catalog Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-slate-500 font-medium">
            Menampilkan <span className="font-bold text-slate-800">{filteredItems.length}</span> barang
          </p>
          <Link href="/admin" className="text-xs text-rose-600 font-semibold hover:underline">
            + Tambah dari PDF di Admin
          </Link>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Memuat katalog...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border border-slate-200 p-8 space-y-3">
            <p className="text-slate-600 text-sm font-semibold">Tidak ada barang yang cocok dengan filter.</p>
            <button
              onClick={() => {
                setSelectedEvent('all');
                setSelectedBrand('all');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Reset semua filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredItems.map((item) => {
              const inCart = cart.find((c) => c.item.id === item.id);
              const isSoldOut = item.status === 'sold_out';

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  {/* Image */}
                  <div className="relative aspect-[3/4] bg-slate-100 cursor-pointer overflow-hidden group" onClick={() => setPreviewImage(item.imageUrl)}>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    {/* Status Badge */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <span className="bg-slate-900/80 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded font-medium">
                        {item.brand}
                      </span>
                    </div>

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

                  {/* Body */}
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block truncate">{item.event}</span>
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug">
                        {item.name}
                      </h3>
                      {item.notes && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{item.notes}</p>
                      )}
                    </div>

                    {/* Price Breakdown */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-slate-500">Harga Barang:</span>
                        <span className="text-xs font-semibold text-slate-700 font-mono">
                          Rp {item.price.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-rose-600">
                        <span className="text-[10px]">Fee Jastip:</span>
                        <span className="text-xs font-semibold font-mono">
                          +Rp {item.fee.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 mt-1">
                        <span className="text-[11px] font-bold text-slate-900">Total:</span>
                        <span className="text-sm font-black text-rose-600 font-mono">
                          Rp {(item.price + item.fee).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      disabled={isSoldOut}
                      onClick={() => addToCart(item)}
                      className={`w-full py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isSoldOut
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : inCart
                          ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          : 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
                      }`}
                    >
                      {isSoldOut ? (
                        'Stok Habis'
                      ) : inCart ? (
                        `Ditambahkan (${inCart.qty}) +`
                      ) : (
                        '+ Titip Barang Ini'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-30 max-w-xl mx-auto">
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                {totalItemCount}
              </span>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold leading-none">Total Titipan</p>
                <p className="text-base font-extrabold text-white font-mono">
                  Rp {grandTotal.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
            >
              Lihat & Order WA →
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-base">Keranjang Titipan Jastip</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((c) => (
                <div key={c.item.id} className="border border-slate-200 rounded-xl p-3 flex gap-3 bg-slate-50">
                  <img
                    src={c.item.imageUrl}
                    alt={c.item.name}
                    className="w-16 h-20 object-cover rounded-lg bg-white border border-slate-200"
                  />
                  <div className="flex-1 flex flex-col justify-between text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-rose-600">{c.item.brand}</span>
                      <h4 className="font-bold text-slate-900 line-clamp-1">{c.item.name}</h4>
                      <p className="text-[11px] font-mono text-slate-600">
                        Rp {(c.item.price + c.item.fee).toLocaleString('id-ID')} / pcs
                      </p>
                    </div>

                    <input
                      type="text"
                      placeholder="Size / Warna / Varian"
                      value={c.variant || ''}
                      onChange={(e) => updateItemVariant(c.item.id, e.target.value)}
                      className="text-[11px] border border-slate-300 rounded px-2 py-0.5 bg-white my-1"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(c.item.id, -1)}
                          className="w-6 h-6 rounded bg-white border border-slate-300 font-bold text-slate-700 flex items-center justify-center hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="font-bold text-slate-800 text-xs">{c.qty}</span>
                        <button
                          onClick={() => updateQty(c.item.id, 1)}
                          className="w-6 h-6 rounded bg-white border border-slate-300 font-bold text-slate-700 flex items-center justify-center hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-bold font-mono text-slate-900">
                        Rp {((c.item.price + c.item.fee) * c.qty).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Form & WhatsApp CTA */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nama Lengkap Anda *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <input
                  type="text"
                  placeholder="Alamat / Kota Pengiriman *"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Subtotal Details */}
              <div className="text-xs space-y-1 pt-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Total Harga Barang:</span>
                  <span className="font-mono">Rp {totalBarang.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Total Fee Jastip:</span>
                  <span className="font-mono">+Rp {totalFee.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-200">
                  <span>Total Pembayaran:</span>
                  <span className="font-mono text-rose-600">Rp {grandTotal.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <button
                onClick={checkoutViaWhatsApp}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <span>💬 Pesan via WhatsApp Sekarang</span>
              </button>
              <p className="text-[10px] text-center text-slate-400">
                Format chat rapi akan otomatis dibuat dan dikirim ke nomor admin Jastipbun.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-xl overflow-hidden p-2">
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain max-h-[85vh]" />
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
