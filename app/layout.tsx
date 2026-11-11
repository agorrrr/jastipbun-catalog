import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Jastipbun - Katalog Jastip Ringan & Praktis',
  description: 'Katalog belanja jastip realtime per event dan brand. Cepat, hemat kuota, langsung pesan via WhatsApp.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-rose-600 text-white font-bold flex items-center justify-center text-sm shadow">
                JB
              </span>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-slate-900 block leading-none">
                  Jastipbun
                </span>
                <span className="text-[11px] text-rose-600 font-medium">Katalog Event & Brand</span>
              </div>
            </Link>

            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-100 transition text-slate-700"
              >
                Katalog
              </Link>
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition border border-rose-200 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Upload PDF / Admin
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Jastipbun. Dibuat untuk kecepatan katalog jastip WhatsApp.</p>
        </footer>
      </body>
    </html>
  );
}
