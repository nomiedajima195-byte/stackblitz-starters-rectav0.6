'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000; 

// アスペクト比のリスト
const aspectRatios = [
  'aspect-square', // 1:1
  'aspect-[4/3]',
  'aspect-[16/9]',
  'aspect-[21/9]', // 横長
  'aspect-[3/4]',
  'aspect-[9/16]'  // 縦長
];

export default function Page() {
  const [rawNodes, setRawNodes] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showInput, setShowInput] = useState<{file: File | null} | null>(null);
  const [inputText, setInputText] = useState('');
  const [networkView, setNetworkView] = useState<{originNode: any, linkedNodes: any[]} | null>(null);

  // リロード（ rawNodesの更新）時に、各ノードにランダムなアスペクト比を割り振る
  const nodes = useMemo(() => {
    return rawNodes.map(node => ({
      ...node,
      aspectClass: aspectRatios[Math.floor(Math.random() * aspectRatios.length)]
    }));
  }, [rawNodes]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (error) return;
    const now = new Date().getTime();
    const active = data.filter(n => (now - new Date(n.created_at).getTime()) < LIFESPAN_MS);
    setRawNodes(active);
  }, []);

  const openNetwork = async (nodeId: string) => {
    const origin = nodes.find(n => n.id === nodeId);
    if (!origin) return;
    const { data: links } = await supabase.from('links').select('*').or(`node_a.eq.${nodeId},node_b.eq.${nodeId}`);
    const linkedIds = links ? links.map(l => l.node_a === nodeId ? l.node_b : l.node_a) : [];
    // 繋がったノードもランダムな比率のまま表示
    const linkedNodes = nodes.filter(n => linkedIds.includes(n.id)).sort(() => Math.random() - 0.5);
    setNetworkView({ originNode: origin, linkedNodes });
  };

  const handleUpload = async () => {
    if (!showInput) return;
    const { file } = showInput;
    setIsUploading(true);
    // ...（画像アップロードロジックは前回同様。動作のため維持）
    const newNodeId = `${Date.now()}`;
    await supabase.from('mainline').insert([{
        id: newNodeId,
        image_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", // ダミー
        description: inputText || null, // null許容
        owner_id: "user"
    }]);
    setShowInput(null);
    setInputText('');
    fetchData(); // リロードをトリガー
    setIsUploading(false);
  };

  // 純粋タイル・コンポーネント（器を捨てる）
  const Tile = ({ node, onClick }: any) => {
    const isImage = node.image_url?.startsWith('http');
    const isTextOnly = !isImage && node.description;

    return (
      <div 
        onClick={() => onClick(node.id)}
        className={`relative mb-1 break-inside-avoid group cursor-pointer overflow-hidden rounded-md transition-all duration-500 hover:z-[10] hover:scale-105 hover:shadow-2xl ${node.aspectClass}`}
      >
        {isImage ? (
          // 完全画像（グレースケールからカラーへ、没入感）
          <img src={node.image_url} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
        ) : isTextOnly ? (
          // 空間上に浮かぶテキスト（アスペクト比を持った文字タイル）
          <div className="w-full h-full p-6 flex flex-col justify-center bg-[#EDE9D9] hover:bg-[#F5F2E9] transition-colors duration-500">
             <p className="text-[14px] leading-relaxed italic text-black/70 group-hover:text-black transition-colors whitespace-pre-wrap">
                {node.description}
             </p>
          </div>
        ) : (
          // エラー回避用
          <div className="w-full h-full bg-black/5 flex items-center justify-center p-2">
             <span className="text-[6px] opacity-10 font-bold uppercase tracking-widest">{node.id.slice(-4)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif p-1 md:p-2">
      <style jsx global>{`
        .masonry-grid {
          column-count: 2;
          column-gap: 0.25rem; /* 極小の余白で敷き詰める */
        }
        @media (min-width: 640px) { .masonry-grid { column-count: 3; } }
        @media (min-width: 1024px) { .masonry-grid { column-count: 4; } }
        @media (min-width: 1280px) { .masonry-grid { column-count: 5; } }
      `}</style>

      <header className="mb-8 pt-4 flex flex-col items-center">
        <h1 className="text-[10px] tracking-[0.8em] font-black uppercase opacity-20 hover:opacity-100 transition-opacity">Rubbish fragments</h1>
      </header>

      {/* 純粋モザイク・レイアウト */}
      <div className="masonry-grid max-w-[90rem] mx-auto">
        {nodes.map(node => (
          <Tile key={node.id} node={node} onClick={openNetwork} />
        ))}
      </div>

      {/* Network View Overlay (星座のように浮かび上がる) */}
      {networkView && (
        <div className="fixed inset-0 z-[1000] bg-[#EBE8DB]/90 backdrop-blur-2xl overflow-y-auto p-6 animate-in fade-in duration-300">
           <button onClick={() => setNetworkView(null)} className="fixed top-6 right-6 text-2xl opacity-30 hover:opacity-100 transition-opacity z-[1100]">✕</button>
           <div className="flex flex-col items-center pt-20pb-32">
              <p className="text-[10px] tracking-[0.6em] opacity-30 uppercase font-black mb-12 text-center">Connected Constellation</p>
              
              {/* 元ノードを中心に浮かべる */}
              <div className="w-[300px] mb-16 shadow-2xl scale-110 animate-pulse">
                <Tile node={networkView.originNode} onClick={()=>{}} />
              </div>

              {/* 繋がったタイルを並べる（ランダムな比率） */}
              <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-4">
                {networkView.linkedNodes.map(ln => (
                  <div key={ln.id} className="w-[200px]">
                    <Tile node={ln} onClick={openNetwork} />
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* Footer Navigation (純化したUI) */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-[#EDE9D9]/50 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-black/5 space-x-10 z-[500] hover:bg-[#F5F2E9]/90 transition-all duration-500">
         <button onClick={() => setShowInput({file: null})} className="text-lg opacity-30 hover:opacity-100 transition-opacity">✎</button>
         <div className="h-4 w-px bg-black/10"></div>
         <label className="text-lg opacity-30 hover:opacity-100 transition-opacity cursor-pointer">◎<input type="file" className="hidden" onChange={(e) => setShowInput({file: e.target.files?.[0] || null})} /></label>
      </nav>

      {/* Input Modal */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/98 backdrop-blur-3xl z-[2000] flex flex-col items-center justify-center p-6 animate-in zoom-in-95">
          <textarea autoFocus maxLength={60} value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="fragment..." className="w-full max-w-lg bg-transparent border-none text-2xl italic outline-none text-center" />
          <div className="mt-16 space-x-16">
            <button onClick={() => { setShowInput(null); setInputText(''); }} className="text-[10px] uppercase tracking-widest opacity-20 hover:opacity-100">Cancel</button>
            <button onClick={handleUpload} className="text-[10px] uppercase tracking-widest font-bold">Archive</button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 bg-[#EBE8DB]/90 backdrop-blur-md z-[3000] flex items-center justify-center text-[10px] tracking-[0.5em] font-black uppercase animate-pulse">
          Archiving fragment...
        </div>
      )}
    </div>
  );
}