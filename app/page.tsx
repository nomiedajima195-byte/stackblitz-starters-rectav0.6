'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CardBack = ({ item, isOwner, onAction, onDelete, onTransfer }: any) => {
  const serial = item.id.split('.')[0].slice(-6).toUpperCase();
  return (
    <div className="w-full h-full bg-[#FCF9F2] flex flex-col items-center justify-between p-8 text-[#1A1A1A] border-[0.5px] border-black/10 shadow-inner">
      <div className="w-full flex justify-between items-start font-serif">
        <div className="flex flex-col text-left">
          <span className="text-[6px] tracking-[0.2em] opacity-40 uppercase font-sans">Statement</span>
          <span className="text-[10px] opacity-60 italic tracking-tighter">No. {serial}</span>
        </div>
        <div className="text-[7px] opacity-20 border-[0.5px] border-black/40 px-2 py-0.5 rounded-full uppercase scale-90 font-sans">
          {item.is_public ? 'Public' : 'Vaulted'}
        </div>
      </div>
      <div className="flex flex-col items-center text-center">
        <p className="text-[12px] tracking-[0.4em] font-serif italic opacity-70 uppercase leading-[1.8]">
          Influencer<br/>is<br/>Rubbish
        </p>
      </div>
      <div className="w-full flex justify-between items-end">
        {isOwner && (
          <div className="flex space-x-6 items-center">
            {/* 路上なら「しまう ▲」、ケース内なら「置く ●」 */}
            <button onClick={(e) => { e.stopPropagation(); onAction(); }} className="text-[16px] opacity-40 hover:opacity-100 transition-opacity pb-1">
              {item.is_public ? '▲' : '●'}
            </button>
            {/* ケース内限定：譲渡 ◆ */}
            {!item.is_public && (
              <button onClick={(e) => { e.stopPropagation(); onTransfer(); }} className="text-[14px] opacity-40 hover:opacity-100 transition-opacity pb-0.5">◆</button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[12px] opacity-10 hover:opacity-40 transition-opacity">×</button>
          </div>
        )}
        <span className="text-[6px] font-mono opacity-10 tracking-[0.1em] uppercase">© 2026 RECTA</span>
      </div>
    </div>
  );
};

export default function Page() {
  const [allCards, setAllCards] = useState<any[]>([]);
  const [sideCells, setSideCells] = useState<{[key: string]: any[]}>({});
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [pressingId, setPressingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [isPocketMode, setIsPocketMode] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);
  const isMoving = useRef(false);

  useEffect(() => {
    let id = localStorage.getItem('recta_pocket_id');
    if (!id) {
      id = `PKT-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
      localStorage.setItem('recta_pocket_id', id);
    }
    setPocketId(id);
    
    // URLパラメータのチェック（譲渡受領）
    const params = new URLSearchParams(window.location.search);
    const tId = params.get('t');
    if (tId) handleAccept(tId, id);

    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    const { data: m } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (m) setAllCards(m);
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

  // 譲渡の開始
  const startTransfer = async (item: any) => {
    const tId = Math.random().toString(36).slice(2, 10).toUpperCase();
    const url = `${window.location.origin}${window.location.pathname}?t=${tId}`;
    
    // 所有権を剥奪し、封筒(transfer_id)に入れる
    const { error } = await supabase.from('mainline').update({ 
      owner_id: 'PENDING', 
      transfer_id: tId,
      is_public: false 
    }).eq('id', item.id);

    if (!error) {
      navigator.clipboard.writeText(url);
      alert("Enveloped. URL copied.");
      fetchData();
    }
  };

  // 譲渡の受領
  const handleAccept = async (tId: string, pId: string) => {
    setTransferring(true);
    const { data } = await supabase.from('mainline').select('*').eq('transfer_id', tId).single();
    if (data) {
      await supabase.from('mainline').update({ 
        owner_id: pId, 
        transfer_id: null 
      }).eq('id', data.id);
      window.history.replaceState({}, '', window.location.pathname);
      setIsPocketMode(true);
      fetchData();
    }
    setTransferring(false);
  };

  const uploadFile = async (e: any, parentId: string | null = null) => {
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
          
          if (!parentId) {
            await supabase.from('mainline').insert([{ id: fileName, image_url: publicUrl, owner_id: pocketId, is_public: false }]);
            setIsPocketMode(true);
          } else {
            await supabase.from('side_cells').insert([{ id: fileName, image_url: publicUrl, owner_id: pocketId, parent_id: parentId }]);
          }
          fetchData();
        }
        setIsUploading(false);
      }, 'image/jpeg', 0.6);
    };
  };

  const togglePublic = async (item: any) => {
    const nextStatus = !item.is_public;
    await supabase.from('mainline').update({ is_public: nextStatus }).eq('id', item.id);
    setIsPocketMode(!nextStatus);
    fetchData();
  };

  const deployLatest = async () => {
    const latestVaulted = allCards.find(c => c.owner_id === pocketId && c.is_public === false);
    if (latestVaulted) {
      await supabase.from('mainline').update({ is_public: true }).eq('id', latestVaulted.id);
      setIsPocketMode(false);
      fetchData();
    }
  };

  const deleteCard = async (item: any, isMain: boolean) => {
    if (!confirm('Dispose?')) return;
    if (isMain) {
      const sides = sideCells[item.id] || [];
      if (sides.length > 0) {
        const nextMain = sides[0];
        await supabase.from('mainline').insert([{ ...nextMain, id: `PROM-${nextMain.id}`, is_public: true }]);
        await supabase.from('side_cells').delete().eq('id', nextMain.id);
      }
      await supabase.from('mainline').delete().eq('id', item.id);
    } else {
      await supabase.from('side_cells').delete().eq('id', item.id);
    }
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
    if (Math.abs(pos.clientX - touchStartPos.current.x) > 15) {
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

  const Card = ({ item, isMain }: any) => {
    const isOwner = item.owner_id === pocketId;
    const hasSide = isMain && (sideCells[item.id]?.length > 0);

    return (
      <div className="flex-shrink-0 w-screen snap-center relative flex flex-col items-center py-12">
        {hasSide && !isPocketMode && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-[1px] h-32 bg-black opacity-10 z-0" />
        )}
        <div 
          className="relative w-full max-w-[280px] select-none z-10"
          style={{ perspective: '1200px', aspectRatio: '1 / 1.618' }}
          onMouseDown={(e) => startPress(item.id, e)}
          onMouseMove={handleMove}
          onMouseUp={() => endPress(item.id)}
          onTouchStart={(e) => startPress(item.id, e)}
          onTouchMove={handleMove}
          onTouchEnd={() => endPress(item.id)}
        >
          <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${flippedIds.has(item.id) ? '[transform:rotateY(180deg)]' : ''}`}>
            <div className="absolute inset-0 bg-white p-[10px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] [backface-visibility:hidden] rounded-[14px] overflow-hidden border border-black/5">
              <div className="w-full h-full rounded-[2px]" style={{ backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            </div>
            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] shadow-[0_20px_60px_rgba(0,0,0,0.18)] rounded-[14px] overflow-hidden">
              <CardBack item={item} isOwner={isOwner} onAction={() => togglePublic(item)} onDelete={() => deleteCard(item, isMain)} onTransfer={() => startTransfer(item)} />
            </div>
          </div>
        </div>
        {isMain && isOwner && (
          <label className="mt-8 opacity-10 hover:opacity-40 transition-opacity cursor-pointer p-2">
            <div className="w-1.5 h-1.5 border border-black rounded-full" />
            <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e, item.id)} />
          </label>
        )}
      </div>
    );
  };

  const publicCards = allCards.filter(c => c.is_public !== false);
  const vaultedCards = allCards.filter(c => c.owner_id === pocketId && c.is_public === false);

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-black overflow-x-hidden font-sans select-none">
      <style jsx global>{` body { overscroll-behavior: none; margin: 0; background-color: #F2F2F2; -webkit-tap-highlight-color: transparent; } .scrollbar-hide::-webkit-scrollbar { display: none; } `}</style>
      
      <header className="fixed top-0 left-0 right-0 h-24 flex justify-center items-center z-50 pointer-events-none">
        <div className="w-[1.5px] h-10 bg-black opacity-100" />
      </header>

      <div className="pt-28 pb-64 min-h-screen">
        {isPocketMode ? (
          <div className="flex flex-col">
            {vaultedCards.length > 0 ? vaultedCards.map(c => <Card key={c.id} item={c} isMain={true} />) : (
              <div className="h-[60vh] flex items-center justify-center opacity-5 select-none">●</div>
            )}
          </div>
        ) : (
          <div className="flex flex-col space-y-16">
            {publicCards.map(c => (
              <div key={c.id} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide outline-none">
                <Card item={c} isMain={true} />
                {(sideCells[c.id] || []).map(side => <Card key={side.id} item={side} isMain={false} />)}
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="fixed bottom-12 left-0 right-0 flex justify-center items-center z-50">
        <div className="flex items-center justify-between w-full max-w-[240px] px-4">
          <button onClick={() => setIsPocketMode(true)} className={`w-12 h-12 flex items-center justify-start transition-all active:scale-75 ${isPocketMode ? 'opacity-100' : 'opacity-20'}`}>
            <div className="w-4 h-4 border-[1.5px] border-black bg-black/5" />
          </button>
          {isPocketMode ? (
            <button onClick={deployLatest} className="w-12 h-12 flex items-center justify-center transition-all active:scale-75 opacity-100">
              <div className="w-3.5 h-3.5 bg-black rounded-full shadow-sm" />
            </button>
          ) : (
            <label className="w-12 h-12 flex items-center justify-center cursor-pointer transition-all active:scale-75 opacity-100">
              <div className="relative w-4 h-4 flex items-center justify-center">
                <div className="absolute inset-0 border-[1.5px] border-black rounded-full" />
                <div className="w-1.5 h-1.5 bg-black rounded-full shadow-sm" />
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e)} />
            </label>
          )}
          <button onClick={() => setIsPocketMode(false)} className={`w-12 h-12 flex items-center justify-end transition-all active:scale-75 ${!isPocketMode ? 'opacity-100' : 'opacity-20'}`}>
            <div className="w-3.5 h-3.5 border-[1.5px] border-black rounded-full" />
          </button>
        </div>
      </nav>

      {(isUploading || transferring) && (
        <div className="fixed inset-0 bg-[#F2F2F2]/40 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="w-4 h-[1px] bg-black animate-pulse" />
        </div>
      )}
    </div>
  );
}