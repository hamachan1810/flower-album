import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "花言葉図鑑",
  description: "花の写真と花言葉を記録するアルバム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <main className="max-w-lg mx-auto min-h-screen pb-20">
          {children}
        </main>

        {/* Bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="max-w-lg mx-auto flex">
            <Link
              href="/"
              className="flex-1 flex flex-col items-center py-2 text-xs text-gray-600 hover:text-green-600 transition-colors"
            >
              <span className="text-xl mb-0.5">📚</span>
              <span>アルバム</span>
            </Link>
            <Link
              href="/upload"
              className="flex-1 flex flex-col items-center py-2 text-xs text-gray-600 hover:text-green-600 transition-colors"
            >
              <span className="text-xl mb-0.5">📷</span>
              <span>アップロード</span>
            </Link>
            <Link
              href="/wishlist"
              className="flex-1 flex flex-col items-center py-2 text-xs text-gray-600 hover:text-green-600 transition-colors"
            >
              <span className="text-xl mb-0.5">🌱</span>
              <span>撮りたい</span>
            </Link>
            <Link
              href="/calendar"
              className="flex-1 flex flex-col items-center py-2 text-xs text-gray-600 hover:text-green-600 transition-colors"
            >
              <span className="text-xl mb-0.5">📅</span>
              <span>カレンダー</span>
            </Link>
          </div>
        </nav>
      </body>
    </html>
  );
}
