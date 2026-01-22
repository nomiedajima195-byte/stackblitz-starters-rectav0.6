"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- Supabase Config (既存のものに書き換えてください) ---
const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
const ROOM_ID = 'our-shared-secret'; // 二人だけの合言葉

export default function Page() {
  const [view, setView] = useState<'rubbish' | 'afterglow'>('rubbish');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'afterglow') {
      setView('afterglow');
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#EBE8DB]">
      {view === 'rubbish' ? (
        <RubbishView /> // ここに今の Rubbish の中身を移植
      ) : (
        <AfterglowView />
      )}
    </main>
  );
}

// --- 既存の RubbishUI コンポーネント (今のコードをここに) ---
function RubbishView() {
  return (
    <div className="p-10 text-center">
      <h1 className="text-xl font-serif">Rubbish</h1>
      {/* 既存の Artifact 表示ロジックをここに */}
    </div>
  );
}

// --- 新しい AfterglowUI コンポーネント ---
function AfterglowView() {
  const [scraps, setScraps] = useState<any[]>([]);
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
      // 24時間以上経過したものだけを表示（これが「遅い」の核心）
      const visible = data.filter(s => (now - new Date(s.created_at).getTime()) > delay);
      setScraps(visible);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const archiveScrap = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;
    setIsUploading(true);

    // ※ ここに Recta 同様の画像圧縮・アップロード処理を流用
    // ... insert to 'afterglow_scraps' ...
    
    alert("地層に沈みました。明日、浮上します。");
    setIsUploading(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-12 overflow-x-hidden select-none">
      <header className="mb-20 opacity-20 text-center tracking-[0.6em] font-bold uppercase text-[10px]">
        Afterglow / {ROOM_ID}
      </header>

      {/* スクラップブック・レイアウト */}
      <div className="flex flex-wrap justify-center gap-12 pb-40">
        {scraps.map((s, i) => (
          <div 
            key={s.id} 
            className="transform transition-transform hover:scale-105"
            style={{ 
              rotate: `${(i % 2 === 0 ? 3 : -3) + (i % 3 === 0 ? 1 : -1)}deg`,
              marginTop: i % 2 === 0 ? '0px' : '40px'
            }}
          >
            <div className="bg-[#F5F2E9] p-4 shadow-[10px_10px_30px_rgba(0,0,0,0.05)] w-64">
              <div className="bg-black/5 aspect-square overflow-hidden">
                <img src={s.image_url} className="w-full h-full object-cover mix-blend-multiply opacity-80" />
              </div>
              <p className="mt-4 text-[12px] italic text-black/50 leading-tight">
                {s.keyword}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 投稿エリア：自分にしか見えない「未来への投函」 */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <input 
          maxLength={20}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="..."
          className="bg-transparent border-b border-black/10 text-center p-2 italic text-[14px] outline-none w-48 mb-4"
        />
        <label className="cursor-pointer text-[10px] font-bold tracking-widest opacity-30 hover:opacity-100 transition-opacity">
          {isUploading ? "TRANSMITTING..." : "ARCHIVE"}
          <input type="file" className="hidden" onChange={archiveScrap} />
        </label>
      </div>
    </div>
  );
}