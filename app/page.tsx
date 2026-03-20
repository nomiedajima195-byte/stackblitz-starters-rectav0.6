'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase設定 (前回同様)
const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000; // 1週間で消える

export default function NodeWallPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showInput, setShowInput] = useState<{file: File | null} | null>(null);
  const [inputText, setInputText] = useState('');
  const [ownerId, setOwnerId] = useState<string>('');

  // 簡易的なID生成とデータ取得
  useEffect(() => {
    let id = localStorage.getItem('recta_owner_id');
    if (!id) {
      id = `USR-${Date.now()}`;
      localStorage.setItem('recta_owner_id', id);
    }
    setOwnerId(id);
    fetchData();
  }, []);

  // データの取得 (石垣レイアウト用)
  const fetchData = useCallback(async () => {
    const { data, error } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (error) return;
    const now = new Date().getTime();
    const active = data.filter(n => (now - new Date(n.created_at).getTime()) < LIFESPAN_MS);
    setNodes(active);
  }, []);

  // 投稿処理 (画像とテキスト)
  const handleUpload = async () => {
    if (!showInput && !inputText.trim()) return; // 中身がなければ何もしない
    setIsUploading(true);
    let publicUrl = null;

    try {
      // 1. 画像がある場合はStorageへ
      if (showInput?.file) {
        const file = showInput.file;
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
        if (!uploadError) {
          const { data } = supabase.storage.from('images').getPublicUrl(fileName);
          publicUrl = data.publicUrl;
        }
      }

      // 2. DBへインサート (オリジナルノード)
      await supabase.from('mainline').insert([{
        id: `${Date.now()}`,
        image_url: publicUrl, // 画像がない場合はnull
        description: inputText.trim() || null, // テキストがない場合はnull
        owner_id: ownerId
      }]);

      setShowInput(null);
      setInputText('');
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  // タイルコンポーネント (器を捨て、中身を直接見せる)
  const Tile = ({ node }: any) => {
    const isImage = !!node.image_url;
    return (
      <div className="relative mb-2 break-inside-avoid group cursor-pointer overflow-hidden rounded-sm transition-all duration-700 hover:shadow-2xl active:scale-95 bg-[#EDE9D9] border border-black/5">
        {isImage ? (
          // 完全画像表示 (本来の比率)
          <div className="w-full h-auto overflow-hidden">
            <img 
              src={node.image_url} 
              className="w-full h-auto object-contain grayscale group-hover:grayscale-0 opacity-90 group-hover:opacity-100 transition-all duration-700 ease-out" 
              alt=""
              loading="lazy"
            />
            {node.description && (
              // 画像ホバー時にテキストを重ねる
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-[10px] italic line-clamp-2 leading-tightwhitespace-pre-wrap">{node.description}</p>
              </div>
            )}
          </div>
        ) : (
          // テキストのみ表示 (空間上に浮かぶ文字)
          <div className="w-full p-8 flex items-center justify-center min-h-[140px] hover:bg-[#F5F2E9] transition-colors">
            <p className="text-[14px] leading-relaxed italic text-black/60 group-hover:text-black transition-colors text-center whitespace-pre-wrap">
              {node.description}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif p-1">
      {/* 石垣レイアウトのCSSアルゴリズム */}
      <style jsx global>{`
        .stone-wall {
          column-count: 2;
          column-gap: 0.25rem;
        }
        @media (min-width: 640px) { .stone-wall { column-count: 3; } }
        @media (min-width: 1024px) { .stone-wall { column-count: 4; } }
        @media (min-width: 1536px) { .stone-wall { column-count: 6; } }
      `}</style>

      <header className="py-6 flex flex-col items-center sticky top-0 z-[100] pointer-events-none">
        <h1 className="text-[9px] tracking-[1em] font-black uppercase opacity-20 bg-[#EBE8DB]/80 backdrop-blur-sm px-6 py-2 rounded-full border border-black/5">Rubbish Fragments</h1>
      </header>

      {/* メイン空間：石垣タイルレイアウト */}
      <div className="stone-wall max-w-[120rem] mx-auto pb-48">
        {nodes.map(node => (
          <Tile key={node.id} node={node} />
        ))}
      </div>

      {/* フッターUI (純化した投稿ボタン) */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center bg-[#F5F2E9]/60 backdrop-blur-xl px-12 py-5 rounded-full shadow-2xl border border-white/20 z-[500] hover:bg-[#F5F2E9] transition-all duration-500 hover:scale-105 active:scale-95">
         <button 
           onClick={() => setShowInput({file: null})} 
           className="text-2xl opacity-30 hover:opacity-100 transition-opacity"
         >
           ◎
         </button>
      </nav>

      {/* 投稿入力モーダル (純粋入力空間) */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/98 backdrop-blur-3xl z-[2000] flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-300">
          <textarea 
            autoFocus 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)} 
            placeholder="Fragment..." 
            className="w-full max-w-xl bg-transparent border-none text-2xl italic outline-none text-center text-black/80 h-64 resize-none no-scrollbar" 
          />
          
          <div className="mt-16 flex items-center space-x-16">
            {/* キャンセル */}
            <button 
              onClick={() => { setShowInput(null); setInputText(''); }} 
              className="text-[10px] uppercase tracking-widest opacity-20 hover:opacity-100 transition-opacity"
            >
              Discard
            </button>
            
            {/* 画像選択 (入力中に追加可能) */}
            <label className="text-xl opacity-30 hover:opacity-100 transition-opacity cursor-pointer">
              {showInput.file ? '📸' : '◎'}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setShowInput({file: f});
              }} />
            </label>

            {/* POST */}
            <button 
              onClick={handleUpload} 
              className="text-[10px] uppercase tracking-widest font-black"
            >
              Archive
            </button>
          </div>
        </div>
      )}

      {/* アップロード中表示 */}
      {isUploading && (
        <div className="fixed inset-0 bg-[#EBE8DB]/80 backdrop-blur-md z-[3000] flex items-center justify-center text-[9px] tracking-[0.8em] font-black uppercase italic animate-pulse">Archiving...</div>
      )}
    </div>
  );
}