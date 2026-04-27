'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface SwiperPhoto {
  url: string;
  isWikimedia?: boolean;
  attribution?: string;
}

interface PhotoSwiperProps {
  photos: SwiperPhoto[];
  alt: string;
}

export default function PhotoSwiper({ photos, alt }: PhotoSwiperProps) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full aspect-square bg-gray-100 flex items-center justify-center rounded-xl">
        <span className="text-gray-400 text-4xl">🌸</span>
      </div>
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Only swipe if horizontal movement is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0 && current < photos.length - 1) {
        setCurrent(current + 1);
      } else if (deltaX > 0 && current > 0) {
        setCurrent(current - 1);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const photo = photos[current];

  return (
    <div className="relative w-full">
      <div
        className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={photo.url}
          alt={alt}
          fill
          className="object-cover"
          unoptimized={photo.url.startsWith('/uploads/')}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        {photo.isWikimedia && (
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            参考画像
          </div>
        )}
        {photo.attribution && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded max-w-[60%] truncate">
            {photo.attribution}
          </div>
        )}
      </div>

      {photos.length > 1 && (
        <>
          <div className="flex justify-center gap-1.5 mt-2">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === current ? 'bg-green-500 w-4' : 'bg-gray-300'
                }`}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
          {current > 0 && (
            <button
              onClick={() => setCurrent(current - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1.5 shadow"
              aria-label="Previous"
            >
              ‹
            </button>
          )}
          {current < photos.length - 1 && (
            <button
              onClick={() => setCurrent(current + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1.5 shadow"
              aria-label="Next"
            >
              ›
            </button>
          )}
        </>
      )}
    </div>
  );
}
