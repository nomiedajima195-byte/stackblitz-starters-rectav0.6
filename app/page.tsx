'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- Configuration ---
const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000; 
const CARD_BG = "#F5F2E9";
const MAX_PIXEL = 320; 

const CardBack = () => (
  <div className="w-full h-full bg-[#F5F2E9] flex flex-col items-center justify-center p-10 text-[#2D2D2D] border-[0.5px] border-black/5 shadow-inner overflow-hidden font-serif text-center">
    <div className="absolute top-10 left-10 text-left opacity-60">
      <p className="text-[11px] leading-tight font-serif font-bold">Presslie Action</p>
    </div>
    <p className="text-[34px] leading-[1.1] font-bold tracking-tighter opacity-95">User<br/>is<br/>Rubbish</p>
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
  const lastClickTime = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    let id = localStorage.getItem('recta_pocket_id');
    if (!id) {
      id = `PKT-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
      localStorage.setItem('recta_pocket_id', id);
    }
    setPocketId(id);
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    const now = new Date().getTime();
    const { data: m } = await supabase.from('mainline').select('*');
    const { data: s } = await supabase.from('side_cells').select('*');
    if (!m || !s) return;

    const activeMain = m.filter(card => (now - new Date(card.created_at).getTime()) < LIFESPAN_MS);
    const activeSide = s.filter(card => (now - new Date(card.created_at).getTime()) < LIFESPAN_MS);

    const shuffle = (array: any[]) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const shuffledMain = shuffle(activeMain);
    const groupedSides: {[key: string]: any[]} = {};
    activeSide.forEach(item => {
      if (!groupedSides[item.parent_id]) groupedSides[item.parent_id] = [];
      groupedSides[item.parent_id].push(item);
    });

    setAllCards(shuffledMain);
    setSideCells(groupedSides);
  }, []);

  const uploadFile = async (e: any, parentId: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file || isUploading || !pocketId) return;
    setIsUploading(true);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      let w = img.width;
      let h = img.height;
      if (w > h && w > MAX_PIXEL) { h *= MAX_PIXEL / w; w = MAX_PIXEL; }
      else if (h > MAX_PIXEL) { w *= MAX_PIXEL / h; h = MAX_PIXEL; }

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = CARD_BG;
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
      }

      canvas.toBlob(async (blob) => {
        if (blob) {
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2,7)}.png`;
          await supabase.storage.from('images').upload(fileName, blob, { contentType: 'image/png' });
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
          
          if (!parentId) {
            await supabase.from('mainline').insert([{ id: fileName, image_url: publicUrl, owner_id: pocketId, is_public: true }]);
            await fetchData();
          } else {
            await supabase.from('side_cells').insert([{ id: fileName, image_url: publicUrl, owner_id: pocketId, parent_id: parentId }]);
            await fetchData();
          }
        }
        setIsUploading(false);
      }, 'image/png');
    };
  };

  const Card = ({ item, isMain }: { item: any, isMain: boolean }) => {
    const [isSquare, setIsSquare] = useState(false);
    const isFlipped = flippedIds.has(item.id);
    const serial = item.id.split('-')[0].slice(-6).toUpperCase();

    useEffect(() => {
      const img = new Image();
      img.src = item.image_url;
      img.onload = () => {
        const r = img.width / img.height;
        setIsSquare(r > 0.8 && r < 1.2);
      };
    }, [item.image_url]);

    return (
      <div id={item.id} className="flex-shrink-0 w-screen snap-center relative flex flex-col items-center py-10 font-serif group">
        <div 
          className="relative w-full max-w-[310px] aspect-[1/1.618] select-none z-20 cursor-pointer"
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
            {/* Front */}
            <div className="absolute inset-0 bg-[#F5F2E9] rounded-[28px] border border-black/[0.04] [backface-visibility:hidden] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] flex flex-col items-center overflow-hidden">
              <div className="w-full pt-8 px-8 shrink-0 text-black">
                <p className="tracking-[0.2em] uppercase text-[9px] mb-1 opacity-30 font-bold">Statement</p>
                <p className="italic font-serif text-[13px] opacity-80 leading-tight">No. {serial}</p>
              </div>
              
              {/* Image & Space Adjustment */}
              <div className={`w-full flex flex-col items-center px-6 ${isSquare ? 'pt-4' : 'flex-grow justify-center py-4'}`}>
                {isSquare ? (
                  <>
                    <div className="w-full aspect-square relative overflow-hidden rounded-sm bg-black/5 shadow-inner">
                      <img 
                        src={item.image_url} 
                        className="w-full h-full object-fill opacity-95 image-pixelated" 
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.35)_100%)] mix-blend-multiply" />
                    </div>
                    {/* 意志を持った紙の余白 */}
                    <div className="w-full mt-10 mb-12 opacity-10 text-[7px] tracking-[0.2em] text-center font-bold italic text-black uppercase">
                      Full Frame Artifact
                    </div>
                  </>
                ) : (
                  <div className="w-full aspect-[3/4] relative overflow-hidden rounded-sm bg-black/5 shadow-inner">
                    <img 
                      src={item.image_url} 
                      className="w-full h-full object-cover opacity-95 image-pixelated" 
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.35)_100%)] mix-blend-multiply" />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="w-full pb-10 px-8 flex items-center justify-between text-[9px] font-bold opacity-20 italic shrink-0 text-black">
                <span className="tracking-[0.05em]">No. / Artifact / {serial}</span>
                <span className="tracking-[0.1em]">RUBBISH</span>
              </div>
            </div>
            {/* Back */}
            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] rounded-[28px] border border-black/[0.04] overflow-hidden">
              <CardBack />
            </div>
          </div>
        </div>
        
        {/* Actions Area */}
        <div className="mt-8 flex items-center space-x-6 opacity-0 group-hover:opacity-100 transition-opacity min-h-[40px]">
          <button onClick={() => {
            const baseUrl = window.location.origin + window.location.pathname;
            navigator.clipboard.writeText(`${baseUrl}#${item.id}`);
            alert(`No. ${serial} のリンクをコピーしました`);
          }} className="text-xl opacity-20 hover:opacity-100 p-2 text-black">▲</button>
          {!isMain ? (
            <div className="flex space-x-2 text-[6px] text-black opacity-40 self-center">
              <span>●</span><span>●</span><span>●</span>
            </div>
          ) : ( <div className="w-[42px]" /> )}
          <button onClick={async () => {
            if (window.confirm("Delete?")) {
              await supabase.from(isMain ? 'mainline' : 'side_cells').delete().eq('id', item.id);
              fetchData();
            }
          }} className="text-xl opacity-20 hover:opacity-100 p-2 text-red-900">✕</button>
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
        <p className="text-[10px] tracking-[0.5em] font-bold uppercase mb-2 text-black font-serif">Rubbish</p>
        <div className="w-[1px] h-10 bg-black opacity-20" />
      </header>
      <div className="pb-64 pt-6">
        <div className="flex flex-col space-y-20">
          {allCards.map(main => (
            <div key={main.id} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar items-start">
              <Card item={main} isMain={true} />
              {(sideCells[main.id] || []).map(side => <Card key={side.id} item={side} isMain={false} />)}
              <div className="flex-shrink-0 w-screen snap-center flex items-center justify-center h-full pt-10">
                <label className="w-[310px] h-[502px] flex items-center justify-center cursor-pointer rounded-[28px] border border-black/5 bg-black/[0.01] hover:bg-black/[0.03]">
                  <span className="text-xl opacity-10 font-serif italic text-black">＋</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e, main.id)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
      <nav className="fixed bottom-12 left-0 right-0 flex flex-col items-center z-50">
        <label className="w-14 h-14 flex items-center justify-center cursor-pointer bg-[#F5F2E9] rounded-full shadow-xl border border-black/5">
          <span className="text-xl opacity-40 text-black">◎</span>
          <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e)} />
        </label>
        <p className="mt-4 text-[8px] opacity-20 tracking-[0.5em] font-bold text-black font-serif uppercase">© 1992 Rubbish</p>
      </nav>
      {isUploading && (
        <div className="fixed inset-0 bg-[#EBE8DB]/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center">
          <p className="text-[10px] tracking-[0.3em] opacity-40 italic font-bold animate-pulse text-black font-serif uppercase">Archiving...</p>
        </div>
      )}
    </div>
  );
}