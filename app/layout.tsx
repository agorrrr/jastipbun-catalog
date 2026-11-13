import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Jastipbun - Katalog Jastip',
  description: 'Katalog belanja jastip per event dan brand. Cepat dan ringan.',
  icons: {
    icon: '/logo.jpg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-cream-200 px-3 sm:px-4 py-2.5 sm:py-3 shadow-xs">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5">
              <img
                src="/logo.jpg"
                alt="Logo Jastipbun"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-rosebrand-500/40 shadow-xs"
              />
              <div>
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-espresso-900 block leading-tight">
                  Jastipbun
                </span>
                <span className="text-[10px] sm:text-[11px] text-rosebrand-600 font-medium">
                  @jastipbunn_
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/"
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold hover:bg-cream-200 transition text-espresso-800"
              >
                Katalog
              </Link>
              <Link
                href="/admin"
                className="px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs font-semibold bg-cream-200 text-espresso-800 hover:bg-cream-300 transition border border-cream-300"
              >
                Login
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-4 md:p-6">
          {children}
        </main>

        <footer className="border-t border-cream-200 bg-white py-5 text-center text-[11px] text-espresso-700/60">
          <p>© {new Date().getFullYear()} Jastipbun (@jastipbunn_).</p>
        </footer>
      </body>
    </html>
  );
}
