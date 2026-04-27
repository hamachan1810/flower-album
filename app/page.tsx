'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flower } from '@/lib/types';
import FlowerCard from '@/components/FlowerCard';
import FilterBar from '@/components/FilterBar';
import Link from 'next/link';

export default function Home() {
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [emotion, setEmotion] = useState('');
  const [season, setSeason] = useState('');
  const [sceneTag, setSceneTag] = useState('');
  const [sourceCulture, setSourceCulture] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [todayFlower, setTodayFlower] = useState<Flower | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const fetchFlowers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (emotion) params.set('emotion', emotion);
    if (season) params.set('season', season);
    if (sceneTag) params.set('scene_tag', sceneTag);
    if (sourceCulture) params.set('source_culture', sourceCulture);
    if (birthMonth) params.set('birth_month', birthMonth);

    const res = await fetch(`/api/flowers?${params.toString()}`);
    const data = await res.json();
    setFlowers(data.flowers || []);
    setLoading(false);
  }, [search, emotion, season, sceneTag, sourceCulture, birthMonth]);

  useEffect(() => {
    fetchFlowers();
  }, [fetchFlowers]);

  useEffect(() => {
    // Find today's birthday flower
    fetch(`/api/flowers?birth_month=${todayMonth}`)
      .then((r) => r.json())
      .then((data) => {
        const f = (data.flowers || []).find(
          (fl: Flower) => fl.birth_day === todayDay
        );
        setTodayFlower(f || null);
      })
      .catch(() => {});
  }, [todayMonth, todayDay]);

  const handleAddToWishlist = async (flowerId: number) => {
    try {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flower_id: flowerId }),
      });
      alert('ウィッシュリストに追加しました！');
    } catch {
      alert('追加に失敗しました');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold text-gray-900 mb-3">🌸 花言葉図鑑</h1>
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="花の名前を検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-white border border-gray-200 text-gray-900 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-xl text-sm border transition-all ${
                showFilters ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              絞り込み
            </button>
          </div>
        </div>

        {showFilters && (
          <FilterBar
            emotion={emotion}
            season={season}
            sceneTag={sceneTag}
            sourceCulture={sourceCulture}
            birthMonth={birthMonth}
            onEmotionChange={setEmotion}
            onSeasonChange={setSeason}
            onSceneTagChange={setSceneTag}
            onSourceCultureChange={setSourceCulture}
            onBirthMonthChange={setBirthMonth}
          />
        )}
      </div>

      {/* Today's birthday flower banner */}
      {todayFlower && (
        <Link href={`/flower/${todayFlower.id}`}>
          <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-pink-50 to-yellow-50 rounded-2xl border border-pink-100">
            <p className="text-xs text-pink-500 font-medium mb-1">
              🎂 今日 {todayMonth}/{todayDay} の誕生花
            </p>
            <p className="font-bold text-gray-900">{todayFlower.name}</p>
            {todayFlower.language[0] && (
              <p className="text-sm text-gray-600 mt-0.5">「{todayFlower.language[0]}」</p>
            )}
          </div>
        </Link>
      )}

      {/* Flower grid */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin text-3xl">🌸</div>
          </div>
        ) : flowers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🌿</p>
            <p className="text-base">まだ花が登録されていません</p>
            <p className="text-sm mt-1">写真をアップロードして始めましょう</p>
            <Link
              href="/upload"
              className="inline-block mt-4 px-6 py-2 bg-green-500 text-white rounded-full text-sm"
            >
              アップロード
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {flowers.map((flower) => (
              <FlowerCard
                key={flower.id}
                flower={flower}
                onAddToWishlist={handleAddToWishlist}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
