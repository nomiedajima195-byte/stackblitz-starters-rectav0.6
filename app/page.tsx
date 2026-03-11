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
  const [networkView, setNetworkView] = useState<{originNode: any, linkedNodes: any[]} | null>(null);

  // 横軸（Shelf）の状態
  const [shelf, setShelf] = useState<any[]>([]);
  const [isShelfOpen, setIsShelfOpen] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem('recta_pocket_id');
    if (!id) {
      id = `PKT-${getRandomStr(9)}`;
      localStorage.setItem('recta_pocket_id', id);
    }
    setPocketId(id);
    
    // Shelfの読み込み
    const savedShelf = localStorage.getItem('recta_shelf_nodes');
    if (savedShelf) setShelf(JSON.parse(savedShelf));

    fetchData();
  }, []);

  // Shelfが更新されたら保存
  useEffect(() => {
    localStorage.setItem('recta_shelf_nodes', JSON.stringify(shelf));
  }, [shelf]);

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
    const origin = nodes.find(n => n.id === nodeId) || shelf.find(n => n.id === nodeId);
    if (!origin) return;
    const { data: links } = await supabase.from('links').select('*').or(`node_a.eq.${nodeId},node_b.eq.${nodeId}`);
    const linkedIds = links ? links.map(l => l.node_a === nodeId ? l.node_b : l.node_a) : [];
    const linkedNodes = nodes.filter(n => linkedIds.includes(n.id)).sort(() => Math.random() - 0.5);
    setNetworkView({ originNode: origin, linkedNodes });
  };

  const connectNodes = async (targetId: string, fromId?: string) => {
    const sourceId = fromId || linkingFrom;
    if (!sourceId || sourceId === targetId) return;
    const { error } = await supabase.from('links').insert([{ node_a: sourceId, node_b: targetId }]);
    if (!error) {
      if (!fromId) setExistingLinks(prev => [...prev, targetId]);
      if (networkView) openNetwork(networkView.originNode.id);
    }
    return !error;
  };

  const toggleShelfNode = (node: any) => {
    setShelf(prev => {
      const exists = prev.find(n => n.id === node.id);
      if (exists) return prev.filter(n => n.id !== node.id);
      return [...prev, node];
    });
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
      const newNode = {
        id: newNodeId,
        image_url: publicUrl || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        description: text || null,
        owner_id: pocketId,
        created_at: new Date().toISOString()
      };
      await supabase.from('mainline').insert([newNode]);

      if (parentId) {
        await connectNodes(newNodeId, parentId);
        await fetchData(); 
        openNetwork(parentId); 
      } else {
        fetchData();
      }
      setInputText('');
    } catch (e) { console.error(e); } finally { setIsUploading(false); }
  };

  const NodeCard = ({ node, isLinking, onLink, onView, isOrigin, extraButtons, isOnShelf }: any) => (
    <div className="flex flex-col items-center shrink-0">
      <div className={`w-[260px] aspect-[1/1.4] bg-[#F5F2E9] rounded-[24px] shadow-2xl border transition-all duration-500 overflow-hidden flex flex-col items-center justify-center p-6 relative ${isLinking ? 'border-blue-500 ring-4 ring-blue-500/20' : isOrigin ? 'border-amber-500 ring-4 ring-amber-500/10' : 'border-black/5'}`}>
        {node.image_url?.startsWith('http') && <img src={node.image_url} className="w-full aspect-square object-cover grayscale-[20%] opacity-90 rounded-sm mb-6 shadow-sm pixelated" />}
        <p className="text-[12px] italic text-center leading-relaxed opacity-80 whitespace-pre-wrap px-2">{node.description || "— silent fragment"}</p>
        <div className="absolute bottom-6 text-[8px] font-bold opacity-10 tracking-[0.4em] uppercase italic">{node.id.split('-')[1] || "NODE"}</div>
      </div>
      <div className="mt-6 flex items-center space-x-8 text-black/40">
        <button onClick={onLink} className={`flex flex-col items-center space-y-1 transition-all ${isLinking ? 'text-blue-500 scale-110 opacity-100' : 'hover:opacity-100'}`}>
          <span className="text-lg">▲</span><span className="text-[7px] font-black tracking-widest uppercase">Link</span>
        </button>
        <button onClick={onView} className="flex flex-col items-center space-y-1 hover:opacity-100 transition-all">
          <span className="text-lg">■</span><span className="text-[7px] font-black tracking-widest uppercase">View</span>
        </button>
        <button onClick={() => toggleShelfNode(node)} className={`flex flex-col items-center space-y-1 transition-all ${isOnShelf ? 'text-amber-600 opacity-100' : 'hover:opacity-100'}`}>
          <span className="text-lg">{isOnShelf ? '★' : '♦'}</span>
          <span className="text-[7px] font-black tracking-widest uppercase">{isOnShelf ? 'Saved' : 'Save'}</span>
        </button>
      </div>
      {extraButtons}
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif select-none transition-transform duration-500 ${isShelfOpen ? '-translate-x-64' : 'translate-x-0'}`}>
      <style jsx global>{` .no-scrollbar::-webkit-scrollbar { display: none; } .pixelated { image-rendering: pixelated; } `}</style>

      {/* 横軸：Shelf (右側からスライドイン) */}
      <aside className={`fixed top-0 right-0 w-80 h-full bg-[#DEDBCF] border-l border-black/5 z-[800] transition-transform duration-500 flex flex-col p-6 ${isShelfOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <p className="text-[10px] tracking-[0.6em] font-black uppercase opacity-30 mb-8 mt-12">Collection Shelf</p>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-12 pb-32">
          {shelf.map(sn => (
            <NodeCard 
              key={sn.id} 
              node={sn} 
              isOnShelf={true}
              onView={() => openNetwork(sn.id)}
              onLink={() => setLinkingFrom(sn.id)}
            />
          ))}
          {shelf.length === 0 && <p className="text-center text-[10px] italic opacity-20 mt-20">Shelf is empty.</p>}
        </div>
      </aside>

      {/* メインコンテンツ */}
      <div className="max-w-screen-xl mx-auto overflow-x-hidden">
        {linkingFrom && (
          <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-[10px] py-2 px-4 z-[1000] flex justify-between items-center font-black tracking-widest uppercase">
            <span>Linking Mode</span><button onClick={() => setLinkingFrom(null)} className="bg-white text-blue-600 px-3 py-1 rounded-full text-[8px]">Finish</button>
          </div>
        )}

        <header className="py-12 flex flex-col items-center opacity-40">
          <p className="text-[12px] tracking-[0.6em] font-black uppercase text-black">Rubbish</p>
        </header>

        <main className="flex flex-col items-center space-y-32 pb-64">
          {nodes.map(node => (
            <NodeCard 
              key={node.id} 
              node={node} 
              isOnShelf={shelf.some(sn => sn.id === node.id)}
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
      </div>

      {/* ネットワークオーバーレイ */}
      {networkView && (
        <div className="fixed inset-0 z-[900] bg-[#EBE8DB]/98 backdrop-blur-2xl overflow-y-auto no-scrollbar pt-24 pb-48 flex flex-col items-center animate-in fade-in">
          <button onClick={() => setNetworkView(null)} className="fixed top-10 right-10 text-3xl opacity-20 hover:opacity-100 transition-opacity">✕</button>
          <div className="flex flex-col items-center w-full max-w-lg px-6">
            <NodeCard node={networkView.originNode} isOrigin={true} isOnShelf={shelf.some(sn => sn.id === networkView.originNode.id)} onLink={() => setLinkingFrom(networkView.originNode.id)} onView={()=>{}} />
            <div className="w-px h-16 bg-gradient-to-b from-amber-500/30 to-transparent my-8"></div>
            {networkView.linkedNodes.map(lnode => (
              <NodeCard key={lnode.id} node={lnode} isOnShelf={shelf.some(sn => sn.id === lnode.id)} isLinking={linkingFrom === lnode.id} onLink={() => setLinkingFrom(lnode.id)} onView={() => openNetwork(lnode.id)} />
            ))}
            <div className="mt-12">
               <button onClick={() => setShowInput({file: null, parentId: networkView.originNode.id})} className="text-[10px] font-black tracking-widest opacity-30 hover:opacity-100 transition-opacity">＋ Add Node to this Constellation</button>
            </div>
          </div>
        </div>
      )}

      {/* フッターUI */}
      <nav className="fixed bottom-12 left-0 right-0 flex justify-center space-x-8 z-[100]">
        <button onClick={() => setShowInput({file: null})} className="w-14 h-14 bg-[#F5F2E9] rounded-full shadow-2xl flex items-center justify-center border border-black/5 opacity-50 hover:opacity-100 transition-all text-xl">✎</button>
        <label className="w-14 h-14 bg-[#F5F2E9] rounded-full shadow-2xl flex items-center justify-center border border-black/5 opacity-50 cursor-pointer hover:opacity-100 transition-all text-xl">◎<input type="file" className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) setShowInput({file}); }} /></label>
        <button onClick={() => setIsShelfOpen(!isShelfOpen)} className={`w-14 h-14 bg-[#F5F2E9] rounded-full shadow-2xl flex items-center justify-center border border-black/5 transition-all text-xl ${isShelfOpen ? 'text-amber-600 opacity-100 ring-2 ring-amber-500/20' : 'opacity-50 hover:opacity-100'}`}>★</button>
      </nav>

      {/* 入力モーダル */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/96 backdrop-blur-3xl z-[2000] flex flex-col items-center justify-center p-10 animate-in fade-in duration-200">
          <textarea autoFocus maxLength={55} value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={showInput.parentId ? "Relate..." : "Archive..."} className="w-full max-w-sm bg-transparent border-none text-2xl font-serif italic outline-none h-48 resize-none text-center text-black/80" />
          <div className="flex space-x-16 mt-12">
            <button onClick={() => { setShowInput(null); setInputText(''); }} className="text-[11px] font-black tracking-[0.3em] opacity-20 uppercase">Discard</button>
            <button onClick={handleUpload} className="text-[11px] font-black tracking-[0.3em] uppercase">{showInput.parentId ? "Relate" : "Archive"}</button>
          </div>
        </div>
      )}

      {isUploading && <div className="fixed inset-0 bg-[#EBE8DB]/80 backdrop-blur-md z-[3000] flex items-center justify-center text-[10px] tracking-[0.5em] font-black uppercase italic animate-pulse">Archiving...</div>}
    </div>
  );
}