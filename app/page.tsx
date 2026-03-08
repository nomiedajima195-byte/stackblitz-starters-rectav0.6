'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  const [showInput, setShowInput] = useState<{file: File | null, parentId?: string} | null>(null);
  const [inputText, setInputText] = useState('');
  
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null); 
  const [existingLinks, setExistingLinks] = useState<string[]>([]); 
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

  useEffect(() => {
    if (linkingFrom) fetchExistingLinks(linkingFrom);
    else setExistingLinks([]);
  }, [linkingFrom]);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (error) return;
    const now = new Date().getTime();
    const active = data.filter(n => (now - new Date(n.created_at).getTime()) < LIFESPAN_MS);
    setNodes(active);
  }, []);

  const fetchExistingLinks = async (nodeId: string) => {
    const { data } = await supabase.from('links').select('*').or(`node_a.eq.${nodeId},node_b.eq.${nodeId}`);
    if (data) setExistingLinks(data.map(l => l.node_a === nodeId ? l.node_b : l.node_a));
  };

  const openNetwork = async (nodeId: string) => {
    const { data: links } = await supabase.from('links').select('*').or(`node_a.eq.${nodeId},node_b.eq.${nodeId}`);
    const linkedIds = links ? links.map(l => l.node_a === nodeId ? l.node_b : l.node_a) : [];
    const linkedNodes = nodes.filter(n => linkedIds.includes(n.id)).sort(() => Math.random() - 0.5);
    setNetworkView({ originId: nodeId, linkedNodes });
  };

  const connectNodes = async (targetId: string, fromId?: string) => {
    const sourceId = fromId || linkingFrom;
    if (!sourceId || sourceId === targetId) return;
    const { error } = await supabase.from('links').insert([{ node_a: sourceId, node_b: targetId }]);
    if (!error && !fromId) setExistingLinks(prev => [...prev, targetId]);
    return !error;
  };

  const handleUpload = async () => {
    if (!showInput) return;
    const { file, parentId } = showInput;
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

      const newNodeId = `${Date.now()}-${getRandomStr(4)}`;
      await supabase.from('mainline').insert([{
        id: newNodeId,
        image_url: publicUrl || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        description: text || null,
        owner_id: pocketId
      }]);

      if (parentId) {
        await connectNodes(newNodeId, parentId);
        await fetchData(); 
        openNetwork(parentId); 
      } else {
        fetchData();
      }
      setInputText('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const NodeCard = ({ node, isLinking, onLink, onView, onSave, extraButtons }: any) => (
    <div className="flex flex-col items-center">
      <div className={`w-[300px] aspect-[1/1.4] bg-[#F5F2E9] rounded-[24px] shadow-2xl border transition-all duration-500 overflow-hidden flex flex-col items-center justify-center p-6 relative ${isLinking ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-black/5'}`}>
        {node.image_url?.startsWith('http') && <img src={node.image_url} className="w-full aspect-square object-cover grayscale-[20%] opacity-90 rounded-sm mb-6 shadow-sm pixelated" />}
        <p className="text-[14px] italic text-center leading-relaxed opacity-80 whitespace-pre-wrap px-2">{node.description || "— silent fragment"}</p>
        <div className="absolute bottom-6 text-[8px] font-bold opacity-10 tracking-[0.4em] uppercase italic">{node.id.split('-')[1] || "NODE"} // RUBBISH</div>
      </div>
      <div className="mt-6 flex items-center space-x-10 text-black/40">
        <button onClick={onLink} className={`flex flex-col items-center space-y-1 transition-all ${isLinking ? 'text-blue-500 scale-110 opacity-100' : 'hover:opacity-100'}`}>
          <span className="text-xl">▲</span><span className="text-[8px] font-black tracking-widest uppercase">Link</span>
        </button>
        <button onClick={onView} className="flex flex-col items-center space-y-1 hover:opacity-100 transition-all">
          <span className="text-xl">■</span><span className="text-[8px] font-black tracking-widest uppercase">View</span>
        </button>
        <button className="flex flex-col items-center space-y-1 opacity-20"><span className="text-xl">♦</span><span className="text-[8px] font-black tracking-widest uppercase">Save</span></button>
      </div>
      {extraButtons}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif select-none overflow-x-hidden">
      <style jsx global>{` .no-scrollbar::-webkit-scrollbar { display: none; } .pixelated { image-rendering: pixelated; } `}</style>
      
      {linkingFrom && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-[10px] py-2 px-4 z-[1000] flex justify-between items-center font-black tracking-widest uppercase animate-in slide-in-from-top">
          <span>Linking Mode</span><button onClick={() => setLinkingFrom(null)} className="bg-white text-blue-600 px-3 py-1 rounded-full text-[8px]">Finish</button>
        </div>
      )}

      <header className="py-12 flex flex-col items-center opacity-40">
        <p className="text-[12px] tracking-[0.6em] font-black uppercase text-black">Rubbish</p>
      </header>

      <main className="flex flex-col items-center space-y-24 pb-64">
        {nodes.map(node => (
          <NodeCard 
            key={node.id} 
            node={node} 
            isLinking={linkingFrom === node.id}
            onLink={() => setLinkingFrom(node.id === linkingFrom ? null : node.id)}
            onView={() => openNetwork(node.id)}
            extraButtons={linkingFrom && linkingFrom !== node.id && (
              <div className="mt-4">
                {existingLinks.includes(node.id) ? (
                  <div className="text-blue-500 text-[10px] font-black tracking-widest uppercase py-2 px-6 border border-blue-200 rounded-full bg-blue-50">✔ Connected</div>
                ) : (
                  <button onClick={() => connectNodes(node.id)} className="bg-red-600 text-white text-[10px] font-black py-2 px-6 rounded-full shadow-lg animate-bounce tracking-widest uppercase">● Connect Here</button>
                )}
              </div>
            )}
          />
        ))}
      </main>

      {/* ネットワークオーバーレイ */}
      {networkView && (
        <div className="fixed inset-0 z-[600] bg-[#EBE8DB]/98 backdrop-blur-2xl overflow-y-auto no-scrollbar pt-24 pb-48 flex flex-col items-center animate-in fade-in duration-500">
          <button onClick={() => setNetworkView(null)} className="fixed top-10 right-10 text-3xl opacity-20 hover:opacity-100 transition-opacity z-[700]">✕</button>
          <p className="text-[10px] tracking-[0.6em] opacity-30 uppercase font-black mb-12">Constellation Network</p>

          <div className="flex flex-col items-center space-y-16">
            {networkView.linkedNodes.map(lnode => (
              <NodeCard 
                key={lnode.id} 
                node={lnode} 
                isLinking={linkingFrom === lnode.id}
                onLink={() => setLinkingFrom(lnode.id === linkingFrom ? null : lnode.id)}
                onView={() => openNetwork(lnode.id)} 
              />
            ))}
            
            {/* View内での新規投稿セクション */}
            <div className="flex flex-col items-center space-y-4 pt-10">
               <p className="text-[10px] tracking-[0.4em] opacity-20 uppercase font-black">Add to this constellation</p>
               <div className="flex space-x-8">
                  {/* テキストのみ */}
                  <button 
                    onClick={() => setShowInput({file: null, parentId: networkView.originId})}
                    className="w-14 h-14 bg-[#F5F2E9] rounded-full shadow-xl flex items-center justify-center border border-black/5 opacity-50 hover:opacity-100 transition-all"
                  >
                    <span className="text-xl">✎</span>
                  </button>
                  {/* 画像＋テキスト */}
                  <label className="w-14 h-14 bg-[#F5F2E9] rounded-full shadow-xl flex items-center justify-center border border-black/5 opacity-50 cursor-pointer hover:opacity-100 transition-all">
                    <span className="text-xl">◎</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => { 
                      const file = e.target.files?.[0]; 
                      if (file) setShowInput({file, parentId: networkView.originId}); 
                    }} />
                  </label>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* メインフッター */}
      <nav className="fixed bottom-12 left-0 right-0 flex justify-center space-x-12 z-[100]">
        <button onClick={() => setShowInput({file: null})} className="w-14 h-14 bg-[#F5F2E9] rounded-full shadow-2xl flex items-center justify-center border border-black/5 opacity-50 hover:opacity-100 transition-all"><span className="text-xl">✎</span></button>
        <label className="w-14 h-14 bg-[#F5F2E9] rounded-full shadow-2xl flex items-center justify-center border border-black/5 opacity-50 cursor-pointer hover:opacity-100 transition-all"><span className="text-xl">◎</span><input type="file" className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) setShowInput({file}); }} /></label>
      </nav>

      {/* 入力モーダル */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/96 backdrop-blur-3xl z-[2000] flex flex-col items-center justify-center p-10 animate-in fade-in zoom-in-95 duration-200">
          {showInput.file && (
            <div className="mb-6 opacity-60">
               <p className="text-[10px] tracking-widest uppercase font-black mb-2 text-center">Image Selected</p>
               <div className="w-20 h-20 bg-black/5 rounded-lg overflow-hidden flex items-center justify-center">
                  <span className="text-xs">📸</span>
               </div>
            </div>
          )}
          <textarea autoFocus maxLength={55} value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={showInput.parentId ? "Relate something..." : "Archive..."} className="w-full max-w-sm bg-transparent border-none text-2xl font-serif italic outline-none h-48 resize-none text-center text-black/80" />
          <div className="flex space-x-16 mt-12">
            <button onClick={() => { setShowInput(null); setInputText(''); }} className="text-[11px] font-black tracking-[0.3em] opacity-20 uppercase">Discard</button>
            <button onClick={handleUpload} className="text-[11px] font-black tracking-[0.3em] uppercase">{showInput.parentId ? "Relate" : "Archive"}</button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 bg-[#EBE8DB]/80 backdrop-blur-md z-[3000] flex items-center justify-center text-[10px] tracking-[0.5em] font-black uppercase italic animate-pulse">Archiving...</div>
      )}
    </div>
  );
}