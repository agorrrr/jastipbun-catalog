import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Jastipbun - Katalog Jastip',
  description: 'Katalog belanja jastip per event dan brand. Cepat dan ringan.',
  icons: {
    icon: '/logo.jpg',
  },
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
      <body className="min-h-screen bg-cream-100 text-espresso-800 antialiased flex flex-col">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-cream-200 px-4 py-3 shadow-xs">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/logo.jpg"
                alt="Logo Jastipbun"
                className="w-9 h-9 rounded-full object-cover border border-rosebrand-500/40 shadow-xs"
              />
              <div>
                <span className="font-extrabold text-base tracking-tight text-espresso-900 block leading-tight">
                  Jastipbun
                </span>
                <span className="text-[11px] text-rosebrand-600 font-medium">
                  @jastipbunn_
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-cream-200 transition text-espresso-800"
              >
                Katalog
              </Link>
              <Link
                href="/admin"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cream-200 text-espresso-800 hover:bg-cream-300 transition border border-cream-300"
              >
                Admin
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
          {children}
        </main>

        <footer className="border-t border-cream-200 bg-white py-6 text-center text-xs text-espresso-700/60">
          <p>© {new Date().getFullYear()} Jastipbun (@jastipbunn_).</p>
        </footer>
      </body>
    </html>
  );
}
