"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- Supabase設定（既存のものを流用してください） ---
const supabase = createClient('YOUR_URL', 'YOUR_ANON_KEY');
const PAIR_ID = 'our-secret-room'; // 二人だけの識別子
const VISIBLE_DELAY_MS = 24 * 60 * 60 * 1000; // 24時間
const LIFESPAN_MS = 168 * 60 * 60 * 1000;    // 7日間

export default function AfterglowPage() {
  const [scraps, setScraps] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchScraps = useCallback(async () => {
    const { data } = await supabase
      .from('afterglow_scraps')
      .select('*')
      .eq('pair_id', PAIR_ID)
      .order('created_at', { ascending: false });

    if (data) {
      const now = Date.now();
      // 24時間以上経過、かつ7日以内のものだけを抽出
      const visible = data.filter(s => {
        const age = now - new Date(s.created_at).getTime();
        return age > VISIBLE_DELAY_MS && age < LIFESPAN_MS;
      });
      setScraps(visible);
    }
  }, []);

  useEffect(() => {
    fetchScraps();
    const timer = setInterval(fetchScraps, 60000); // 1分ごとに更新
    return () => clearInterval(timer);
  }, [fetchScraps]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || loading) return;
    setLoading(true);

    try {
      // 1. 画像アップロード (Storage名は適宜変更してください)
      const path = `afterglow/${Date.now()}_${file.name}`;
      const { data: storageData } = await supabase.storage.from('images').upload(path, file);
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path);

      // 2. DBへ記録
      await supabase.from('afterglow_scraps').insert([{
        image_url: publicUrl,
        keyword: note,
        pair_id: PAIR_ID
      }]);

      setNote('');
      alert("地層に沈みました。24時間後に現れます。");
      fetchScraps();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E5E2D5] text-[#2D2D2D] font-serif p-8 md:p-20 overflow-x-hidden">
      {/* ヘッダー：Rubbishの思想を継承 */}
      <h1 className="fixed top-8 left-8 text-[10px] tracking-[0.8em] opacity-30 uppercase select-none">
        Afterglow / {PAIR_ID}
      </h1>

      {/* 地層レイアウト：昨日の断片たちが重なり合う */}
      <div className="relative flex flex-wrap justify-center items-center gap-12 mt-20">
        {scraps.length > 0 ? (
          scraps.map((s, i) => (
            <div 
              key={s.id}
              className="relative group transition-transform duration-500 hover:z-50"
              style={{ 
                rotate: `${(i % 2 === 0 ? 3 : -3) + (Math.sin(i) * 2)}deg`,
                marginTop: `${Math.sin(i) * 40}px`
              }}
            >
              <div className="bg-[#F5F2E9] p-3 shadow-[15px_15px_40px_rgba(0,0,0,0.06)] w-56 md:w-72">
                <div className="aspect-square bg-black/5 overflow-hidden">
                  <img src={s.image_url} className="w-full h-full object-cover mix-blend-multiply opacity-90 grayscale-[0.2]" />
                </div>
                <p className="mt-4 text-[12px] md:text-[14px] italic opacity-60 leading-relaxed min-h-[1.5em]">
                  {s.keyword}
                </p>
                <span className="block mt-2 text-[8px] opacity-20 text-right uppercase">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="mt-40 opacity-20 italic text-[12px]">The sediment is not yet visible.</div>
        )}
      </div>

      {/* 投稿エリア：付箋のようなインプット */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-64">
        <input 
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 20))}
          placeholder="..."
          className="w-full bg-transparent border-b border-black/10 text-center p-2 text-[14px] italic outline-none focus:border-black/30 transition-colors"
        />
        <label className="cursor-pointer text-[10px] tracking-[0.4em] font-bold opacity-30 hover:opacity-100 transition-opacity">
          {loading ? "ARCHIVING..." : "SEND TO TOMORROW"}
          <input type="file" className="hidden" onChange={onUpload} accept="image/*" />
        </label>
      </div>
    </div>
  );
}