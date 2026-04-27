'use client';

import { EMOTION_COLORS, EMOTION_LABELS } from '@/lib/types';

interface EmotionBadgeProps {
  emotion: string;
  size?: 'sm' | 'md';
}

export default function EmotionBadge({ emotion, size = 'md' }: EmotionBadgeProps) {
  const color = EMOTION_COLORS[emotion] || '#9E9E9E';
  const label = EMOTION_LABELS[emotion] || emotion;

  // Determine text color based on background brightness
  const isLight = ['#FFE234', '#8BC34A', '#29B6F6', '#90A4AE'].includes(color);
  const textColor = isLight ? '#333333' : '#ffffff';

  const paddingClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${paddingClass}`}
      style={{ backgroundColor: color, color: textColor }}
    >
      {label}
    </span>
  );
}
