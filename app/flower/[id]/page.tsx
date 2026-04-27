'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Flower, Photo, EMOTION_LABELS } from '@/lib/types';
import EmotionBadge from '@/components/EmotionBadge';
import PhotoSwiper from '@/components/PhotoSwiper';
import Link from 'next/link';

export default function FlowerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [flower, setFlower] = useState<Flower | null>(null);
  const [loading, setLoading] = useState(true);
  const [wikimediaData, setWikimediaData] = useState<{ url: string; attribution: string } | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editMemo, setEditMemo] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editEmotionTags, setEditEmotionTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);

  useEffect(() => {
    fetch(`/api/flowers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.flower) {
          setFlower(data.flower);
          const searchName = data.flower.name_scientific || data.flower.name;
          return fetch(`/api/wikimedia?name=${encodeURIComponent(searchName)}`);
        }
      })
      .then((r) => r?.json())
      .then((wikiData) => {
        if (wikiData?.result) {
          setWikimediaData(wikiData.result);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Check wishlist
    fetch('/api/wishlist')
      .then((r) => r.json())
      .then((data) => {
        const found = data.wishlist?.some(
          (item: { flower_id: number }) => item.flower_id === parseInt(id as string)
        );
        setInWishlist(!!found);
      })
      .catch(() => {});
  }, [id]);

  const buildSwiperPhotos = () => {
    const photos = flower?.photos || [];
    const swiperPhotos = photos
      .filter((p) => p.file_path)
      .map((p) => ({ url: p.file_path!, isWikimedia: false }));

    if (swiperPhotos.length === 0 && wikimediaData) {
      swiperPhotos.push({
        url: wikimediaData.url,
        isWikimedia: true,
        attribution: wikimediaData.attribution,
      } as { url: string; isWikimedia: boolean; attribution?: string });
    } else if (wikimediaData) {
      swiperPhotos.push({
        url: wikimediaData.url,
        isWikimedia: true,
        attribution: wikimediaData.attribution,
      } as { url: string; isWikimedia: boolean; attribution?: string });
    }

    return swiperPhotos;
  };

  const handleEditPhoto = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditMemo(photo.user_memo || '');
    setEditLocation(photo.shot_location || '');
    setEditDate(photo.shot_date || '');
    setEditEmotionTags(photo.user_emotion_tags || []);
  };

  const handleSavePhoto = async () => {
    if (!editingPhoto) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/photos/${editingPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_memo: editMemo,
          shot_location: editLocation,
          shot_date: editDate,
          user_emotion_tags: editEmotionTags,
        }),
      });
      const data = await res.json();
      if (data.photo && flower) {
        const updatedPhotos = flower.photos?.map((p) =>
          p.id === editingPhoto.id ? { ...p, ...data.photo } : p
        );
        setFlower({ ...flower, photos: updatedPhotos });
      }
      setEditingPhoto(null);
    } catch {
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleAddToWishlist = async () => {
    try {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flower_id: flower?.id }),
      });
      setInWishlist(true);
    } catch {
      alert('追加に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin text-4xl">🌸</div>
      </div>
    );
  }

  if (!flower) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">花が見つかりません</p>
        <button onClick={() => router.back()} className="text-green-600">戻る</button>
      </div>
    );
  }

  const swiperPhotos = buildSwiperPhotos();

  return (
    <div className="pb-6">
      {/* Back button */}
      <div className="px-4 pt-4 pb-2">
        <button onClick={() => router.back()} className="text-green-600 text-sm flex items-center gap-1">
          ← 戻る
        </button>
      </div>

      {/* Photo swiper */}
      <div className="px-4">
        <PhotoSwiper photos={swiperPhotos} alt={flower.name} />
      </div>

      {/* Basic info */}
      <div className="px-4 mt-4">
        <h1 className="text-2xl font-bold text-gray-900">{flower.name}</h1>
        {flower.name_scientific && (
          <p className="text-gray-400 italic text-sm mt-0.5">{flower.name_scientific}</p>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          {flower.primary_emotions.map((em) => (
            <EmotionBadge key={em} emotion={em} />
          ))}
        </div>

        {/* Flower language */}
        {flower.language.length > 0 && (
          <div className="mt-4 p-4 bg-pink-50 rounded-2xl">
            <p className="text-xs text-pink-500 font-medium mb-2">花言葉</p>
            <div className="space-y-1">
              {flower.language.map((lang, i) => (
                <p key={i} className="text-gray-800 font-medium">「{lang}」</p>
              ))}
            </div>
          </div>
        )}

        {/* Origin & culture */}
        {(flower.origin || flower.source_culture) && (
          <div className="mt-3 p-4 bg-amber-50 rounded-2xl">
            {flower.source_culture && (
              <p className="text-xs text-amber-600 font-medium mb-1">
                出典: {flower.source_culture}
              </p>
            )}
            {flower.origin && (
              <p className="text-gray-700 text-sm">{flower.origin}</p>
            )}
            {flower.source_culture_notes && (
              <p className="text-gray-500 text-xs mt-2 border-t border-amber-100 pt-2">
                {flower.source_culture_notes}
              </p>
            )}
          </div>
        )}

        {/* Scene tags */}
        {flower.scene_tags.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2">シーン</p>
            <div className="flex flex-wrap gap-2">
              {flower.scene_tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Birth date & season */}
        <div className="mt-3 flex gap-3">
          {(flower.birth_month && flower.birth_day) ? (
            <div className="flex-1 p-3 bg-blue-50 rounded-xl text-center">
              <p className="text-xs text-blue-400">誕生花の日</p>
              <p className="font-bold text-blue-700">{flower.birth_month}/{flower.birth_day}</p>
            </div>
          ) : null}
          {flower.season && (
            <div className="flex-1 p-3 bg-green-50 rounded-xl text-center">
              <p className="text-xs text-green-400">季節</p>
              <p className="font-bold text-green-700">{flower.season}</p>
            </div>
          )}
          {flower.sentiment && (
            <div className="flex-1 p-3 bg-gray-50 rounded-xl text-center">
              <p className="text-xs text-gray-400">感情</p>
              <p className="font-bold text-gray-700">
                {flower.sentiment === 'positive' ? '✨ ポジ' : flower.sentiment === 'negative' ? '💔 ネガ' : '⚖️ 中立'}
              </p>
            </div>
          )}
        </div>

        {/* Habitat */}
        {flower.habitat_description && (
          <div className="mt-3 p-4 bg-green-50 rounded-2xl">
            <p className="text-xs text-green-600 font-medium mb-1">🗺️ 見つかる場所</p>
            <p className="text-sm text-gray-700">{flower.habitat_description}</p>
          </div>
        )}

        {/* Compound emotion */}
        {flower.compound_emotion && (
          <div className="mt-3 px-4 py-2 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400">複合感情: {EMOTION_LABELS[flower.compound_emotion] || flower.compound_emotion}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex gap-3">
          <Link
            href={`/map/${flower.id}`}
            className="flex-1 py-3 bg-green-500 text-white rounded-2xl text-center font-medium text-sm"
          >
            🗺️ この花を見つけに行く
          </Link>
          {!inWishlist && !(flower.photos && flower.photos.length > 0) && (
            <button
              onClick={handleAddToWishlist}
              className="px-4 py-3 border border-green-300 text-green-600 rounded-2xl text-sm"
            >
              📷 撮りたい
            </button>
          )}
        </div>

        {/* My records */}
        {flower.photos && flower.photos.length > 0 && (
          <div className="mt-6">
            <h2 className="font-bold text-gray-900 mb-3">📷 私の記録</h2>
            <div className="space-y-3">
              {flower.photos.filter((p) => p.file_path).map((photo) => (
                <div key={photo.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      {photo.shot_date && (
                        <p className="text-sm text-gray-600">📅 {photo.shot_date}</p>
                      )}
                      {photo.shot_location && (
                        <p className="text-sm text-gray-600">📍 {photo.shot_location}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleEditPhoto(photo)}
                      className="text-xs text-green-600 border border-green-200 px-2 py-1 rounded-lg"
                    >
                      編集
                    </button>
                  </div>
                  {photo.user_memo && (
                    <p className="text-sm text-gray-700 mt-1">{photo.user_memo}</p>
                  )}
                  {photo.user_emotion_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {photo.user_emotion_tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit photo modal */}
      {editingPhoto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">記録を編集</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">撮影日</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">撮影場所</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="例：近所の公園"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">メモ</label>
                <textarea
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  rows={3}
                  placeholder="感想など..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">感情タグ（カンマ区切り）</label>
                <input
                  type="text"
                  value={editEmotionTags.join(', ')}
                  onChange={(e) => setEditEmotionTags(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="例：嬉しい, 感動"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingPhoto(null)}
                className="flex-1 py-3 border border-gray-200 rounded-2xl text-gray-600 text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={handleSavePhoto}
                disabled={saving}
                className="flex-1 py-3 bg-green-500 text-white rounded-2xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
