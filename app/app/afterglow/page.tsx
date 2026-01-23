"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- 接続設定（既存のRectaの設定に書き換えてください） ---
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PAIR_ID = 'our-shared-secret'; // 二人だけの合言葉
const VISIBLE_DELAY_MS = 24 * 60 * 60 * 1000; // 24時間
const LIFESPAN_MS = 168 * 60 * 60 * 1000;    // 7日間

export default function AfterglowPage() {
  const [scraps, setScraps] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // 地層の取得ロジック
  const fetchScraps = useCallback(async () => {
    const { data, error } = await supabase
      .from('afterglow_scraps')
      .select('*')
      .eq('pair_id', PAIR_ID)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch error:', error);
      return;
    }

    if (data) {
      const now = Date.now();
      // 24時間以上経過、かつ7日以内のものだけ（これが時間の制約）
      const visible = data.filter(s => {
        const age = now - new Date(s.created_at).getTime();
        return age > VISIBLE_DELAY_MS && age < LIFESPAN_MS;
      });
      setScraps(visible);
    }
  }, []);

  useEffect(() => {
    fetchScraps();
    const timer = setInterval(fetchScraps, 60000); // 1分おきに更新
    return () => clearInterval(timer);
  }, [fetchScraps]);

  // 投函（明日へのアップロード）
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || loading) return;
    setLoading(true);

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const path = `afterglow/${fileName}`;
      
      // 1. Storageへのアップロード (バケット名 'images' を想定)
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(path);

      // 2. DBへの挿入
      const { error: insertError } = await supabase
        .from('afterglow_scraps')
        .insert([{
          image_url: publicUrl,
          keyword: note,
          pair_id: PAIR_ID
        }]);

      if (insertError) throw insertError;

      setNote('');
      alert("地層に沈みました。24時間後に浮上します。");
      fetchScraps();
    } catch (err) {
      console.error('Upload failed:', err);
      alert("投函に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E5E2D5] text-[#2D2D2D] font-serif p-8 md:p-20 overflow-x-hidden selection:bg-black/5">
      
      {/* 1. Header: Rubbishの地層であることを示す */}
      <h1 className="fixed top-8 left-8 text-[10px] tracking-[0.8em] opacity-30 uppercase select-none">
        Rubbish / Afterglow
      </h1>

      {/* 2. Main: 24時間後の断片が混ざり合う空間 */}
      <div className="relative flex flex-wrap justify-center items-center gap-12 mt-20 mb-40">
        {scraps.length > 0 ? (
          scraps.map((s, i) => (
            <div 
              key={s.id}
              className="relative group transition-all duration-700 hover:scale-105"
              style={{ 
                rotate: `${(i % 2 === 0 ? 2 : -2) + (Math.sin(i) * 3)}deg`,
                marginTop: `${Math.sin(i) * 30}px`
              }}
            >
              <div className="bg-[#F5F2E9] p-4 shadow-[20px_20px_60px_rgba(0,0,0,0.05)] w-60 md:w-80">
                <div className="aspect-square bg-black/5 overflow-hidden">
                  <img 
                    src={s.image_url} 
                    alt="scrap"
                    className="w-full h-full object-cover mix-blend-multiply opacity-80 grayscale-[0.1] contrast-[0.9]" 
                  />
                </div>
                <p className="mt-5 text-[13px] italic opacity-60 leading-relaxed tracking-tight">
                  {s.keyword}
                </p>
                <div className="mt-4 flex justify-between items-center opacity-20 text-[8px] tracking-widest uppercase">
                  <span>{new Date(s.created_at).toLocaleDateString()}</span>
                  <span>{PAIR_ID}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="mt-40 opacity-20 italic text-[11px] tracking-[0.2em] animate-pulse">
            Waiting for the sediment to surface...
          </div>
        )}
      </div>

      {/* 3. Footer Input: 未来への投函口 */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 w-72">
        <input 
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 20))}
          placeholder="Note (max 20 chars)"
          className="w-full bg-transparent border-b border-black/10 text-center py-2 text-[14px] italic outline-none focus:border-black/30 transition-all placeholder:opacity-20"
        />
        
        <label className="group cursor-pointer flex flex-col items-center gap-2">
          <span className="text-[10px] tracking-[0.5em] font-bold opacity-30 group-hover:opacity-100 transition-opacity uppercase">
            {loading ? "Archiving..." : "Archive to Tomorrow"}
          </span>
          <input 
            type="file" 
            className="hidden" 
            onChange={onUpload} 
            accept="image/*" 
          />
        </label>
      </div>

      {/* 装飾：紙の質感（オーバーレイ） */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
    </div>
  );
}