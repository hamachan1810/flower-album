'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Flower, INaturalistObservation } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function MapPage() {
  const { id } = useParams();
  const router = useRouter();
  const [flower, setFlower] = useState<Flower | null>(null);
  const [observations, setObservations] = useState<INaturalistObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingObs, setLoadingObs] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(10);
  const [locationError, setLocationError] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6762, 139.6503]); // Tokyo default

  useEffect(() => {
    fetch(`/api/flowers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setFlower(data.flower || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          setMapCenter(loc);
        },
        () => {
          setLocationError('位置情報を取得できませんでした');
        }
      );
    }
  }, [id]);

  const fetchObservations = useCallback(async () => {
    if (!userLocation) return;
    setLoadingObs(true);
    try {
      const params = new URLSearchParams({
        flower_id: id as string,
        lat: String(userLocation[0]),
        lng: String(userLocation[1]),
        radius: String(radius),
      });
      const res = await fetch(`/api/inaturalist?${params.toString()}`);
      const data = await res.json();
      setObservations(data.observations || []);
    } catch {
      setObservations([]);
    } finally {
      setLoadingObs(false);
    }
  }, [id, userLocation, radius]);

  useEffect(() => {
    if (userLocation) {
      fetchObservations();
    }
  }, [fetchObservations, userLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin text-4xl">🌸</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={() => router.back()} className="text-green-600 text-sm flex items-center gap-1 mb-2">
          ← 戻る
        </button>
        <h1 className="font-bold text-gray-900">
          🗺️ {flower?.name || '花'} を見つけに行く
        </h1>
        {locationError && (
          <p className="text-xs text-red-500 mt-1">{locationError}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <label className="text-xs text-gray-500 flex-shrink-0">
            範囲: {radius}km
          </label>
          <input
            type="range"
            min={1}
            max={50}
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="flex-1"
          />
          <button
            onClick={fetchObservations}
            disabled={loadingObs || !userLocation}
            className="flex-shrink-0 px-3 py-1 bg-green-500 text-white rounded-full text-xs disabled:opacity-50"
          >
            {loadingObs ? '検索中...' : '検索'}
          </button>
        </div>
        {observations.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {observations.length}件の観察記録が見つかりました
          </p>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          observations={observations}
          center={mapCenter}
          zoom={12}
        />

        {/* No observations overlay */}
        {!loadingObs && observations.length === 0 && userLocation && flower?.habitat_description && (
          <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-lg p-4 border border-green-100">
            <p className="text-xs text-green-600 font-medium mb-1">📍 よく見つかる場所</p>
            <p className="text-sm text-gray-700">{flower.habitat_description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
