'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24pLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RectaBulletproof() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInput, setShowInput] = useState<{file: File | null} | null>(null);
  const [inputText, setInputText] = useState('');
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // 1. データ取得 (最新順)
  const fetchData = useCallback(async () => {
    console.log("🛰 Fetching data...");
    const { data, error } = await supabase
      .from('mainline')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ Fetch Error:", error);
      return;
    }

    console.log("✅ Fetched Nodes:", data);
    setNodes(data || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 2. 投稿ロジック (分析に基づいた防弾仕様)
  const handleUpload = async () => {
    if (!showInput && !inputText.trim()) return;
    setIsProcessing(true);
    let publicUrl = null;

    try {
      // 画像処理
      if (showInput?.file) {
        const file = showInput.file;
        const fileName = `${Date.now()}-${file.name}`;
        const { error: storageError } = await supabase.storage.from('images').upload(fileName, file);
        if (storageError) throw storageError;
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      // DBインサート (強制created_at + select)
      console.log("🚀 Attempting to Insert...");
      const { data: inserted, error: dbError } = await supabase
        .from('mainline')
        .insert([{
          image_url: publicUrl,
          description: inputText.trim() || null,
          owner_id: 'guest_bulletproof',
          created_at: new Date().toISOString() // 💡 強制的に現在時刻を刻印
        }])
        .select(); // 💡 挿入されたデータを即座に返す

      if (dbError) {
        console.error("❌ DB Insert Error:", dbError);
        throw dbError;
      }

      console.log("💎 Successfully Inserted:", inserted);

      // 成功したら即反映
      setShowInput(null);
      setInputText('');
      fetchData(); 

    } catch (e: any) {
      console.error("🔥 Global Error:", e);
      alert(`Error: ${e.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- UI Components (Tile, NodeView) は前回と同じ ---
  // (中略: 可読性のためにTile/NodeViewの詳細はGenesis版と同じとします)

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-x-hidden selection:bg-black selection:text-white">
      <style jsx global>{`
        .stone-wall { column-count: 2; column-gap: 0.5rem; }
        @media (min-width: 640px) { .stone-wall { column-count: 3; } }
        @media (min-width: 1024px) { .stone-wall { column-count: 4; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* HEADER */}
      <header className="py-8 flex flex-col items-center sticky top-0 z-[50]">
        <h1 className="text-[10px] tracking-[1.2em] font-black uppercase opacity-20 bg-[#EBE8DB]/60 backdrop-blur-md px-8 py-3 rounded-full border border-black/5">Rubbish</h1>
      </header>

      {/* MAIN WALL */}
      <main className="p-2 max-w-[140rem] mx-auto pb-48">
        <div className="stone-wall">
          {nodes.map((node) => (
            <div 
              key={node.id} 
              onClick={() => setSelectedNode(node)}
              className="relative mb-2 break-inside-avoid group cursor-pointer overflow-hidden rounded-sm transition-all bg-[#EDE9D9] border border-black/5"
            >
              {node.image_url ? (
                <img src={node.image_url} alt="" className="w-full h-auto block opacity-95 group-hover:opacity-100 transition-opacity" loading="lazy" />
              ) : (
                <div className="w-full p-8 flex items-center justify-center min-h-[140px] italic text-black/60 text-[14px] text-center whitespace-pre-wrap">{node.description}</div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* FOOTER NAV (◎) */}
      <nav className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[500]">
         <button onClick={() => setShowInput({ file: null })} className="bg-white/50 backdrop-blur-lg w-20 h-20 rounded-full shadow-2xl border border-black/5 text-3xl opacity-30 hover:opacity-100 hover:scale-105 active:scale-95 transition-all">◎</button>
      </nav>

      {/* MODALS & OTHERS (前回コードと同様) */}
      {/* ...省略... */}
      
      {/* 投稿用モーダル */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/99 backdrop-blur-3xl z-[2000] flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-300">
          <textarea autoFocus value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Fragment..." className="w-full max-w-xl bg-transparent border-none text-3xl italic outline-none text-center text-black/70 h-64 no-scrollbar resize-none" />
          <div className="mt-20 flex items-center space-x-20">
            <button onClick={() => setShowInput(null)} className="text-[10px] uppercase tracking-[0.3em] opacity-20">Discard</button>
            <label className="text-3xl opacity-30 cursor-pointer relative">{showInput.file ? '📸' : '◎'}<input type="file" className="hidden" accept="image/*" onChange={(e) => setShowInput({ file: e.target.files?.[0] || null })} /></label>
            <button onClick={handleUpload} className="text-[10px] uppercase tracking-[0.3em] font-black border-b-2 border-black/10">Archive</button>
          </div>
        </div>
      )}

      {/* LOADING */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[4000] flex items-center justify-center text-[10px] tracking-[1em] font-black uppercase italic text-black/40 animate-pulse">Archiving</div>
      )}

      {/* SELECTED VIEW */}
      {selectedNode && (
        <div className="fixed inset-0 z-[1000] bg-[#EBE8DB]/98 backdrop-blur-3xl p-6 overflow-y-auto" onClick={() => setSelectedNode(null)}>
          <div className="max-w-4xl mx-auto pt-20 flex flex-col items-center" onClick={e => e.stopPropagation()}>
             {selectedNode.image_url && <img src={selectedNode.image_url} className="w-full max-h-[80vh] object-contain shadow-2xl rounded-sm mb-8" />}
             <p className="text-2xl italic text-black/80 text-center whitespace-pre-wrap">{selectedNode.description}</p>
             <button onClick={() => setSelectedNode(null)} className="mt-12 opacity-20 uppercase text-[10px] tracking-widest font-black">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}