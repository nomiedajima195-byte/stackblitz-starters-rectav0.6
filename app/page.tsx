'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- Configuration ---
const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000; // 168時間
const CARD_BG = "#F5F2E9";

// --- Components ---

const CardBack = () => (
  <div className="w-full h-full bg-[#F5F2E9] flex flex-col items-center justify-center p-10 text-[#2D2D2D] border-[0.5px] border-black/5 shadow-inner overflow-hidden font-serif">
    <div className="absolute top-8 left-8 text-left opacity-60">
      <p className="text-[10px] leading-tight font-serif font-bold">Presslie Action</p>
    </div>
    <div className="flex flex-col items-center text-center">
      <p className="text-[30px] leading-[1.1] font-bold tracking-tighter opacity-95">
        User<br/>is<br/>Rubbish
      </p>
    </div>
    <div className="absolute bottom-8 w-full text-center opacity-20">
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

    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 800);
    }
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

  const deleteCard = async (id: string, isMain: boolean) => {
    if (!window.confirm("このカードを消去しますか？")) return;
    const table = isMain ? 'mainline' : 'side_cells';
    await supabase.from(table).delete().eq('id', id);
    await fetchData();
  };

  const copyCardLink = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
    alert("カードへのリンクをコピーしました");
  };

  const uploadFile = async (e: any, parentId: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file || isUploading || !pocketId) return;
    setIsUploading(true);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000; canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.fillStyle = CARD_BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      }

      canvas.toBlob(async (blob) => {
        if (blob) {
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2,7)}.png`;
          await supabase.storage.from('images').upload(fileName, blob, { contentType: 'image/png' });
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
          
          if (!parentId) {
            await supabase.from('mainline').insert([{ id: fileName, image_url: publicUrl, owner_id: pocketId, is_public: true }]);
          } else {
            await supabase.from('side_cells').insert([{ id: fileName, image_url: publicUrl, owner_id: pocketId, parent_id: parentId }]);
          }
          await fetchData();
        }
        setIsUploading(false);
      }, 'image/png');
    };
  };

  const handleFlipRequest = (id: string) => {
    const now = Date.now();
    const lastClick = lastClickTime.current[id] || 0;
    if (now - lastClick < 300) {
      setFlippedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
      lastClickTime.current[id] = 0;
    } else { lastClickTime.current[id] = now; }
  };

  const Card = ({ item, isMain }: { item: any, isMain: boolean }) => {
    const isFlipped = flippedIds.has(item.id);
    const serial = item.id.split('-')[0].slice(-6).toUpperCase();

    return (
      <div id={item.id} className="flex-shrink-0 w-screen snap-center relative flex flex-col items-center py-10 font-serif group">
        <div 
          className="relative w-full max-w-[310px] select-none z-20 cursor-pointer"
          style={{ perspective: '1500px', aspectRatio: '1 / 1.52' }}
          onClick={() => handleFlipRequest(item.id)}
        >
          <div className={`relative w-full h-full transition-transform duration-[800ms] [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
            
            {/* Front */}
            <div className="absolute inset-0 bg-[#F5F2E9] rounded-[30px] border border-black/[0.03] [backface-visibility:hidden] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)] flex flex-col justify-between overflow-hidden">
              
              {/* Top Section */}
              <div className="pt-9 px-9 text-[11px] font-bold opacity-70 leading-tight shrink-0">
                <p className="tracking-[0.2em] uppercase text-[9px] mb-1 opacity-40">Statement</p>
                <p className="italic font-serif text-[13px]">No. {serial} ... (s8d7)</p>
              </div>

              {/* Image Section: Center focused */}
              <div className="flex-grow flex items-center justify-center px-8">
                <div className="w-full aspect-square relative overflow-hidden rounded-[2px] bg-[#EAE7DC] shadow-[0_2px_15px_rgba(0,0,0,0.03)]">
                  <img 
                    src={item.image_url} 
                    alt="" 
                    className="w-full h-full object-cover mix-blend-multiply opacity-90" 
                  />
                  <div className="absolute inset-0 pointer-events-none" 
                       style={{ background: 'linear-gradient(180deg, transparent 80%, rgba(0,0,0,0.02) 100%)' }} />
                </div>
              </div>

              {/* Bottom Section */}
              <div className="pb-9 px-9 text-[10px] font-bold opacity-25 italic tracking-[0.05em] flex justify-between items-center shrink-0">
                <span>No. / Artifact / {serial}</span>
                <span className="tracking-[0.1em]">RUBBISH</span>
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] rounded-[30px] border border-black/[0.03] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)]">
              <CardBack />
            </div>
          </div>
        </div>

        {/* --- Actions --- */}
        <div className="mt-6 flex items-center space-x-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button 
            onClick={(e) => { e.stopPropagation(); copyCardLink(item.id); }}
            className="text-lg opacity-20 hover:opacity-100 transition-all hover:scale-125 p-2"
          >
            ▲
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); deleteCard(item.id, isMain); }}
            className="text-lg opacity-20 hover:opacity-100 transition-all hover:scale-125 p-2 text-red-900"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] overflow-x-hidden select-none font-serif">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <header className="w-full h-24 flex flex-col items-center justify-end opacity-20">
        <div className="w-[1px] h-10 bg-black opacity-30" />
      </header>

      <div className="pb-64 pt-10">
        <div className="flex flex-col space-y-24">
          {allCards.map(main => (
            <div key={main.id} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar outline-none items-start">
              <Card item={main} isMain={true} />
              {(sideCells[main.id] || []).map(side => <Card key={side.id} item={side} isMain={false} />)}
              
              <div className="flex-shrink-0 w-screen snap-center flex items-center justify-center h-full pt-10">
                <label className="w-[310px] h-[470px] flex items-center justify-center cursor-pointer rounded-[30px] border-2 border-dashed border-black/5 bg-black/[0.01] hover:bg-black/[0.03] active:scale-95 transition-all">
                  <span className="text-2xl opacity-10 font-serif italic">＋</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e, main.id)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <nav className="fixed bottom-12 left-0 right-0 flex flex-col items-center z-50">
        <label className="w-14 h-14 flex items-center justify-center cursor-pointer bg-[#F5F2E9] rounded-full shadow-xl border border-black/5 active:scale-90 transition-transform">
          <span className="text-xl opacity-40">◎</span>
          <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e)} />
        </label>
        <p className="mt-4 text-[8px] opacity-20 tracking-[0.5em] font-bold">© 1992 RUBBISH</p>
      </nav>

      {isUploading && (
        <div className="fixed inset-0 bg-[#EBE8DB]/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-pulse">
          <p className="text-[10px] tracking-[0.3em] opacity-40 italic font-bold">ARCHIVING...</p>
        </div>
      )}
    </div>
  );
}