'use client';

import { useState, useEffect } from 'react';
import { Flower } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [wikimediaCache, setWikimediaCache] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch(`/api/flowers?birth_month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        setFlowers(data.flowers || []);
      })
      .catch(() => {});
  }, [month]);

  useEffect(() => {
    flowers.forEach((f) => {
      if (!wikimediaCache[f.id]) {
        const name = f.name_scientific || f.name;
        fetch(`/api/wikimedia?name=${encodeURIComponent(name)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.result?.url) {
              setWikimediaCache((prev) => ({ ...prev, [f.id]: data.result.url }));
            }
          })
          .catch(() => {});
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowers]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const getFlowerForDay = (day: number): Flower | undefined => {
    return flowers.find((f) => f.birth_day === day);
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100 sticky top-0 z-40">
        <h1 className="text-xl font-bold text-gray-900 mb-3">📅 誕生花カレンダー</h1>
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-full bg-gray-100 text-gray-600"
          >
            ‹
          </button>
          <h2 className="font-bold text-lg text-gray-900">
            {year}年 {monthNames[month - 1]}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-full bg-gray-100 text-gray-600"
          >
            ›
          </button>
        </div>
      </div>

      <div className="p-3">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs font-medium py-1 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const flower = getFlowerForDay(day);
            const imageUrl = flower ? (
              flower.photos?.[0]?.file_path ||
              wikimediaCache[flower.id]
            ) : undefined;
            const dayOfWeek = (idx) % 7;

            return (
              <div key={day} className="aspect-square">
                {flower ? (
                  <Link href={`/flower/${flower.id}`} className="block w-full h-full">
                    <div
                      className={`relative w-full h-full rounded-lg overflow-hidden ${
                        isToday(day) ? 'ring-2 ring-green-500' : ''
                      }`}
                    >
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={flower.name}
                          fill
                          className="object-cover"
                          sizes="calc(100vw / 7)"
                          unoptimized={imageUrl.startsWith('/uploads/')}
                        />
                      ) : (
                        <div className="w-full h-full bg-pink-50 flex items-center justify-center text-base">
                          🌸
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white">
                        <p
                          className={`text-center font-bold leading-none ${
                            isToday(day) ? 'text-green-300' : 'text-white'
                          }`}
                          style={{ fontSize: '10px', paddingBottom: '1px' }}
                        >
                          {day}
                        </p>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div
                    className={`w-full h-full rounded-lg flex items-center justify-center ${
                      isToday(day)
                        ? 'bg-green-100 ring-2 ring-green-500'
                        : 'bg-gray-50'
                    }`}
                  >
                    <span
                      className={`font-medium ${
                        isToday(day) ? 'text-green-700' :
                        dayOfWeek === 0 ? 'text-red-400' :
                        dayOfWeek === 6 ? 'text-blue-400' :
                        'text-gray-500'
                      }`}
                      style={{ fontSize: '12px' }}
                    >
                      {day}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        {flowers.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">
              {monthNames[month - 1]}の誕生花 ({flowers.length}種)
            </h3>
            <div className="space-y-2">
              {flowers
                .sort((a, b) => (a.birth_day || 0) - (b.birth_day || 0))
                .map((f) => (
                  <Link key={f.id} href={`/flower/${f.id}`}>
                    <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-gray-100">
                      <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        {(f.photos?.[0]?.file_path || wikimediaCache[f.id]) ? (
                          <Image
                            src={f.photos?.[0]?.file_path || wikimediaCache[f.id]}
                            alt={f.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                            unoptimized={f.photos?.[0]?.file_path?.startsWith('/uploads/')}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">🌸</div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{month}/{f.birth_day}</p>
                        <p className="font-medium text-gray-900 text-sm">{f.name}</p>
                        {f.language[0] && (
                          <p className="text-xs text-gray-500 line-clamp-1">「{f.language[0]}」</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
