'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Flower } from '@/lib/types';
import EmotionBadge from './EmotionBadge';

interface FlowerCardProps {
  flower: Flower;
  onAddToWishlist?: (flowerId: number) => void;
}

export default function FlowerCard({ flower, onAddToWishlist }: FlowerCardProps) {
  const [wikimediaUrl, setWikimediaUrl] = useState<string | null>(null);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const hasOwnPhotos = flower.photos && flower.photos.length > 0;
  const photos = flower.photos || [];

  useEffect(() => {
    if (!hasOwnPhotos) {
      const searchName = flower.name_scientific || flower.name;
      fetch(`/api/wikimedia?name=${encodeURIComponent(searchName)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.result?.url) {
            setWikimediaUrl(data.result.url);
          }
        })
        .catch(() => {});
    }
  }, [flower.name, flower.name_scientific, hasOwnPhotos]);

  const currentPhoto = hasOwnPhotos ? photos[currentPhotoIdx] : null;
  const displayUrl = currentPhoto?.file_path || wikimediaUrl;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0 && currentPhotoIdx < photos.length - 1) {
        setCurrentPhotoIdx(currentPhotoIdx + 1);
      } else if (deltaX > 0 && currentPhotoIdx > 0) {
        setCurrentPhotoIdx(currentPhotoIdx - 1);
      }
    }
    touchStartX.current = null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
      <Link href={`/flower/${flower.id}`}>
        <div
          className="relative aspect-square bg-gray-100"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt={flower.name}
              fill
              className="object-cover"
              unoptimized={displayUrl.startsWith('/uploads/')}
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
              🌸
            </div>
          )}
          {!hasOwnPhotos && wikimediaUrl && (
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
              参考画像
            </div>
          )}
          {hasOwnPhotos && photos.length > 1 && (
            <div className="absolute bottom-1 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
              {currentPhotoIdx + 1}/{photos.length}
            </div>
          )}
        </div>
      </Link>

      <div className="p-3">
        <Link href={`/flower/${flower.id}`}>
          <h3 className="font-bold text-gray-900 text-base">{flower.name}</h3>
          {flower.name_scientific && (
            <p className="text-gray-400 text-xs italic mb-1">{flower.name_scientific}</p>
          )}
        </Link>

        <div className="flex flex-wrap gap-1 mb-2">
          {flower.primary_emotions.slice(0, 2).map((emotion) => (
            <EmotionBadge key={emotion} emotion={emotion} size="sm" />
          ))}
        </div>

        {flower.language[0] && (
          <p className="text-gray-600 text-sm line-clamp-1 mb-2">「{flower.language[0]}」</p>
        )}

        {!hasOwnPhotos && (
          <button
            onClick={() => onAddToWishlist?.(flower.id)}
            className="w-full text-center text-sm py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 active:bg-green-100 transition-colors"
          >
            撮りたい 📷
          </button>
        )}
      </div>
    </div>
  );
}
