'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000; 
const CARD_BG = "#F5F2E9";
const MAX_PIXEL = 300; 

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
  
  // リンク機能
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null); 
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
    const active = data.filter(n => (now - new Date(n.current_at || n.created_at).getTime()) < LIFESPAN_MS);
    setNodes(active);
  }, []);

  // ネットワーク（接続先）を展開
  const openNetwork = async (nodeId: string) => {
    const { data: links } = await supabase.from('links')
      .select('*')
      .or(`node_a.eq.${nodeId},node_b.eq.${nodeId}`);
    
    if (!links) {
      setNetworkView({ originId: nodeId, linkedNodes: [] });
      return;
    }

    const linkedIds = links.map(l => l.node_a === nodeId ? l.node_b : l.node_a);
    // 全ノードから該当するIDを抽出
    const linkedNodes = nodes.filter(n => linkedIds.includes(n.id)).sort(() => Math.random() - 0.5);
    
    setNetworkView({ originId: nodeId, linkedNodes });
  };

  // 相互リンクの保存
  const connectNodes = async (targetId: string) => {
    if (!linkingFrom || linkingFrom === targetId) return;
    const { error } = await supabase.from('links').insert([{ node_a: linkingFrom, node_b: targetId }]);
    if (error) {
      console.error(error);
      alert("Link failed.");
    } else {
      setLinkingFrom(null);
      alert("Connected.");
    }
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

      const { error } = await supabase.from('mainline').insert([{
        id: `${Date.now()}-${getRandomStr(4)}`,
        image_url: publicUrl || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        description: text || null,
        owner_id: pocketId
      }]);
      if (error) throw error;
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif select-none overflow-x-hidden">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .pixelated { image-rendering: pixelated; }
      `}</style>
      
      <header className="py-12 flex flex-col items-center opacity-40">
        <p className="text-[12px] tracking-[0.6em] font-black uppercase text-black">Rubbish</p>
      </header>

      <main className="flex flex-col items-center space-y-16 pb-48">
        {nodes.map(node => (
          <div key={node.id} className="relative group flex items-center">
            {/* メインカード */}
            <div 
              onClick={() => openNetwork(node.id)}
              className="w-[300px] aspect-[1/1.4] bg-[#F5F2E9] rounded-[24px] shadow-2xl border border-black/5 overflow-hidden flex flex-col items-center justify-center p-6 cursor-pointer active:scale-[0.97] transition-all"
            >
              {node.image_url?.startsWith('http') ? (
                <img src={node.image_url} className="w-full aspect-square object-cover grayscale-[20%] opacity-90 rounded-sm mb-6 shadow-sm pixelated" />
              ) : null}
              <p className="text-[14px] italic text-center leading-relaxed opacity-80 whitespace-pre-wrap px-2">
                {node.description || "— silent record"}
              </p>
              <div className="absolute bottom-6 text-[8px] font-bold opacity-10 tracking-[0.4em] uppercase italic">
                {node.id.split('-')[1]} // RUBBISH
              </div>
            </div>

            {/* リンク操作系 (サイドに浮かぶ) */}
            <div className="absolute -right-14 flex flex-col space-y-8">
              <button 
                onClick={(e) => { e.stopPropagation(); setLinkingFrom(node.id === linkingFrom ? null : node.id); }} 
                className={`text-xl transition-all ${linkingFrom === node.id ? 'text-blue-500 scale-125 animate-pulse' : 'opacity-10 hover:opacity-100 text-black'}`}
              >
                △
              </button>
              
              {linkingFrom && linkingFrom !== node.id && (
                <button 
                  onClick={(e) => { e.stopPropagation(); connectNodes(node.id); }} 
                  className="text-xl text-red-600 animate-bounce bg-white/50 rounded-full w-8 h-8 flex items-center justify-center shadow-lg border border-red-200"
                >
                  ●
                </button>
              )}
            </div>
          </div>
        ))}
      </main>

      {/* ネットワークオーバーレイ */}
      {networkView && (
        <div className="fixed inset-0 z-[300] bg-[#EBE8DB]/98 backdrop-blur-xl overflow-y-auto no-scrollbar pt-24 pb-48 flex flex-col items-center animate-in fade-in duration-500">
          <button onClick={() => setNetworkView(null)} className="fixed top-10 right-10 text-3xl opacity-20 hover:opacity-100 transition-opacity">✕</button>
          
          <div className="text-center mb-16 px-10">
            <p className="text-[10px] tracking-[0.6em] opacity-30 uppercase font-black mb-2">Constellation</p>
            <div className="w-px h-8 bg-black/10 mx-auto" />
          </div>

          <div className="flex flex-col items-center space-y-12">
            {networkView.linkedNodes.map(lnode => (
              <div key={lnode.id} className="w-[280px] bg-[#F5F2E9] rounded-2xl shadow-xl p-5 flex flex-col items-center border border-black/5 animate-in slide-in-from-bottom-4 duration-700">
                 {lnode.image_url?.startsWith('http') && (
                   <img src={lnode.image_url} className="w-full aspect-square object-cover opacity-80 mb-4 rounded-sm pixelated" />
                 )}
                 <p className="text-[12px] italic opacity-70 text-center leading-relaxed px-2">{lnode.description || "— connection"}</p>
              </div>
            ))}
            {networkView.linkedNodes.length === 0 && (
              <div className="flex flex-col items-center opacity-20 pt-20">
                <p className="text-sm italic">No connections yet.</p>
                <p className="text-[10px] mt-2 tracking-widest uppercase">Start linking from △</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ボトムメニュー */}
      <nav className="fixed bottom-12 left-0 right-0 flex justify-center items-center space-x-10 z-[100]">
        <button onClick={() => { setInputText(''); setShowInput({file: null}); }} className="w-14 h-14 bg-[#F5F2E9] rounded-full shadow-2xl flex items-center justify-center border border-black/5 opacity-50 active:scale-90 transition-all hover:opacity-100">
          <span className="text-xl">✎</span>
        </button>
        <label className="w-14 h-14 bg-[#F5F2E9] rounded-full shadow-2xl flex items-center justify-center border border-black/5 opacity-50 cursor-pointer active:scale-90 transition-all hover:opacity-100">
          <span className="text-xl">◎</span>
          <input type="file" className="hidden" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) { setInputText(''); setShowInput({file}); }
          }} />
        </label>
      </nav>

      {/* 入力モーダル */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/96 backdrop-blur-2xl z-[400] flex flex-col items-center justify-center p-10 animate-in fade-in zoom-in duration-300">
          <textarea 
            autoFocus 
            maxLength={55} 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)} 
            placeholder="..." 
            className="w-full max-w-sm bg-transparent border-none text-2xl font-serif italic outline-none h-48 resize-none text-center text-black/80" 
          />
          <div className="flex space-x-16 mt-12">
            <button onClick={() => setShowInput(null)} className="text-[11px] font-black tracking-[0.3em] opacity-20 uppercase hover:opacity-100 transition-opacity">Discard</button>
            <button onClick={handleUpload} className="text-[11px] font-black tracking-[0.3em] uppercase hover:tracking-[0.5em] transition-all">Archive</button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 bg-[#EBE8DB]/80 backdrop-blur-md z-[500] flex items-center justify-center">
          <p className="text-[10px] tracking-[0.5em] animate-pulse font-black uppercase italic">Processing Fragment...</p>
        </div>
      )}
    </div>
  );
}