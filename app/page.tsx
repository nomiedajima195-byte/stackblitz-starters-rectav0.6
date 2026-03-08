'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000; 
const CARD_BG = "#F5F2E9";
const MAX_PIXEL = 300; // 300pxの制約

const getRandomStr = (len: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export default function Page() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showInput, setShowInput] = useState<{file: File | null} | null>(null);
  const [inputText, setInputText] = useState('');
  
  // リンク機能用
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null); // △ボタンで選択中
  const [networkView, setNetworkView] = useState<{originId: string, linkedNodes: any[]} | null>(null);

  useEffect(() => {
    let id = localStorage.getItem('recta_pocket_id');
    if (!id) {
      id = `PKT-${getRandomStr(9)}`;
      localStorage.setItem('recta_pocket_id', id);
    }
    setPocketId(id);
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (error) return;
    const now = new Date().getTime();
    const active = data.filter(n => (now - new Date(n.created_at).getTime()) < LIFESPAN_MS);
    setNodes(active);
  }, []);

  // リンクを取得して表示する
  const openNetwork = async (nodeId: string) => {
    const { data: links } = await supabase.from('links')
      .select('*')
      .or(`node_a.eq.${nodeId},node_b.eq.${nodeId}`);
    
    if (!links) return;
    const linkedIds = links.map(l => l.node_a === nodeId ? l.node_b : l.node_a);
    const linkedNodes = nodes.filter(n => linkedIds.includes(n.id)).sort(() => Math.random() - 0.5);
    
    setNetworkView({ originId: nodeId, linkedNodes });
  };

  // 二つのノードを繋ぐ
  const connectNodes = async (targetId: string) => {
    if (!linkingFrom || linkingFrom === targetId) return;
    const { error } = await supabase.from('links').insert([{ node_a: linkingFrom, node_b: targetId }]);
    if (error) alert("Link failed.");
    setLinkingFrom(null);
    alert("Linked.");
  };

  const handleUpload = async () => {
    if (!showInput) return;
    const { file } = showInput;
    const text = inputText.trim();
    setShowInput(null);
    setIsUploading(true);
    let publicUrl = null;

    try {
      if (file) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((resolve) => {
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = MAX_PIXEL; canvas.height = MAX_PIXEL;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = CARD_BG; ctx.fillRect(0, 0, MAX_PIXEL, MAX_PIXEL);
              const scale = Math.min(MAX_PIXEL/img.width, MAX_PIXEL/img.height);
              const x = (MAX_PIXEL - img.width * scale) / 2;
              const y = (MAX_PIXEL - img.height * scale) / 2;
              ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            }
            canvas.toBlob(async (blob) => {
              if (blob) {
                const fileName = `${Date.now()}.png`;
                await supabase.storage.from('images').upload(fileName, blob);
                const { data } = supabase.storage.from('images').getPublicUrl(fileName);
                publicUrl = data.publicUrl;
              }
              resolve(null);
            }, 'image/png');
          };
        });
      }

      await supabase.from('mainline').insert([{
        id: `${Date.now()}-${getRandomStr(4)}`,
        image_url: publicUrl || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        description: text || null,
        owner_id: pocketId
      }]);
      fetchData();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif select-none overflow-x-hidden">
      <header className="py-12 flex flex-col items-center opacity-40">
        <p className="text-[12px] tracking-[0.6em] font-black uppercase text-black">Rubbish</p>
      </header>

      {/* メインライン（縦一本） */}
      <main className="flex flex-col items-center space-y-12 pb-40">
        {nodes.map(node => (
          <div key={node.id} className="relative group">
            <div 
              onClick={() => openNetwork(node.id)}
              className="w-[300px] aspect-[1/1.4] bg-[#F5F2E9] rounded-[24px] shadow-xl border border-black/5 overflow-hidden flex flex-col items-center justify-center p-6 cursor-pointer active:scale-[0.98] transition-transform"
            >
              {node.image_url.startsWith('http') ? (
                <img src={node.image_url} className="w-full aspect-square object-cover grayscale-[30%] opacity-90 rounded-sm mb-4" style={{imageRendering: 'pixelated'}} />
              ) : null}
              <p className="text-[13px] italic text-center leading-relaxed opacity-70 whitespace-pre-wrap">
                {node.description || "— silent fragment"}
              </p>
              <div className="absolute bottom-6 text-[8px] font-bold opacity-20 tracking-widest uppercase">
                {node.id.split('-')[1]} / ARCHIVE
              </div>
            </div>

            {/* 操作ボタン */}
            <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col space-y-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setLinkingFrom(node.id)} className={`text-xl ${linkingFrom === node.id ? 'text-blue-500 animate-pulse' : 'opacity-20 hover:opacity-100'}`}>△</button>
              {linkingFrom && linkingFrom !== node.id && (
                <button onClick={() => connectNodes(node.id)} className="text-xl text-red-500 animate-bounce">●</button>
              )}
            </div>
          </div>
        ))}
      </main>

      {/* ネットワーク表示（オーバーレイ） */}
      {networkView && (
        <div className="fixed inset-0 z-[300] bg-[#EBE8DB]/98 backdrop-blur-md overflow-y-auto pt-20 pb-40 flex flex-col items-center">
          <button onClick={() => setNetworkView(null)} className="fixed top-8 right-8 text-2xl opacity-30">✕</button>
          <p className="text-[10px] tracking-[0.5em] opacity-30 mb-12 uppercase font-black">Connected Network</p>
          <div className="flex flex-col space-y-8">
            {networkView.linkedNodes.map(lnode => (
              <div key={lnode.id} className="w-[260px] aspect-square bg-[#F5F2E9] rounded-xl shadow-lg p-4 flex flex-col items-center justify-center border border-black/5">
                 {lnode.image_url.startsWith('http') && <img src={lnode.image_url} className="w-full h-2/3 object-cover opacity-80 mb-2 rounded-sm" />}
                 <p className="text-[10px] italic opacity-60 text-center">{lnode.description}</p>
              </div>
            ))}
            {networkView.linkedNodes.length === 0 && <p className="opacity-20 italic">No connections found.</p>}
          </div>
        </div>
      )}

      {/* フッターメニュー */}
      <nav className="fixed bottom-12 left-0 right-0 flex justify-center items-center space-x-8 z-[100]">
        <button onClick={() => { setInputText(''); setShowInput({file: null}); }} className="w-14 h-14 bg-[#F5F2E9] rounded-full shadow-2xl flex items-center justify-center border border-black/5 opacity-60 active:scale-90 transition-transform">
          <span className="text-xl">✎</span>
        </button>
        <label className="w-14 h-14 bg-[#F5F2E9] rounded-full shadow-2xl flex items-center justify-center border border-black/5 opacity-60 cursor-pointer active:scale-90 transition-transform">
          <span className="text-xl">◎</span>
          <input type="file" className="hidden" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) { setInputText(''); setShowInput({file}); }
          }} />
        </label>
      </nav>

      {/* 入力モーダル */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/95 backdrop-blur-xl z-[400] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <textarea autoFocus maxLength={55} value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="..." className="w-full max-w-xs bg-transparent border-none text-xl font-serif italic outline-none h-40 resize-none text-center" />
          <div className="flex space-x-12 mt-8">
            <button onClick={() => setShowInput(null)} className="text-[10px] font-black tracking-widest opacity-20 uppercase">Cancel</button>
            <button onClick={handleUpload} className="text-[10px] font-black tracking-widest uppercase">Archive</button>
          </div>
        </div>
      )}
    </div>
  );
}