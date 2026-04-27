'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Flower, Photo, EMOTION_LABELS } from '@/lib/types';
import EmotionBadge from '@/components/EmotionBadge';
import PhotoSwiper from '@/components/PhotoSwiper';

type ConfirmTarget =
  | { type: 'single'; photoId: number }
  | { type: 'selected'; ids: number[] }
  | { type: 'all' };

export default function FlowerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [flower, setFlower] = useState<Flower | null>(null);
  const [loading, setLoading] = useState(true);
  const [wikimediaData, setWikimediaData] = useState<{ url: string; attribution: string } | null>(null);
  const [inWishlist, setInWishlist] = useState(false);

  // Photo memo edit
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editMemo, setEditMemo] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editEmotionTags, setEditEmotionTags] = useState<string[]>([]);
  const [savingMemo, setSavingMemo] = useState(false);

  // Flower name edit
  const [showFlowerEdit, setShowFlowerEdit] = useState(false);
  const [editFlowerName, setEditFlowerName] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);

  // Photo deletion
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const ownPhotos = (flower?.photos ?? []).filter((p) => p.file_path);

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
      .then((wikiData) => { if (wikiData?.result) setWikimediaData(wikiData.result); })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/wishlist')
      .then((r) => r.json())
      .then((data) => {
        setInWishlist(!!data.wishlist?.some((item: { flower_id: number }) => item.flower_id === parseInt(id as string)));
      })
      .catch(() => {});
  }, [id]);

  // Refresh wikimedia when flower name changes
  const refreshWikimedia = async (name: string, nameScientific?: string) => {
    const searchName = nameScientific || name;
    try {
      const res = await fetch(`/api/wikimedia?name=${encodeURIComponent(searchName)}`);
      const data = await res.json();
      if (data?.result) setWikimediaData(data.result);
    } catch { /* ignore */ }
  };

  const buildSwiperPhotos = () => {
    const photos = ownPhotos.map((p) => ({ url: p.file_path!, isWikimedia: false }));
    if (photos.length === 0 && wikimediaData) {
      photos.push({ url: wikimediaData.url, isWikimedia: true, attribution: wikimediaData.attribution } as { url: string; isWikimedia: boolean; attribution?: string });
    } else if (wikimediaData) {
      photos.push({ url: wikimediaData.url, isWikimedia: true, attribution: wikimediaData.attribution } as { url: string; isWikimedia: boolean; attribution?: string });
    }
    return photos;
  };

  // ── Photo memo edit ──
  const handleEditPhoto = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditMemo(photo.user_memo || '');
    setEditLocation(photo.shot_location || '');
    setEditDate(photo.shot_date || '');
    setEditEmotionTags(photo.user_emotion_tags || []);
  };

  const handleSaveMemo = async () => {
    if (!editingPhoto || !flower) return;
    setSavingMemo(true);
    try {
      const res = await fetch(`/api/photos/${editingPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_memo: editMemo, shot_location: editLocation, shot_date: editDate, user_emotion_tags: editEmotionTags }),
      });
      const data = await res.json();
      if (data.photo) {
        setFlower({ ...flower, photos: flower.photos?.map((p) => p.id === editingPhoto.id ? { ...p, ...data.photo } : p) });
      }
      setEditingPhoto(null);
    } catch { alert('保存に失敗しました'); }
    finally { setSavingMemo(false); }
  };

  // ── Flower name edit & reanalyze ──
  const openFlowerEdit = () => {
    setEditFlowerName(flower?.name || '');
    setShowFlowerEdit(true);
  };

  const handleReanalyze = async () => {
    if (!editFlowerName.trim() || !flower) return;
    setReanalyzing(true);
    try {
      const res = await fetch(`/api/flowers/${flower.id}/reanalyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editFlowerName.trim() }),
      });
      const data = await res.json();
      if (data.flower) {
        setFlower({ ...flower, ...data.flower, photos: flower.photos });
        await refreshWikimedia(data.flower.name, data.flower.name_scientific);
        setShowFlowerEdit(false);
      } else {
        alert(`再取得に失敗しました: ${data.error || ''}`);
      }
    } catch { alert('再取得に失敗しました'); }
    finally { setReanalyzing(false); }
  };

  // ── Photo deletion ──
  const toggleSelect = (photoId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) { next.delete(photoId); } else { next.add(photoId); }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(selectedIds.size === ownPhotos.length ? new Set() : new Set(ownPhotos.map((p) => p.id)));
  };

  const executeDelete = async () => {
    if (!confirmTarget || !flower) return;
    setDeleting(true);

    let idsToDelete: number[] = [];
    if (confirmTarget.type === 'single') idsToDelete = [confirmTarget.photoId];
    else if (confirmTarget.type === 'selected') idsToDelete = confirmTarget.ids;
    else if (confirmTarget.type === 'all') idsToDelete = ownPhotos.map((p) => p.id);

    try {
      await Promise.all(idsToDelete.map((pid: number) =>
        fetch(`/api/photos/${pid}`, { method: 'DELETE' })
      ));

      const remainingPhotos = (flower.photos ?? []).filter((p) => !idsToDelete.includes(p.id));
      setFlower({ ...flower, photos: remainingPhotos });
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch { alert('削除に失敗しました'); }
    finally {
      setDeleting(false);
      setConfirmTarget(null);
    }
  };

  const confirmMessage = () => {
    if (!confirmTarget) return '';
    const total = ownPhotos.length;
    if (confirmTarget.type === 'single') {
      return total === 1
        ? 'この花の最後の写真です。削除すると参考画像が表示されます。削除しますか？'
        : 'この写真を削除しますか？';
    }
    if (confirmTarget.type === 'selected') {
      const n = confirmTarget.ids.length;
      return n === total
        ? `選択した${n}枚をすべて削除します。削除後は参考画像が表示されます。削除しますか？`
        : `選択した${n}枚を削除しますか？`;
    }
    return `すべての写真（${total}枚）を削除します。削除後は参考画像が表示されます。削除しますか？`;
  };

  const handleAddToWishlist = async () => {
    try {
      await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ flower_id: flower?.id }) });
      setInWishlist(true);
    } catch { alert('追加に失敗しました'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin text-4xl">🌸</div></div>;
  if (!flower) return <div className="flex flex-col items-center justify-center min-h-screen gap-4"><p className="text-gray-500">花が見つかりません</p><button onClick={() => router.push('/')} className="text-green-600">戻る</button></div>;

  const swiperPhotos = buildSwiperPhotos();

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={() => router.push('/')} className="text-green-600 text-sm flex items-center gap-1">← 戻る</button>
        <button
          onClick={openFlowerEdit}
          className="text-sm text-gray-500 border border-gray-200 px-3 py-1 rounded-lg"
        >
          ✏️ 編集
        </button>
      </div>

      {/* Photo swiper */}
      <div className="px-4">
        <PhotoSwiper photos={swiperPhotos} alt={flower.name} />
      </div>

      {/* Basic info */}
      <div className="px-4 mt-4">
        <h1 className="text-2xl font-bold text-gray-900">{flower.name}</h1>
        {flower.name_scientific && <p className="text-gray-400 italic text-sm mt-0.5">{flower.name_scientific}</p>}

        <div className="flex flex-wrap gap-2 mt-3">
          {flower.primary_emotions.map((em) => <EmotionBadge key={em} emotion={em} />)}
        </div>

        {flower.language.length > 0 && (
          <div className="mt-4 p-4 bg-pink-50 rounded-2xl">
            <p className="text-xs text-pink-500 font-medium mb-2">花言葉</p>
            <div className="space-y-1">
              {flower.language.map((lang, i) => <p key={i} className="text-gray-800 font-medium">「{lang}」</p>)}
            </div>
          </div>
        )}

        {(flower.origin || flower.source_culture) && (
          <div className="mt-3 p-4 bg-amber-50 rounded-2xl">
            {flower.source_culture && <p className="text-xs text-amber-600 font-medium mb-1">出典: {flower.source_culture}</p>}
            {flower.origin && <p className="text-gray-700 text-sm">{flower.origin}</p>}
            {flower.source_culture_notes && <p className="text-gray-500 text-xs mt-2 border-t border-amber-100 pt-2">{flower.source_culture_notes}</p>}
          </div>
        )}

        {flower.scene_tags.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2">シーン</p>
            <div className="flex flex-wrap gap-2">
              {flower.scene_tags.map((tag) => <span key={tag} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">{tag}</span>)}
            </div>
          </div>
        )}

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

        {flower.habitat_description && (
          <div className="mt-3 p-4 bg-green-50 rounded-2xl">
            <p className="text-xs text-green-600 font-medium mb-1">🗺️ 見つかる場所</p>
            <p className="text-sm text-gray-700">{flower.habitat_description}</p>
          </div>
        )}

        {flower.compound_emotion && (
          <div className="mt-3 px-4 py-2 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400">複合感情: {EMOTION_LABELS[flower.compound_emotion] || flower.compound_emotion}</p>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <Link href={`/map/${flower.id}`} className="flex-1 py-3 bg-green-500 text-white rounded-2xl text-center font-medium text-sm">
            🗺️ この花を見つけに行く
          </Link>
          {!inWishlist && ownPhotos.length === 0 && (
            <button onClick={handleAddToWishlist} className="px-4 py-3 border border-green-300 text-green-600 rounded-2xl text-sm">
              📷 撮りたい
            </button>
          )}
        </div>

        {/* ── My photos section ── */}
        {ownPhotos.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900">📷 私の写真</h2>
              <div className="flex gap-2">
                {ownPhotos.length > 1 && (
                  <>
                    {selectionMode && selectedIds.size > 0 && (
                      <button
                        onClick={() => setConfirmTarget({ type: 'selected', ids: Array.from(selectedIds) })}
                        className="text-xs text-red-500 border border-red-200 px-2 py-1 rounded-lg"
                      >
                        選択削除({selectedIds.size})
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
                      className={`text-xs px-2 py-1 rounded-lg border transition-colors ${selectionMode ? 'bg-gray-200 border-gray-300 text-gray-700' : 'border-gray-200 text-gray-500'}`}
                    >
                      {selectionMode ? 'キャンセル' : '選択'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setConfirmTarget({ type: 'all' })}
                  className="text-xs text-red-400 border border-red-100 px-2 py-1 rounded-lg"
                >
                  全削除
                </button>
              </div>
            </div>

            {selectionMode && ownPhotos.length > 1 && (
              <button onClick={handleSelectAll} className="text-xs text-green-600 mb-2">
                {selectedIds.size === ownPhotos.length ? '全選択解除' : '全選択'}
              </button>
            )}

            <div className="space-y-3">
              {ownPhotos.map((photo) => (
                <div key={photo.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Thumbnail + controls */}
                  <div className="flex gap-3 p-3">
                    {selectionMode && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(photo.id)}
                          onChange={() => toggleSelect(photo.id)}
                          className="w-4 h-4 accent-green-500"
                        />
                      </div>
                    )}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image src={photo.file_path!} alt="photo" fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                      {photo.shot_date && <p className="text-sm text-gray-600">📅 {photo.shot_date}</p>}
                      {photo.shot_location && <p className="text-sm text-gray-600 truncate">📍 {photo.shot_location}</p>}
                      {photo.user_memo && <p className="text-sm text-gray-700 truncate">{photo.user_memo}</p>}
                      {!photo.shot_date && !photo.shot_location && !photo.user_memo && (
                        <p className="text-sm text-gray-400">記録なし</p>
                      )}
                      {photo.user_emotion_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {photo.user_emotion_tags.map((tag) => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-500">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => handleEditPhoto(photo)} className="text-xs text-green-600 border border-green-200 px-2 py-1 rounded-lg">メモ</button>
                      {!selectionMode && (
                        <button
                          onClick={() => setConfirmTarget({ type: 'single', photoId: photo.id })}
                          className="text-xs text-red-400 border border-red-100 px-2 py-1 rounded-lg"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/upload"
              className="block mt-3 py-3 border-2 border-dashed border-green-200 text-green-600 rounded-2xl text-center text-sm font-medium"
            >
              ＋ 写真を追加
            </Link>
          </div>
        )}

        {ownPhotos.length === 0 && (
          <div className="mt-4">
            <Link
              href="/upload"
              className="block py-3 border-2 border-dashed border-green-200 text-green-600 rounded-2xl text-center text-sm font-medium"
            >
              📷 この花の写真を登録する
            </Link>
          </div>
        )}
      </div>

      {/* ── Edit photo memo modal ── */}
      {editingPhoto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4 text-gray-900">記録を編集</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">撮影日</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">撮影場所</label>
                <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="例：近所の公園"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">メモ</label>
                <textarea value={editMemo} onChange={(e) => setEditMemo(e.target.value)} rows={3}
                  placeholder="感想など..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm resize-none" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">感情タグ（カンマ区切り）</label>
                <input type="text" value={editEmotionTags.join(', ')}
                  onChange={(e) => setEditEmotionTags(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  placeholder="例：嬉しい, 感動"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingPhoto(null)} className="flex-1 py-3 border border-gray-200 rounded-2xl text-gray-600 text-sm">キャンセル</button>
              <button onClick={handleSaveMemo} disabled={savingMemo} className="flex-1 py-3 bg-green-500 text-white rounded-2xl text-sm font-medium disabled:opacity-50">
                {savingMemo ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit flower name modal ── */}
      {showFlowerEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6">
            <h3 className="font-bold text-lg mb-1 text-gray-900">花情報を編集</h3>
            <p className="text-xs text-gray-400 mb-4">名前を変えてAIで花言葉を再取得できます</p>

            <label className="text-sm text-gray-500 block mb-1">花の名前</label>
            <input
              type="text"
              value={editFlowerName}
              onChange={(e) => setEditFlowerName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base outline-none focus:ring-2 focus:ring-green-300 mb-4"
              autoFocus
            />

            <button
              onClick={handleReanalyze}
              disabled={reanalyzing || !editFlowerName.trim()}
              className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold disabled:opacity-50 mb-3"
            >
              {reanalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">🌸</span>
                  AIで花言葉を再取得中...
                </span>
              ) : (
                '🌸 AIで花言葉を再取得'
              )}
            </button>

            <button onClick={() => setShowFlowerEdit(false)} className="w-full py-3 border border-gray-200 rounded-2xl text-gray-600 text-sm">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm delete modal ── */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">写真を削除</h3>
            <p className="text-sm text-gray-600 mb-6">{confirmMessage()}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                className="flex-1 py-3 border border-gray-200 rounded-2xl text-gray-600 text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={executeDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-medium disabled:opacity-50"
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
