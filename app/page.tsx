'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase設定 (前回同様)
const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24pLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000; // 1週間で消える

export default function NodeWallPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showInput, setShowInput] = useState<{file: File | null} | null>(null);
  const [inputText, setInputText] = useState('');
  const [ownerId, setOwnerId] = useState<string>('');
  
  // 拡大表示用の状態
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // ID生成とデータ取得
  useEffect(() => {
    let id = localStorage.getItem('recta_owner_id');
    if (!id) {
      id = `USR-${Date.now()}`;
      localStorage.setItem('recta_owner_id', id);
    }
    setOwnerId(id);
    fetchData();
  }, []);

  // データの取得
  const fetchData = useCallback(async () => {
    const { data, error } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (error) return;
    const now = new Date().getTime();
    const active = data.filter(n => (now - new Date(n.created_at).getTime()) < LIFESPAN_MS);
    setNodes(active);
  }, []);

  // 投稿処理
  const handleUpload = async () => {
    if (!showInput && !inputText.trim()) return;
    setIsUploading(true);
    let publicUrl = null;

    try {
      if (showInput?.file) {
        const file = showInput.file;
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
        if (!uploadError) {
          const { data } = supabase.storage.from('images').getPublicUrl(fileName);
          publicUrl = data.publicUrl;
        }
      }

      await supabase.from('mainline').insert([{
        id: `${Date.now()}`,
        image_url: publicUrl,
        description: inputText.trim() || null,
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

  // タイルコンポーネント (メイン画面用：純粋表示)
  const Tile = ({ node, onClick }: any) => {
    const isImage = !!node.image_url;
    return (
      <div 
        onClick={() => onClick(node)}
        className="relative mb-2 break-inside-avoid group cursor-pointer overflow-hidden rounded-sm transition-all duration-500 hover:shadow-2xl active:scale-95 border border-black/5 bg-[#EDE9D9]"
      >
        {isImage ? (
          // 画像表示 (本来の比率、カラー)
          <div className="w-full h-auto overflow-hidden bg-[#DDD9CD]">
            <img 
              src={node.image_url} 
              className="w-full h-auto object-contain opacity-95 group-hover:opacity-100 transition-all duration-700 ease-out" 
              alt=""
              loading="lazy"
            />
            {/* メイン画面では画像上のテキストを廃止（仕様変更） */}
          </div>
        ) : (
          // テキストのみ表示
          <div className="w-full p-8 flex items-center justify-center min-h-[140px] hover:bg-[#F5F2E9] transition-colors">
            <p className="text-[14px] leading-relaxed italic text-black/60 group-hover:text-black transition-colors text-center whitespace-pre-wrap">
              {node.description}
            </p>
          </div>
        )}
      </div>
    );
  };

  // 没入型 View モーダル (拡大表示用)
  const NodeView = ({ node, onClose }: any) => {
    const isImage = !!node.image_url;
    return (
      <div 
        className="fixed inset-0 z-[1000] bg-[#EBE8DB]/98 backdrop-blur-2xl overflow-y-auto no-scrollbar animate-in fade-in duration-300"
        onClick={onClose} // 背景クリックで閉じる
      >
        {/* 閉じるボタン */}
        <button className="fixed top-8 right-8 text-2xl opacity-20 hover:opacity-100 transition-opacity z-[1100]">✕</button>

        <div className="flex flex-col items-center pt-24 pb-40 max-w-7xl mx-auto px-6" onClick={(e) => e.stopPropagation()}>
          <div className="w-full flex flex-col items-center">
            {isImage && (
              // 画像拡大表示 (本来の比率、カラー)
              <div className="w-full flex justify-center mb-12 shadow-2xl rounded-sm overflow-hidden bg-[#DDD9CD]">
                <img 
                  src={node.image_url} 
                  className="max-w-full max-h-[80vh] object-contain animate-in zoom-in-95 duration-500 delay-100" 
                  alt=""
                />
              </div>
            )}
            
            {node.description && (
              // テキスト分離表示 (画像の下、またはテキストのみ)
              <div className={`w-full max-w-3xl ${isImage ? 'p-6 bg-[#F5F2E9] rounded-md shadow-lg border border-black/5' : 'pt-20 text-center'}`}>
                <p className={`text-black/80 whitespace-pre-wrap italic ${isImage ? 'text-[15px] leading-relaxed' : 'text-3xl leading-snug'}`}>
                  {node.description}
                </p>
              </div>
            )}
            
            {/* メタ情報 (ID等) */}
            <div className="mt-16 text-[8px] font-bold opacity-10 tracking-[0.5em] uppercase italic">
              NODE // {node.id.slice(-4)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif p-1">
      {/* 石垣レイアウトのCSSアルゴリズム */}
      <style jsx global>{`
        .stone-wall { column-count: 2; column-gap: 0.25rem; }
        @media (min-width: 640px) { .stone-wall { column-count: 3; column-gap: 0.25rem; } }
        @media (min-width: 1024px) { .stone-wall { column-count: 4; column-gap: 0.25rem; } }
        @media (min-width: 1536px) { .stone-wall { column-count: 6; column-gap: 0.25rem; } }
        /* スクロールバーを隠す */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <header className="py-6 flex flex-col items-center sticky top-0 z-[100] pointer-events-none">
        <h1 className="text-[9px] tracking-[1em] font-black uppercase opacity-20 bg-[#EBE8DB]/80 backdrop-blur-sm px-6 py-2 rounded-full border border-black/5">Rubbish Fragments</h1>
      </header>

      {/* メイン空間：石垣タイルレイアウト (カラー版) */}
      <div className="stone-wall max-w-[120rem] mx-auto pb-48">
        {nodes.map(node => (
          <Tile key={node.id} node={node} onClick={setSelectedNode} />
        ))}
      </div>

      {/* 没入型 View モーダル */}
      {selectedNode && (
        <NodeView node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}

      {/* フッターUI (純化した投稿ボタン) */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center bg-[#EDE9D9]/50 backdrop-blur-sm px-12 py-5 rounded-full shadow-lg border border-black/5 z-[500] hover:bg-[#F5F2E9]/90 transition-all duration-500 hover:scale-105 active:scale-95">
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
            <button 
              onClick={() => { setShowInput(null); setInputText(''); }} 
              className="text-[10px] uppercase tracking-widest opacity-20 hover:opacity-100 transition-opacity"
            >
              Discard
            </button>
            
            <label className="text-xl opacity-30 hover:opacity-100 transition-opacity cursor-pointer">
              {showInput.file ? '📸' : '◎'}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setShowInput({file: f});
              }} />
            </label>

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