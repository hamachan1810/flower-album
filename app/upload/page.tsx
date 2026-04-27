'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Flower, Photo } from '@/lib/types';

interface AnalyzeResult {
  flower: Flower;
  photo: Photo;
  error?: string;
}

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [flowerName, setFlowerName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
    setFlowerName('');
    setPrev(URL.createObjectURL(file));
  };

  const setPrev = (url: string) => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(url);
  };

  const handleReset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setSelectedFile(null);
    setPreview(null);
    setFlowerName('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile || !flowerName.trim()) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('images', selectedFile);
      formData.append('flowerName', flowerName.trim());

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.results?.[0]) {
        setResult(data.results[0]);
      } else if (data.error) {
        alert(`エラー: ${data.error}`);
      }
    } catch {
      alert('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">📷 花を登録</h1>
        <p className="text-sm text-gray-500 mt-1">
          写真と花の名前を入力して花言葉を調べます
        </p>
      </div>

      <div className="p-4 space-y-4">
        {!result ? (
          <>
            {/* Photo upload area */}
            <div
              onClick={() => !selectedFile && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl overflow-hidden transition-colors ${
                selectedFile
                  ? 'border-green-300'
                  : 'border-gray-200 hover:border-green-300 cursor-pointer active:bg-gray-50'
              }`}
            >
              {preview ? (
                <div className="relative w-full aspect-square">
                  <Image src={preview} alt="preview" fill className="object-cover" unoptimized />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg"
                  >
                    変更
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-3">🌸</div>
                  <p className="text-gray-600 font-medium">タップして写真を選択</p>
                  <p className="text-gray-400 text-sm mt-1">1枚選んでください</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Flower name input */}
            {selectedFile && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  花の名前 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={flowerName}
                  onChange={(e) => setFlowerName(e.target.value)}
                  placeholder="例：ガザニア、バラ、タンポポ"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">
                  Googleレンズ等で調べた花の名前を入力してください
                </p>
              </div>
            )}

            {/* Submit button */}
            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={uploading || !flowerName.trim()}
                className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">🌸</span>
                    花言葉を調べています...
                  </span>
                ) : (
                  '花言葉を調べて登録'
                )}
              </button>
            )}
          </>
        ) : (
          /* Result */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">✨ 登録完了！</h2>
              <button
                onClick={handleReset}
                className="text-sm text-green-600 border border-green-200 px-3 py-1 rounded-full"
              >
                次の花を登録
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {result.error ? (
                <div className="p-4 text-red-500">
                  <p className="font-medium">登録に失敗しました</p>
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
                      詳細を見る →
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
