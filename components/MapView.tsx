'use client';

import { useEffect, useRef } from 'react';
import { INaturalistObservation } from '@/lib/types';

interface MapViewProps {
  observations: INaturalistObservation[];
  center: [number, number];
  zoom?: number;
}

export default function MapView({ observations, center, zoom = 12 }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Dynamic import to avoid SSR issues
    import('leaflet').then((L) => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
      }

      // Fix default icon
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!).setView(center, zoom);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      observations.forEach((obs) => {
        if (obs.lat && obs.lng) {
          const marker = L.marker([obs.lat, obs.lng]).addTo(map);
          let popupContent = `<div class="text-sm">`;
          if (obs.observed_on) {
            popupContent += `<p class="font-medium">${obs.observed_on}</p>`;
          }
          if (obs.photos?.[0]?.url) {
            const thumbUrl = obs.photos[0].url.replace('square', 'thumb');
            popupContent += `<img src="${thumbUrl}" alt="observation" class="w-24 h-24 object-cover mt-1 rounded" />`;
          }
          popupContent += `</div>`;
          marker.bindPopup(popupContent);
        }
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observations, center[0], center[1], zoom]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  );
}
