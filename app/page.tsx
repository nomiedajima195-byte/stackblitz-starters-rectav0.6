'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CardBack = ({ id, wanted, onWant, isOwner, onDelete }: any) => {
  const serial = id.split('.')[0].slice(-6).toUpperCase();
  return (
    <div className="w-full h-full bg-[#FCF9F2] flex flex-col items-center justify-between p-8 text-[#2A2A2A] select-none border-[0.5px] border-black/10">
      <div className="w-full flex justify-between items-start font-serif">
        <div className="flex flex-col">
          <span className="text-[6px] tracking-[0.2em] opacity-40 uppercase font-sans">Registry Statement</span>
          <span className="text-[10px] opacity-60 italic">No. {serial}</span>
        </div>
        <div className="text-[8px] opacity-20 border-[0.5px] border-black/30 px-2 py-0.5 rounded-full uppercase scale-90">
          {isOwner ? 'Your Collection' : 'Public Record'}
        </div>
      </div>
      <div className="flex flex-col items-center py-4 text-center">
        <div className="w-12 h-[0.5px] bg-black opacity-10 mb-6" />
        <p className="text-[12px] tracking-[0.5em] font-serif italic opacity-70 uppercase leading-loose">
          Influencer<br/>is<br/>Rubbish
        </p>
        <div className="w-12 h-[0.5px] bg-black opacity-10 mt-6" />
      </div>
      <div className="w-full flex flex-col space-y-4">
        <div className="flex justify-between items-end w-full">
          <div onClick={(e) => { e.stopPropagation(); onWant(); }} className="cursor-pointer group">
            <span className="text-[6px] opacity-30 uppercase block mb-1 font-sans">Interest</span>
            <div className={`w-1.5 h-1.5 rounded-full bg-black transition-all duration-1000 ${wanted ? 'opacity-40 scale-125' : 'opacity-5 group-hover:opacity-20'}`} />
          </div>
          {isOwner && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[7px] tracking-[0.2em] opacity-30 hover:opacity-60 border-b border-black/20 pb-0.5 uppercase font-serif italic transition-opacity">Dispose</button>
          )}
        </div>
        <div className="w-full border-t-[0.5px] border-black/5 pt-2 flex justify-center">
          <span className="text-[6px] font-mono opacity-10 tracking-[0.1em]">© 2026 RECTA ALLEYWAY RECORD</span>
        </div>
      </div>
    </div>
  );
};

export default function Page() {
  const [mainline, setMainline] = useState<any[]>([]);
  const [sideCells, setSideCells] = useState<{[key: string]: any[]}>({});
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [wantedIds, setWantedIds] = useState<Set<string>>(new Set());
  const [pressingId, setPressingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [isPocketMode, setIsPocketMode] = useState(false); // 自分のカードだけ表示するモード

  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);
  const isMoving = useRef(false);

  // Step 1: PocketIDの生成と維持
  useEffect(() => {
    let id = localStorage.getItem('recta_pocket_id');
    if (!id) {
      id = `PKT-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
      localStorage.setItem('recta_pocket_id', id);
    }
    setPocketId(id);
  }, []);

  const fetchData = useCallback(async () => {
    const { data: m } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (m) setMainline(m);
    const { data: s } = await supabase.from('side_cells').select('*').order('created_at', { ascending: true });
    if (s) {
      const g: {[key: string]: any[]} = {};
      s.forEach((item: any) => {
        if (!g[item.parent_id]) g[item.parent_id] = [];
        g[item.parent_id].push(item);
      });
      setSideCells(g);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>, parentId: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file || isUploading || !pocketId) return;
    setIsUploading(true);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const targetW = 400; const targetH = Math.round(400 * 1.618);
      canvas.width = targetW; canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, targetW, targetH);
        const imgRatio = img.width / img.height;
        const targetRatio = targetW / targetH;
        let dW, dH, dX, dY;
        if (imgRatio > targetRatio) { dH = targetH; dW = targetH * imgRatio; dX = (targetW - dW) / 2; dY = 0; }
        else { dW = targetW; dH = targetW / imgRatio; dX = 0; dY = (targetH - dH) / 2; }
        ctx.drawImage(img, dX, dY, dW, dH);
      }
      canvas.toBlob(async (blob) => {
        if (blob) {
          const fileName = `${Date.now()}.jpg`;
          await supabase.storage.from('images').upload(fileName, blob, { contentType: 'image/jpeg' });
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
          
          // Step 2: アップロード時にPocketIDを刻印 (owner_id列を想定)
          const newCard = { id: fileName, image_url: publicUrl, owner_id: pocketId };
          if (!parentId) await supabase.from('mainline').insert([newCard]);
          else await supabase.from('side_cells').insert([{ ...newCard, parent_id: parentId }]);
          
          fetchData();
        }
        setIsUploading(false);
      }, 'image/jpeg', 0.6);
    };
  };

  const handleDelete = async (id: string, table: any) => {
    if(!confirm('Dispose this record?')) return;
    await supabase.storage.from('images').remove([id]);
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  const startPress = (id: string, e: any) => {
    const pos = e.touches ? e.touches[0] : e;
    touchStartPos.current = { x: pos.clientX, y: pos.clientY };
    isMoving.current = false;
    pressTimer.current = setTimeout(() => { if(!isMoving.current) setPressingId(id); }, 300);
  };

  const handleMove = (e: any) => {
    if (!touchStartPos.current) return;
    const pos = e.touches ? e.touches[0] : e;
    if (Math.abs(pos.clientX - touchStartPos.current.x) > 10) {
      isMoving.current = true;
      if (pressTimer.current) clearTimeout(pressTimer.current);
      setPressingId(null);
    }
  };

  const endPress = (id: string) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (!isMoving.current && !pressingId) {
      setFlippedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }
    setPressingId(null);
    touchStartPos.current = null;
  };

  const Card = ({ item, table, isMain }: any) => {
    const isOwner = item.owner_id === pocketId;
    // ポケットモード時は自分のカード以外非表示（ただし横丁の親が自分なら表示される等、本来はもっと複雑ですがMVPとしてシンプルに）
    if (isPocketMode && !isOwner) return null;

    return (
      <div className="flex-shrink-0 w-screen snap-center px-10 relative flex flex-col items-center">
        <div 
          className="relative w-full max-w-[300px] select-none touch-none"
          style={{ perspective: '1200px', aspectRatio: '1 / 1.618' }}
          onMouseDown={(e) => startPress(item.id, e)}
          onMouseMove={handleMove}
          onMouseUp={() => endPress(item.id)}
          onTouchStart={(e) => startPress(item.id, e)}
          onTouchMove={handleMove}
          onTouchEnd={() => endPress(item.id)}
        >
          <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${flippedIds.has(item.id) ? '[transform:rotateY(180deg)]' : ''}`}>
            <div className="absolute inset-0 bg-white p-[12px] shadow-[0_10px_40px_rgba(0,0,0,0.12)] [backface-visibility:hidden] rounded-[12px] overflow-hidden">
              <div className="w-full h-full rounded-[4px] pointer-events-none" style={{ backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className={`absolute bottom-3 left-0 right-0 text-center transition-opacity duration-300 pointer-events-none ${pressingId === item.id ? 'opacity-40' : 'opacity-0'}`}>
                <span className="text-[7px] font-mono tracking-[0.4em] font-bold italic">AUTHENTICATED {item.id.slice(-6).toUpperCase()}</span>
              </div>
            </div>
            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] shadow-[0_10px_40px_rgba(0,0,0,0.12)] rounded-[12px] overflow-hidden">
              <CardBack id={item.id} wanted={wantedIds.has(item.id)} onWant={() => setWantedIds(prev => new Set(prev).add(item.id))} isOwner={isOwner} onDelete={() => handleDelete(item.id, table)} />
            </div>
          </div>
        </div>
        {isMain && isOwner && (
          <label className="mt-8 opacity-5 hover:opacity-20 transition-opacity cursor-pointer">
            <span className="text-[10px]">●</span>
            <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e, item.id)} />
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-black overflow-x-hidden font-sans">
      <style jsx global>{` body { overscroll-behavior: none; margin: 0; background-color: #F2F2F2; -webkit-tap-highlight-color: transparent; } .scrollbar-hide::-webkit-scrollbar { display: none; } `}</style>
      
      {/* 自分のPocketIDを薄く表示（お行儀の良いデバッグ） */}
      <header className="h-20 flex flex-col justify-center items-center opacity-10">
        <div className="w-[1px] h-6 bg-black mb-2" />
        <span className="text-[6px] font-mono tracking-widest uppercase">{pocketId}</span>
      </header>

      <div className="pt-4 space-y-24 pb-48">
        {mainline.map(main => {
          // メインが自分でなくても、横丁に自分のカードがあれば表示すべきだが、今はシンプルにメイン基準
          const hasVisibleSide = (sideCells[main.id] || []).some(s => !isPocketMode || s.owner_id === pocketId);
          if (isPocketMode && main.owner_id !== pocketId && !hasVisibleSide) return null;
          
          return (
            <div key={main.id} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              <Card item={main} table="mainline" isMain={true} />
              {(sideCells[main.id] || []).map(side => <Card key={side.id} item={side} table="side_cells" isMain={false} />)}
            </div>
          );
        })}
      </div>

      <nav className="fixed bottom-10 left-0 right-0 flex justify-center items-center space-x-12 z-50 px-10">
        {/* ポケットフィルタボタン */}
        <button 
          onClick={() => setIsPocketMode(!isPocketMode)}
          className={`text-[8px] tracking-[0.2em] uppercase transition-all duration-700 font-serif italic ${isPocketMode ? 'opacity-80 scale-110 border-b border-black/40' : 'opacity-10'}`}
        >
          My Pocket
        </button>

        {/* アップロードボタン */}
        <label className={`w-10 h-10 border-[0.5px] border-black/20 rounded-full flex items-center justify-center cursor-pointer bg-white/20 backdrop-blur-sm transition-all ${isUploading ? 'animate-pulse' : 'opacity-20 hover:opacity-50'}`}>
          <div className="w-1.5 h-1.5 bg-black rounded-full" />
          <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e)} />
        </label>
        
        <div className="w-10 h-10" /> {/* バランス用ダミー */}
      </nav>
    </div>
  );
}