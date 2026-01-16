'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000; // 168時間

const CardBack = ({ item }: any) => {
  const serial = item.id.split('.')[0].slice(-6).toUpperCase();
  return (
    <div className="w-full h-full bg-[#FCF9F2] flex flex-col items-center justify-between p-8 text-[#1A1A1A] border-[0.5px] border-black/10 shadow-inner overflow-hidden">
      <div className="w-full flex justify-between items-start font-serif">
        <div className="flex flex-col text-left">
          <span className="text-[6px] tracking-[0.2em] opacity-40 uppercase font-sans font-bold">Statement</span>
          <span className="text-[10px] opacity-60 italic tracking-tighter">No. {serial}</span>
        </div>
      </div>
      <div className="flex flex-col items-center text-center px-2">
        <p className="text-[11px] tracking-[0.4em] font-serif italic opacity-70 uppercase leading-[2.2]">
          Human<br/>is<br/>Rubbish
        </p>
      </div>
      <div className="w-full flex justify-end">
        <span className="text-[5px] font-mono opacity-10 tracking-[0.1em] uppercase">© 2026 RECTA</span>
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

    // ディープリンク対応：URLにハッシュがあればそこへスクロール
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash.replace('#', ''));
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 1000);
    }
  }, []);

  const fetchData = useCallback(async () => {
    const now = new Date().getTime();
    
    // メインロード取得
    const { data: m } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (m) {
      // 寿命(168h)フィルタリング
      const activeMain = m.filter(card => (now - new Date(card.created_at).getTime()) < LIFESPAN_MS);
      setAllCards(activeMain);
    }

    // 横丁取得
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
      const targetW = 600; 
      const targetH = Math.round(600 * 1.618); 
      canvas.width = targetW; canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, targetW, targetH);
        const imgRatio = img.width / img.height;
        if (imgRatio >= 0.8 && imgRatio <= 1.2) {
          ctx.drawImage(img, 20, 20, targetW-40, targetW-40);
        } else {
          const targetRatio = targetW / targetH;
          let dW, dH, dX, dY;
          if (imgRatio > targetRatio) { dH = targetH; dW = targetH * imgRatio; dX = (targetW - dW) / 2; dY = 0; }
          else { dW = targetW; dH = targetW / imgRatio; dX = 0; dY = (targetH - dH) / 2; }
          ctx.drawImage(img, dX, dY, dW, dH);
        }
      }
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
      }, 'image/jpeg', 0.85);
    };
  };

  const generateLink = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
    alert('Link Copied');
  };

  const deleteCard = async (item: any, isMain: boolean) => {
    if (!confirm('Dispose?')) return;
    if (isMain) {
      // メイン削除時、横丁の1枚目を昇格させるロジック（保存情報より）
      const sides = sideCells[item.id] || [];
      if (sides.length > 0) {
        const nextMain = sides[0];
        await supabase.from('mainline').insert([{ 
          id: `PROM-${Date.now()}`, image_url: nextMain.image_url, owner_id: nextMain.owner_id, is_public: true 
        }]);
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
    if (now - lastClick < 300) { // 300ms以内の2タップで裏返し
      setFlippedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
      lastClickTime.current[id] = 0;
    } else {
      lastClickTime.current[id] = now;
    }
  };

  const Card = ({ item, isMain }: any) => {
    const isOwner = item.owner_id === pocketId;
    const isFlipped = flippedIds.has(item.id);
    const serial = item.id.split('.')[0].slice(-6).toUpperCase();

    return (
      <div id={item.id} className="flex-shrink-0 w-screen snap-center relative flex flex-col items-center py-12">
        <div 
          className="relative w-full max-w-[280px] select-none z-20"
          style={{ perspective: '1200px', aspectRatio: '1 / 1.618' }}
          onClick={() => handleFlipRequest(item.id)}
        >
          <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
            <div className="absolute inset-0 bg-white p-[8px] rounded-[18px] border border-black/5 overflow-hidden [backface-visibility:hidden] 
              shadow-[0_20px_50px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.08)]">
              <div className="w-full h-full rounded-[12px] relative overflow-hidden bg-[#F9F9F9]" style={{ backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <span className="absolute bottom-3 left-3 text-[7px] font-mono text-white/50 tracking-[0.2em] pointer-events-none mix-blend-difference uppercase">
                  No.{serial}
                </span>
              </div>
            </div>
            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] rounded-[18px] border border-black/5 overflow-hidden
              shadow-[0_20px_50px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.08)]">
              <CardBack item={item} />
            </div>
          </div>
        </div>

        <div className="h-16 mt-6 flex items-center justify-center space-x-14 z-10">
          {isFlipped ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); generateLink(item.id); }} className="text-[16px] opacity-30 hover:opacity-100 px-4 active:scale-75 transition-all text-black">
                ▲
              </button>
              {isOwner && (
                <button onClick={(e) => { e.stopPropagation(); deleteCard(item, isMain); }} className="text-[18px] opacity-10 hover:opacity-100 px-4 active:scale-75 transition-all text-black">
                  ×
                </button>
              )}
            </>
          ) : (
            <div className="w-4 h-4" /> // 表面はクリーンに
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-black overflow-x-hidden font-sans select-none">
      <header className="fixed top-0 left-0 right-0 h-24 flex flex-col justify-center items-center z-50 pointer-events-none">
        <div className="w-[1px] h-10 bg-black/80" />
      </header>

      <div className="pt-28 pb-64 min-h-screen">
        <div className="flex flex-col space-y-24">
          {allCards.map(main => (
            <div key={main.id} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide outline-none items-start">
              {/* メインカード */}
              <Card item={main} isMain={true} />
              
              {/* 横丁空間 */}
              {(sideCells[main.id] || []).map(side => (
                <Card key={side.id} item={side} isMain={false} />
              ))}
              
              {/* 横丁追加用プレースホルダー */}
              <div className="flex-shrink-0 w-screen snap-center flex flex-col items-center py-12 h-full justify-center">
                <label className="w-[280px] h-[453px] flex items-center justify-center cursor-pointer group">
                  <div className="text-[24px] opacity-5 group-hover:opacity-40 transition-opacity">○</div>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e, main.id)} />
                </label>
              </div>
            </div>
          ))}
          {allCards.length === 0 && <div className="h-[60vh] flex items-center justify-center opacity-5 text-[12px] tracking-[0.5em] uppercase font-mono">The Street is Quiet</div>}
        </div>
      </div>

      <nav className="fixed bottom-12 left-0 right-0 flex justify-center items-center z-50">
        <label className="w-14 h-14 flex items-center justify-center cursor-pointer transition-all active:scale-75 hover:scale-110">
          <span className="text-[28px] opacity-80 leading-none">◎</span>
          <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e)} />
        </label>
      </nav>

      {isUploading && <div className="fixed inset-0 bg-[#F2F2F2]/40 backdrop-blur-sm z-[60] flex items-center justify-center"><div className="w-4 h-[1px] bg-black animate-pulse" /></div>}
    </div>
  );
}