'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- 設定値（ご自身の環境に合わせて書き換えてください） ---
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const ROOM_ID = 'your-secret-shibuya-90s'; // 二人の合言葉
const MAX_PIXEL = 400; // スクラップの解像度

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function AfterglowScrapbook() {
  const [yesterdayScraps, setYesterdayScraps] = useState<any[]>([]);
  const [pastSediments, setPastSediments] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('afterglow_scraps')
      .select('*')
      .eq('room_id', ROOM_ID)
      .order('created_at', { ascending: false });

    if (data) {
      const now = Date.now();
      const delay = 24 * 60 * 60 * 1000;

      // 横軸：24時間〜48時間前（最新の昨日）
      const yesterday = data.filter(s => {
        const diff = now - new Date(s.created_at).getTime();
        return diff > delay && diff < delay * 2;
      });

      // 縦軸：それ以前の地層
      const sediments = data
        .filter(s => (now - new Date(s.created_at).getTime()) > delay * 2)
        .sort(() => Math.random() - 0.5);

      setYesterdayScraps(yesterday);
      setPastSediments(sediments);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const uploadScrap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;
    setIsUploading(true);

    const fileName = `${Date.now()}.png`;

    // 画像のリサイズ処理 (Recta互換)
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const ratio = img.height / img.width;
      canvas.width = MAX_PIXEL;
      canvas.height = MAX_PIXEL * ratio;
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        // 1. Storageへアップロード
        const { data: storageData, error: storageError } = await supabase.storage
          .from('images')
          .upload(fileName, blob);

        if (storageError) {
          console.error(storageError);
          setIsUploading(false);
          return;
        }

        // 2. 公開URL取得
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);

        // 3. DBへ記録
        await supabase.from('afterglow_scraps').insert([{
          image_url: publicUrl,
          keyword: keyword,
          room_id: ROOM_ID
        }]);

        setKeyword('');
        alert("昨日へ投げ入れました。"); // 未来（明日）に届くニュアンス
        setIsUploading(false);
        fetchData();
      }, 'image/png');
    };
  };

  return (
    <div className="min-h-screen bg-[#E5E2D5] text-[#2D2D2D] font-serif overflow-x-hidden pb-40">
      <header className="pt-12 pb-6 text-center opacity-30">
        <h1 className="text-[10px] tracking-[0.6em] font-bold uppercase">Afterglow</h1>
        <p className="text-[8px] mt-1 italic uppercase tracking-widest">Trash or Treasure</p>
      </header>

      {/* 横軸：最新の昨日 */}
      <div className="relative h-[50vh] flex items-center overflow-x-auto snap-x no-scrollbar px-[10vw] space-x-[-30px]">
        {yesterdayScraps.map((scrap, i) => (
          <div 
            key={scrap.id} 
            className="snap-center transform transition-transform hover:scale-105" 
            style={{ 
              rotate: `${(i % 2 === 0 ? 2 : -2) * (i % 3 === 0 ? 1.5 : 1)}deg`,
              zIndex: 10 + i 
            }}
          >
            <ScrapCard item={scrap} />
          </div>
        ))}
        {yesterdayScraps.length === 0 && (
          <div className="w-full text-center opacity-10 italic text-[12px]">
            The sediment of yesterday hasn't surfaced yet.
          </div>
        )}
      </div>

      {/* 縦軸：ランダムな過去 */}
      <div className="px-6 mt-20 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 opacity-50">
        {pastSediments.map((scrap) => (
          <div 
            key={scrap.id} 
            className="transform transition-opacity hover:opacity-100"
            style={{ rotate: `${(Math.random() * 8 - 4)}deg` }}
          >
            <ScrapCard item={scrap} mini />
          </div>
        ))}
      </div>

      {/* 投稿フォーム */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-[80vw] max-w-xs z-50">
        <div className="bg-[#F5F2E9]/80 backdrop-blur-md p-4 shadow-2xl border border-black/5 rounded-sm">
          <input 
            value={keyword}
            onChange={e => setKeyword(e.target.value.slice(0, 20))}
            className="w-full bg-transparent border-b border-black/20 p-2 text-[13px] italic text-center outline-none placeholder:opacity-20"
            placeholder="Fragments of today..."
          />
          <label className="block mt-4 text-center cursor-pointer group">
            <span className="text-[9px] tracking-[0.4em] font-bold uppercase opacity-40 group-hover:opacity-100 transition-opacity">
              {isUploading ? "Archiving..." : "Add Scrap"}
            </span>
            <input type="file" className="hidden" onChange={uploadScrap} accept="image/*" />
          </label>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        body { background-color: #E5E2D5; }
      `}</style>
    </div>
  );
}

const ScrapCard = ({ item, mini = false }: { item: any, mini?: boolean }) => (
  <div className={`bg-[#F5F2E9] shadow-[10px_10px_25px_rgba(0,0,0,0.08)] p-3 ${mini ? 'w-28' : 'w-56 md:w-64'} flex flex-col items-center border border-white/50`}>
    <div className="w-full aspect-square overflow-hidden bg-[#D1D1D1]">
      <img 
        src={item.image_url} 
        className="w-full h-full object-cover mix-blend-multiply opacity-90 grayscale-[0.2]" 
      />
    </div>
    {!mini && item.keyword && (
      <p className="mt-4 text-[12px] italic text-black/50 tracking-tight leading-tight w-full text-left px-1 font-serif">
        {item.keyword}
      </p>
    )}
  </div>
);