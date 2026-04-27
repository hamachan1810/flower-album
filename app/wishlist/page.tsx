'use client';

import { useState, useEffect } from 'react';
import { WishlistItem } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import EmotionBadge from '@/components/EmotionBadge';

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonFilter, setSeasonFilter] = useState('');
  const [wikimediaCache, setWikimediaCache] = useState<Record<number, string>>({});

  const SEASONS = ['春', '夏', '秋', '冬'];

  useEffect(() => {
    fetch('/api/wishlist')
      .then((r) => r.json())
      .then((data) => {
        setWishlist(data.wishlist || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    wishlist.forEach((item) => {
      if (item.flower && !wikimediaCache[item.flower_id]) {
        const name = item.flower.name_scientific || item.flower.name;
        fetch(`/api/wikimedia?name=${encodeURIComponent(name)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.result?.url) {
              setWikimediaCache((prev) => ({ ...prev, [item.flower_id]: data.result.url }));
            }
          })
          .catch(() => {});
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlist]);

  const handleRemove = async (wishlistId: number) => {
    if (!confirm('ウィッシュリストから削除しますか？')) return;
    try {
      await fetch(`/api/wishlist/${wishlistId}`, { method: 'DELETE' });
      setWishlist(wishlist.filter((item) => item.id !== wishlistId));
    } catch {
      alert('削除に失敗しました');
    }
  };

  const filtered = seasonFilter
    ? wishlist.filter((item) => item.flower?.season === seasonFilter)
    : wishlist;

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100 sticky top-0 z-40">
        <h1 className="text-xl font-bold text-gray-900 mb-3">🌱 撮りたい花</h1>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSeasonFilter('')}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs border ${
              seasonFilter === '' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            すべて
          </button>
          {SEASONS.map((s) => (
            <button
              key={s}
              onClick={() => setSeasonFilter(seasonFilter === s ? '' : s)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs border ${
                seasonFilter === s ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin text-3xl">🌸</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📷</p>
            <p>ウィッシュリストは空です</p>
            <p className="text-sm mt-1">アルバムから「撮りたい」を押して追加しましょう</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const flower = item.flower;
              if (!flower) return null;
              const imageUrl = wikimediaCache[item.flower_id];

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex gap-3 p-3">
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={flower.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">
                          🌸
                        </div>
                      )}
                      <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1 py-0.5 rounded text-[10px]">
                        参考
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/flower/${flower.id}`}>
                        <h3 className="font-bold text-gray-900">{flower.name}</h3>
                        {flower.name_scientific && (
                          <p className="text-gray-400 text-xs italic">{flower.name_scientific}</p>
                        )}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {flower.primary_emotions.slice(0, 2).map((em) => (
                          <EmotionBadge key={em} emotion={em} size="sm" />
                        ))}
                        {flower.season && (
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">
                            {flower.season}
                          </span>
                        )}
                      </div>
                      {flower.language[0] && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">「{flower.language[0]}」</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 px-3 pb-3">
                    <Link
                      href={`/map/${flower.id}`}
                      className="flex-1 py-2 bg-green-500 text-white rounded-xl text-center text-sm font-medium"
                    >
                      🗺️ 見つけに行く
                    </Link>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="px-4 py-2 border border-red-200 text-red-400 rounded-xl text-sm"
                    >
                      削除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
