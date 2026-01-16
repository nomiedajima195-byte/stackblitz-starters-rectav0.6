'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000;
const CARD_BG = "#F5F2E9";

const CardBack = ({ item }: any) => {
  return (
    <div className="w-full h-full bg-[#F5F2E9] flex flex-col items-center justify-center p-10 text-[#121212] border-[0.5px] border-black/5 shadow-inner overflow-hidden font-serif">
      <div className="absolute top-8 left-8 text-left opacity-40">
        <p className="text-[9px] leading-tight font-serif uppercase tracking-tighter">Presslie Action</p>
      </div>
      <div className="flex flex-col items-center text-center">
        <p className="text-[28px] leading-[1.1] font-bold tracking-tighter opacity-90">
          User<br/>is<br/>Rubbish
        </p>
      </div>
      <div className="absolute bottom-8 w-full text-center opacity-10">
        <span className="text-[6px] font-mono tracking-[0.4em] uppercase">RECTA ARTIFACT SYSTEM</span>
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
    const { data: m } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (m) {
      const activeMain = m.filter(card => (now - new Date(card.created_at).getTime()) < LIFESPAN_MS);
      setAllCards(activeMain);
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
      // 画像の元比率を維持するための計算
      const maxDim = 1200;
      const ratio = img.width / img.height;
      if (ratio > 1) { canvas.width = maxDim; canvas.height = maxDim / ratio; }
      else { canvas.height = maxDim; canvas.width = maxDim * ratio; }
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 角丸のクリッピング（12px相当をキャンバスサイズにスケール）
        const radius = (canvas.width / 280) * 12; 
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(canvas.width - radius, 0);
        ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
        ctx.lineTo(canvas.width, canvas.height - radius);
        ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
        ctx.lineTo(radius, canvas.height);
        ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();

        // 画像描画
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // がっちりしたビネット（四隅の影）
        const grad = ctx.createRadialGradient(
          canvas.width/2, canvas.height/2, 0, 
          canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height) * 0.7
        );
        grad.addColorStop(0.3, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.7)'); // 影をがっちり濃く
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const fileName = `${Date.now()}.png`;
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

  const Card = ({ item, isMain }: any) => {
    const isOwner = item.owner_id === pocketId;
    const isFlipped = flippedIds.has(item.id);
    const serial = item.id.split('.')[0].slice(-6).toUpperCase();

    return (
      <div id={item.id} className="flex-shrink-0 w-screen snap-center relative flex flex-col items-center py-12">
        <div 
          className="relative w-full max-w-[280px] select-none z-20 cursor-pointer"
          style={{ perspective: '1200px', aspectRatio: '1 / 1.618' }}
          onClick={() => {
            const now = Date.now();
            if (now - (lastClickTime.current[item.id] || 0) < 300) {
              setFlippedIds(prev => {
                const next = new Set(prev);
                if (next.has(item.id)) next.delete(id); else next.add(item.id);
                return next;
              });
            }
            lastClickTime.current[item.id] = now;
          }}
        >
          <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
            {/* Front */}
            <div className="absolute inset-0 bg-[#F5F2E9] rounded-[24px] border border-black/[0.04] [backface-visibility:hidden] 
              shadow-[0_25px_60px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
              
              <div className="p-6 pb-2 text-[9px] opacity-60 leading-tight font-serif">
                <p>Statement</p>
                <p className="italic font-serif">No. {serial} ... (s8d7)</p>
              </div>

              <div className="flex-grow w-full flex items-center justify-center bg-[#F5F2E9] px-6 py-2">
                <img 
                  src={item.image_url} 
                  alt="" 
                  className="max-w-full max-h-full object-contain mix-blend-multiply rounded-[12px]" 
                />
              </div>

              <div className="p-6 pt-2 text-[8px] opacity-40 font-serif italic text-left tracking-tight">
                <p>No. / Artifact / {serial} / RECTA</p>
              </div>
            </div>
            {/* Back */}
            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] rounded-[24px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.15)]">
              <CardBack item={item} />
            </div>
          </div>
        </div>

        <div className="h-16 mt-8 flex items-center justify-center space-x-16 z-10">
          {isFlipped ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); generateLink(item.id); }} className="text-[16px] opacity-30 hover:opacity-100 px-4 active:scale-75 transition-all text-black font-sans">▲</button>
              {isOwner && (
                <button onClick={(e) => { e.stopPropagation(); deleteCard(item, isMain); }} className="text-[18px] opacity-10 hover:opacity-100 px-4 active:scale-75 transition-all text-black font-sans">×</button>
              )}
            </>
          ) : (
            <div className="w-4 h-4" />
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

      <div className="pt-28 pb-64 min-h-screen flex flex-col space-y-20">
        {allCards.map(main => (
          <div key={main.id} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar outline-none">
            <Card item={main} isMain={true} />
            {(sideCells[main.id] || []).map(side => <Card key={side.id} item={side} isMain={false} />)}
            <div className="flex-shrink-0 w-screen snap-center flex items-center justify-center py-12">
              <label className="w-[280px] h-[453px] flex items-center justify-center cursor-pointer group rounded-[24px] bg-black/[0.015] border border-black/[0.02] transition-all">
                <div className="text-[20px] opacity-5 group-hover:opacity-15 font-serif italic italic font-light">○</div>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e, main.id)} />
              </label>
            </div>
          </div>
        ))}
      </div>

      <nav className="fixed bottom-12 left-0 right-0 flex flex-col items-center z-50">
        <label className="relative w-16 h-16 flex items-center justify-center cursor-pointer transition-all active:scale-90 hover:scale-105">
          <div className="absolute inset-0 bg-[#F5F2E9]/60 backdrop-blur-xl rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-white/40" />
          <span className="relative text-[32px] opacity-70 leading-none mt-[-2px]">◎</span>
          <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e)} />
        </label>
        <div className="mt-5 text-[8px] opacity-20 tracking-[0.4em] font-serif uppercase italic italic">© 2026 RECTA</div>
      </nav>

      {isUploading && (
        <div className="fixed inset-0 bg-[#EBE8DB]/80 backdrop-blur-md z-[60] flex items-center justify-center font-serif text-[10px] tracking-[0.3em] opacity-40 italic italic">
          Capturing Artifact...
        </div>
      )}
    </div>
  );
}