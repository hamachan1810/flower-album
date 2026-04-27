'use client';

import { EMOTION_COLORS, EMOTION_LABELS } from '@/lib/types';

interface FilterBarProps {
  emotion: string;
  season: string;
  sceneTag: string;
  sourceCulture: string;
  birthMonth: string;
  onEmotionChange: (v: string) => void;
  onSeasonChange: (v: string) => void;
  onSceneTagChange: (v: string) => void;
  onSourceCultureChange: (v: string) => void;
  onBirthMonthChange: (v: string) => void;
}

const SEASONS = ['春', '夏', '秋', '冬'];
const SCENE_TAGS = ['告白', '贈り物', '結婚', '卒業', '誕生日', '友情', '追悼'];
const CULTURES = ['西洋', '日本', '中国', 'ビクトリア朝'];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function FilterBar({
  emotion,
  season,
  sceneTag,
  sourceCulture,
  birthMonth,
  onEmotionChange,
  onSeasonChange,
  onSceneTagChange,
  onSourceCultureChange,
  onBirthMonthChange,
}: FilterBarProps) {
  return (
    <div className="space-y-3 px-4 py-3 bg-white border-b border-gray-100">
      {/* Emotions */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5">感情</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {Object.entries(EMOTION_COLORS).map(([key, color]) => {
            const isLight = ['#FFE234', '#8BC34A', '#29B6F6', '#90A4AE'].includes(color);
            const textColor = isLight ? '#333' : '#fff';
            const isActive = emotion === key;
            return (
              <button
                key={key}
                onClick={() => onEmotionChange(isActive ? '' : key)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  isActive ? 'ring-2 ring-offset-1 ring-gray-400 scale-105' : 'opacity-70'
                }`}
                style={{ backgroundColor: color, color: textColor }}
              >
                {EMOTION_LABELS[key]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Season */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <span className="text-xs text-gray-500 self-center flex-shrink-0">季節:</span>
        {SEASONS.map((s) => (
          <button
            key={s}
            onClick={() => onSeasonChange(season === s ? '' : s)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs border transition-all ${
              season === s
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Scene tags */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <span className="text-xs text-gray-500 self-center flex-shrink-0">シーン:</span>
        {SCENE_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => onSceneTagChange(sceneTag === tag ? '' : tag)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs border transition-all ${
              sceneTag === tag
                ? 'bg-pink-500 text-white border-pink-500'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Row: culture + birth month */}
      <div className="flex gap-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
          <span className="text-xs text-gray-500 self-center flex-shrink-0">文化:</span>
          {CULTURES.map((c) => (
            <button
              key={c}
              onClick={() => onSourceCultureChange(sourceCulture === c ? '' : c)}
              className={`flex-shrink-0 px-2 py-1 rounded-full text-xs border transition-all ${
                sourceCulture === c
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Birth month */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        <span className="text-xs text-gray-500 self-center flex-shrink-0">誕生月:</span>
        {MONTHS.map((m) => (
          <button
            key={m}
            onClick={() => onBirthMonthChange(birthMonth === String(m) ? '' : String(m))}
            className={`flex-shrink-0 w-8 h-8 rounded-full text-xs border transition-all ${
              birthMonth === String(m)
                ? 'bg-amber-400 text-white border-amber-400'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
