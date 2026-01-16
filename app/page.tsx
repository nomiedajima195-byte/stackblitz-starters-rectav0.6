'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000;
const CARD_BG = "#F5F2E9";

// 配列をシャッフルするユーティリティ
const shuffle = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const CardBack = ({ item }: any) => {
  return (
    <div className="w-full h-full bg-[#F5F2E9] flex flex-col items-center justify-center p-10 text-[#2D2D2D] border-[0.5px] border-black/5 shadow-inner overflow-hidden font-serif">
      <div className="absolute top-10 left-10 text-left opacity-60">
        <p className="text-[11px] leading-tight font-serif font-bold">Presslie Action</p>
      </div>
      <div className="flex flex-col items-center text-center">
        <p className="text-[34px] leading-[1.1] font-bold tracking-tighter opacity-95">
          User<br/>is<br/>Rubbish
        </p>
      </div>
      <div className="absolute bottom-10 w-full text-center opacity-20">
        <span className="text-[8px] font-mono tracking-[0.5em] uppercase font-bold">RECTA ARTIFACT</span>
      </div>
    </div>
  );
};

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
    
    // メインラインの取得とシャッフル
    const { data: m } = await supabase.from('mainline').select('*');
    if (m) {
      const activeMain = m.filter(card => (now - new Date(card.created_at).getTime()) < LIFESPAN_MS);
      // ここでランダムに並び替え
      setAllCards(shuffle(activeMain));
    }

    const { data: s } = await supabase.from('side_cells').select('*').order('created_at', { ascending: true });
    if (s) {
      const g: {[key: string]: any[]} = {};
      s.forEach((item: any) => {
        if ((now - new Date(item.created_at).getTime()) < LIFESPAN_MS) {
          if (!g[item.parent_id]) g[item.parent_id] = [];
          g[item.parent_id].push(item);
        }
      });
      setSideCells(g);
    }
  }, []);

  const uploadFile = async (e: any, parentId: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file || isUploading || !pocketId) return;
    setIsUploading(true);
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const maxSide = 1200;
      let w = img.width;
      let h = img.height;
      if (w > h) { if (w > maxSide) { h *= maxSide / w; w = maxSide; } }
      else { if (h > maxSide) { w *= maxSide / h; h = maxSide; } }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, w, h);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const fileName = `${Date.now()}.jpg`;
          await supabase.storage.from('images').upload(fileName, blob, { contentType: 'image/jpeg' });
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
          if (!parentId) {
            await supabase.from('mainline').insert([{ id: fileName, image_url: publicUrl, owner_id: pocketId, is_public: true }]);
          } else {
            await supabase.from('side_cells').insert([{ id: fileName, image_url: publicUrl, owner_id: pocketId, parent_id: parentId }]);
          }
          await fetchData();
        }
        setIsUploading(false);
      }, 'image/jpeg', 0.9);
    };
  };

  const deleteCard = async (item: any, isMain: boolean) => {
    if (!confirm('Dispose?')) return;
    if (isMain) {
      const sides = sideCells[item.id] || [];
      if (sides.length > 0) {
        const nextMain = sides[0];
        await supabase.from('mainline').insert([{ id: `PROM-${Date.now()}`, image_url: nextMain.image_url, owner_id: nextMain.owner_id, is_public: true }]);
        await supabase.from('side_cells').delete().eq('id', nextMain.id);
      }
      await supabase.from('mainline').delete().eq('id', item.id);
    } else {
      await supabase.from('side_cells').delete().eq('id', item.id);
    }
    fetchData();
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

  const Card = ({ item, isMain }: any) => {
    const isOwner = item.owner_id === pocketId;
    const isFlipped = flippedIds.has(item.id);
    const serial = item.id.split('.')[0].slice(-6).toUpperCase();

    return (
      <div id={item.id} className="flex-shrink-0 w-screen snap-center relative flex flex-col items-center py-12 font-serif">
        <div 
          className="relative w-full max-w-[300px] select-none z-20 cursor-pointer"
          style={{ perspective: '1200px', aspectRatio: '1 / 1.618' }}
          onClick={() => handleFlipRequest(item.id)}
        >
          <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
            {/* Front */}
            <div className="absolute inset-0 bg-[#F5F2E9] rounded-[28px] border border-black/[0.04] [backface-visibility:hidden] 
              shadow-[0_20px_50px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
              
              <div className="p-8 pb-4 text-[12px] font-bold opacity-80 leading-tight shrink-0">
                <p>Statement</p>
                <p className="italic font-bold">No. {serial} ... (v18.2)</p>
              </div>

              <div className="flex-grow w-full relative flex items-center justify-center px-6">
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <img src={item.image_url} alt="" className="max-w-full max-h-full object-contain mix-blend-multiply opacity-95" />
                  <div className="absolute inset-0 pointer-events-none opacity-40" 
                       style={{ background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.5) 100%)' }} />
                </div>
              </div>

              <div className="p-8 pt-4 text-[11px] font-bold opacity-60 italic tracking-tighter shrink-0">
                <p>No. / Artifact / {serial} / RANDOM_ST</p>
              </div>
            </div>

            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] rounded-[28px] border border-black/[0.04] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
              <CardBack item={item} />
            </div>
          </div>
        </div>

        <div className="h-16 mt-8 flex items-center justify-center space-x-16 z-10">
          {isFlipped && (
            <button onClick={(e) => { e.stopPropagation(); deleteCard(item, isMain); }} className="text-[18px] opacity-10 hover:opacity-100 px-4 active:scale-75 transition-all text-black font-sans">×</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] overflow-x-hidden select-none">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="pt-28 pb-64 min-h-screen">
        <div className="flex flex-col space-y-24">
          {allCards.map(main => (
            <div key={main.id} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar outline-none items-start">
              <Card item={main} isMain={true} />
              {(sideCells[main.id] || []).map(side => <Card key={side.id} item={side} isMain={false} />)}
              <div className="flex-shrink-0 w-screen snap-center flex items-center justify-center">
                <label className="w-[300px] h-[485px] flex items-center justify-center cursor-pointer rounded-[28px] border-2 border-dashed border-black/5 hover:bg-black/5 transition-all">
                  <span className="text-2xl opacity-5 font-serif italic">○</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e, main.id)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <nav className="fixed bottom-12 left-0 right-0 flex flex-col items-center z-50">
        <label className="w-16 h-16 flex items-center justify-center cursor-pointer bg-[#F5F2E9] rounded-full shadow-xl border border-black/5 active:scale-90 transition-transform">
          <span className="text-2xl opacity-60 font-serif">◎</span>
          <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e)} />
        </label>
        <p className="mt-4 text-[9px] opacity-20 tracking-[0.4em] font-bold font-serif uppercase">recta . 2026</p>
      </nav>

      {isUploading && <div className="fixed inset-0 bg-[#EBE8DB]/60 backdrop-blur-sm z-[100] flex items-center justify-center"><div className="w-8 h-[1px] bg-black opacity-30 animate-pulse" /></div>}
    </div>
  );
}