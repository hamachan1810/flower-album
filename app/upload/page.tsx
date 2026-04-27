'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Flower, Photo } from '@/lib/types';
import EmotionBadge from '@/components/EmotionBadge';

interface AnalyzeResult {
  flower: Flower;
  photo: Photo;
  error?: string;
}

export default function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<AnalyzeResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setResults([]);

    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews(newPreviews);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setProgress(0);
    setResults([]);

    const allResults: AnalyzeResult[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        setCurrentIndex(i + 1);
        setProgress(Math.round((i / selectedFiles.length) * 90));

        const formData = new FormData();
        formData.append('images', selectedFiles[i]);

        const res = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.results) {
          allResults.push(...data.results);
          setResults([...allResults]);
        } else if (data.error) {
          allResults.push({ flower: null as unknown as import('@/lib/types').Flower, photo: null as unknown as import('@/lib/types').Photo, error: data.error });
          setResults([...allResults]);
        }
      }
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setPreviews([]);
    setResults([]);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">📷 花をアップロード</h1>
        <p className="text-sm text-gray-500 mt-1">
          写真をAIが分析して花言葉を自動記録します
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* File upload area */}
        {results.length === 0 && (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-green-300 transition-colors active:bg-gray-50"
            >
              <div className="text-4xl mb-3">🌸</div>
              <p className="text-gray-600 font-medium">タップして写真を選択</p>
              <p className="text-gray-400 text-sm mt-1">複数選択OK（JPEG, PNG）</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <Image
                      src={url}
                      alt={`Preview ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="33vw"
                    />
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            {selectedFiles.length > 0 && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">🌸</span>
                    AI分析中... ({currentIndex}/{selectedFiles.length})
                  </span>
                ) : (
                  `${selectedFiles.length}枚をアップロード`
                )}
              </button>
            )}

            {/* Progress bar */}
            {uploading && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 rounded-full h-2 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">✨ 解析結果</h2>
              <button
                onClick={handleReset}
                className="text-sm text-green-600 border border-green-200 px-3 py-1 rounded-full"
              >
                もう一枚
              </button>
            </div>

            {results.map((result, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {result.error ? (
                  <div className="p-4 text-red-500">
                    <p>解析に失敗しました</p>
                    <p className="text-xs mt-1">{result.error}</p>
                  </div>
                ) : (
                  <>
                    {result.photo?.file_path && (
                      <div className="relative w-full aspect-video">
                        <Image
                          src={result.photo.file_path}
                          alt={result.flower.name}
                          fill
                          className="object-cover"
                          unoptimized
                          sizes="100vw"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-xl text-gray-900">{result.flower.name}</h3>
                      {result.flower.name_scientific && (
                        <p className="text-gray-400 italic text-sm">{result.flower.name_scientific}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {result.flower.primary_emotions?.map((em) => (
                          <EmotionBadge key={em} emotion={em} />
                        ))}
                      </div>
                      {result.flower.language?.length > 0 && (
                        <div className="mt-3 p-3 bg-pink-50 rounded-xl">
                          {result.flower.language.map((lang, j) => (
                            <p key={j} className="font-medium text-gray-800">「{lang}」</p>
                          ))}
                        </div>
                      )}
                      {result.flower.season && (
                        <p className="text-sm text-gray-500 mt-2">🌿 {result.flower.season}の花</p>
                      )}
                      <Link
                        href={`/flower/${result.flower.id}`}
                        className="block mt-3 py-2.5 bg-green-500 text-white rounded-xl text-center text-sm font-medium"
                      >
                        詳細を見る
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
