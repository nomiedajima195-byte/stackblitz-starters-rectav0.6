'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000; 
const CARD_BG = "#F5F2E9";
const MAX_PIXEL = 320; 

const getRandomStr = (len: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const CardBack = () => (
  <div className="w-full h-full bg-[#F5F2E9] flex flex-col items-center justify-center p-10 text-[#2D2D2D] border-[0.5px] border-black/5 shadow-inner overflow-hidden font-serif text-center">
    <div className="absolute top-10 left-10 text-left opacity-60">
      <p className="text-[11px] leading-tight font-serif font-bold tracking-tighter">{getRandomStr(8)}</p>
    </div>
    <p className="text-[34px] leading-[1.1] font-bold tracking-tighter opacity-95">
      {getRandomStr(4)}<br/>{getRandomStr(2)}<br/>{getRandomStr(7)}
    </p>
    <div className="absolute bottom-10 w-full text-center opacity-20">
      <span className="text-[8px] font-mono tracking-[0.5em] uppercase font-bold">1992 RUBBISH</span>
    </div>
  </div>
);

export default function Page() {
  const [allCards, setAllCards] = useState<any[]>([]);
  const [sideCells, setSideCells] = useState<{[key: string]: any[]}>({});
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [showInput, setShowInput] = useState<{parent: string | null, file: File | null} | null>(null);
  const [inputText, setInputText] = useState('');
  const lastClickTime = useRef<{ [key: string]: number }>({});

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
    const now = new Date().getTime();
    const { data: m } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    const { data: s } = await supabase.from('side_cells').select('*').order('created_at', { ascending: true });
    if (!m || !s) return;
    const activeMain = m.filter(card => (now - new Date(card.created_at).getTime()) < LIFESPAN_MS);
    const activeSide = s.filter(card => (now - new Date(card.created_at).getTime()) < LIFESPAN_MS);
    const groupedSides: {[key: string]: any[]} = {};
    activeSide.forEach(item => {
      if (!groupedSides[item.parent_id]) groupedSides[item.parent_id] = [];
      groupedSides[item.parent_id].push(item);
    });
    setAllCards(activeMain);
    setSideCells(groupedSides);
  }, []);

  const selectFile = (e: any, parentId: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file || isUploading || !pocketId) return;
    setInputText('');
    setShowInput({ parent: parentId, file });
  };

  const openTextInput = (parentId: string | null = null) => {
    if (isUploading || !pocketId) return;
    setInputText('');
    setShowInput({ parent: parentId, file: null });
  };

  const handleUpload = async () => {
    if (!showInput) return;
    const { file, parent: parentId } = showInput;
    setShowInput(null);
    setIsUploading(true);
    let publicUrl = null;

    if (file) {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        img.onload = async () => {
          let w = img.width; let h = img.height;
          if (w > h && w > MAX_PIXEL) { h *= MAX_PIXEL / w; w = MAX_PIXEL; }
          else if (h > MAX_PIXEL) { w *= MAX_PIXEL / h; h = MAX_PIXEL; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) { ctx.fillStyle = CARD_BG; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h); }
          canvas.toBlob(async (blob) => {
            if (blob) {
              const fileName = `${Date.now()}-${getRandomStr(5)}.png`;
              await supabase.storage.from('images').upload(fileName, blob, { contentType: 'image/png' });
              const { data } = supabase.storage.from('images').getPublicUrl(fileName);
              publicUrl = data.publicUrl;
            }
            resolve(null);
          }, 'image/png');
        };
      });
    }

    const payload = { 
      id: `${Date.now()}-${getRandomStr(5)}`, 
      image_url: publicUrl, 
      owner_id: pocketId,
      description: inputText.slice(0, 55)
    };
    if (!parentId) { await supabase.from('mainline').insert([{ ...payload, is_public: true }]); }
    else { await supabase.from('side_cells').insert([{ ...payload, parent_id: parentId }]); }
    await fetchData();
    setIsUploading(false);
  };

  const Card = ({ item, isMain, hasSides }: { item: any, isMain: boolean, hasSides?: boolean }) => {
    const [isSquare, setIsSquare] = useState(false);
    const [showText, setShowText] = useState(false);
    const isFlipped = flippedIds.has(item.id);
    const serial = useRef(getRandomStr(6)).current;
    const hasImage = !!item.image_url;

    useEffect(() => {
      if (!hasImage) return;
      const img = new Image();
      img.src = item.image_url;
      img.onload = () => {
        const r = img.width / img.height;
        setIsSquare(r > 0.85 && r < 1.15);
      };
    }, [item.image_url, hasImage]);

    return (
      <div id={item.id} className="flex-shrink-0 w-screen snap-center relative flex flex-col items-center py-5 font-serif group">
        <div className="relative flex items-center">
          <div 
            className="relative w-[310px] aspect-[1/1.618] select-none z-20 cursor-pointer"
            style={{ perspective: '1500px' }}
            onClick={() => {
              const now = Date.now();
              if (now - (lastClickTime.current[item.id] || 0) < 300) {
                setFlippedIds(prev => {
                  const next = new Set(prev);
                  if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                  return next;
                });
              }
              lastClickTime.current[item.id] = now;
            }}
          >
            <div className={`relative w-full h-full transition-transform duration-[800ms] [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
              <div className="absolute inset-0 bg-[#F5F2E9] rounded-[28px] border border-black/[0.04] [backface-visibility:hidden] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] flex flex-col items-center overflow-hidden">
                <div className="w-full pt-8 px-8 shrink-0 text-black flex justify-between items-start">
                  <div>
                    <p className="tracking-[0.2em] uppercase text-[9px] mb-1 opacity-30 font-bold">{getRandomStr(9)}</p>
                    <p className="italic font-serif text-[13px] opacity-80 leading-tight">No. {serial}</p>
                  </div>
                  <div className="text-[10px] font-black italic tracking-tighter opacity-20 uppercase">recta</div>
                </div>
                
                <div className="w-full flex-grow flex flex-col items-center justify-center px-6 py-2">
                  {hasImage ? (
                    <>
                      <div className={`${isSquare ? 'w-full aspect-square' : 'w-full aspect-[3/4]'} relative overflow-hidden rounded-sm bg-black/5 shadow-inner ring-1 ring-black/5`}>
                        <img src={item.image_url} className="w-full h-full object-cover opacity-95 image-pixelated" style={{ imageRendering: 'pixelated' }} />
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setShowText(!showText); }} className="text-[10px] tracking-[0.5em] opacity-20 hover:opacity-100 transition-opacity font-black py-4">≫≫≫</button>
                      {showText && (
                        <div onClick={(e) => { e.stopPropagation(); setShowText(false); }} className="w-full px-2 animate-in fade-in duration-500">
                          <p className="text-[11px] leading-relaxed text-black/70 italic font-serif text-left tracking-tight">{item.description || "— silent record."}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full py-10 px-4 border-y border-black/[0.03]">
                      <p className="text-[16px] leading-[1.8] text-black/80 italic font-serif tracking-tight text-center">
                        {item.description || "— silent fragment."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="w-full pb-10 px-8 flex items-center justify-between text-[9px] font-bold opacity-20 italic shrink-0 text-black uppercase">
                  <span className="tracking-[0.05em]">{hasImage ? "Visible" : "Textual"} Artifact</span>
                  <span className="tracking-[0.1em]">Rubbish</span>
                </div>
              </div>
              <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] rounded-[28px] border border-black/[0.04] overflow-hidden">
                <CardBack />
              </div>
            </div>
          </div>
          {isMain && hasSides && (
            <div className="absolute -right-8 w-2 h-2 bg-black rounded-full opacity-40 shadow-sm animate-pulse" />
          )}
        </div>
        <div className="mt-4 flex items-center space-x-6 opacity-0 group-hover:opacity-100 transition-opacity min-h-[40px]">
          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${item.id}`); alert(`Copied`); }} className="text-xl opacity-20 hover:opacity-100 p-2 text-black">▲</button>
          {!isMain && <div className="flex space-x-2 text-[6px] text-black opacity-40 self-center"><span>●</span><span>●</span><span>●</span></div>}
          <button onClick={async () => { if (window.confirm("Delete?")) { await supabase.from(isMain ? 'mainline' : 'side_cells').delete().eq('id', item.id); fetchData(); } }} className="text-xl opacity-20 hover:opacity-100 p-2 text-red-900">✕</button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] overflow-x-hidden select-none font-serif">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .image-pixelated { image-rendering: pixelated; }
      `}</style>
      <header className="w-full h-32 flex flex-col items-center justify-center opacity-40">
        <p className="text-[12px] tracking-[0.6em] font-black uppercase mb-2 text-black">Rubbish</p>
        <div className="w-[1px] h-10 bg-black opacity-20" />
      </header>
      <div className="pb-64 pt-6">
        <div className="flex flex-col space-y-10">
          {allCards.map(main => (
            <div key={main.id} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar items-start">
              <Card item={main} isMain={true} hasSides={sideCells[main.id]?.length > 0} />
              {(sideCells[main.id] || []).map(side => <Card key={side.id} item={side} isMain={false} />)}
              <div className="flex-shrink-0 w-screen snap-center flex items-center justify-center h-full pt-5">
                <label className="w-[310px] h-[502px] flex items-center justify-center cursor-pointer rounded-[28px] border border-black/5 bg-black/[0.01] hover:bg-black/[0.03]">
                  <span className="text-xl opacity-10 font-serif italic text-black">＋</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => selectFile(e, main.id)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
      <nav className="fixed bottom-12 left-0 right-0 flex justify-center items-center space-x-8 z-50">
        <button onClick={() => openTextInput()} className="w-12 h-12 flex items-center justify-center bg-[#F5F2E9] rounded-full shadow-lg border border-black/5 opacity-40 active:scale-95 transition-transform">
          <span className="text-lg opacity-60">✎</span>
        </button>
        <label className="w-14 h-14 flex items-center justify-center cursor-pointer bg-[#F5F2E9] rounded-full shadow-xl border border-black/5 active:scale-95 transition-transform">
          <span className="text-xl opacity-40 text-black">◎</span>
          <input type="file" className="hidden" accept="image/*" onChange={(e) => selectFile(e)} />
        </label>
      </nav>
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/95 backdrop-blur-xl z-[200] flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
          <div className="w-full max-w-sm space-y-8">
            <p className="text-[10px] tracking-[0.4em] opacity-40 font-black uppercase italic">recta / memories</p>
            <textarea autoFocus maxLength={55} value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="..." className="w-full bg-transparent border-none text-xl font-serif italic text-black/80 outline-none h-40 resize-none leading-relaxed" />
            <div className="flex justify-between items-center border-t border-black/5 pt-6">
              <span className={`text-[10px] font-mono tracking-widest ${inputText.length >= 55 ? 'text-red-500' : 'opacity-20'}`}>{inputText.length} / 55</span>
              <div className="flex space-x-8">
                <button onClick={() => setShowInput(null)} className="text-[10px] font-black tracking-widest opacity-30 uppercase">Cancel</button>
                <button onClick={handleUpload} className="text-[10px] font-black tracking-widest uppercase">Archive</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isUploading && (
        <div className="fixed inset-0 bg-[#EBE8DB]/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center">
          <p className="text-[10px] tracking-[0.3em] opacity-40 italic font-bold animate-pulse text-black font-serif uppercase">Archiving...</p>
        </div>
      )}
    </div>
  );
}