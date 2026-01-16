'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000;

// カード裏面：より黒く、より不気味に
const CardBack = ({ item }: any) => {
  const serial = item.id.split('.')[0].slice(-6).toUpperCase();
  return (
    <div className="w-full h-full bg-[#F7F5ED] flex flex-col items-center justify-between p-10 text-[#121212] border-[0.5px] border-black/10 shadow-inner overflow-hidden font-serif">
      <div className="w-full flex justify-between text-[10px] opacity-80 font-mono tracking-tighter">
        <span>asppetivo : 1120x"</span>
        <span>ragpa 4 / 4 4 6.4"</span>
      </div>
      <div className="flex flex-col items-center text-center space-y-4">
        <p className="text-[32px] leading-tight font-bold tracking-tight">
          User<br/>is<br/>Rubbish
        </p>
        <p className="text-[10px] opacity-60 tracking-[0.4em] uppercase">shox-shadow rataca (03.08)</p>
      </div>
      <div className="w-full text-[9px] opacity-40 font-mono text-center tracking-widest uppercase">
        recta-sys-trace-line-{serial}
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
      const targetW = 600; 
      const targetH = Math.round(600 * 1.618); 
      canvas.width = targetW; canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 余白なし：背景色で塗りつぶしたあと、そのまま描画
        ctx.fillStyle = "#F7F5ED"; ctx.fillRect(0, 0, targetW, targetH);
        const imgRatio = img.width / img.height;
        const drawW = targetW; 
        const drawH = targetW; // 正方形
        const drawY = 130; // 意味不明な文字列のための余白を考慮した配置
        ctx.drawImage(img, 0, drawY, drawW, drawH);
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
    if (now - lastClick < 300) {
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
          className="relative w-full max-w-[280px] select-none z-20 cursor-pointer"
          style={{ perspective: '1200px', aspectRatio: '1 / 1.618' }}
          onClick={() => handleFlipRequest(item.id)}
        >
          <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
            {/* Front: Artifact Style */}
            <div className="absolute inset-0 bg-[#F7F5ED] rounded-[24px] border border-black/[0.05] [backface-visibility:hidden] 
              shadow-[0_25px_60px_rgba(0,0,0,0.18),0_10px_25px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden">
              
              {/* 上部の意味不明な文字列 */}
              <div className="p-5 font-mono text-[11px] leading-none space-y-1 text-black font-bold">
                <p className="tracking-tighter">div clane"" relative w.foll max-w [280xx] z.20</p>
                <p className="opacity-70 text-[10px]">asppetivo : 1120x"</p>
              </div>

              {/* 画像エリア：白い余白なし */}
              <div className="flex-grow w-full bg-[#EAE7D9]" 
                style={{ backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              </div>

              {/* 下部の意味不明な文字列 */}
              <div className="p-5 font-mono text-[11px] leading-tight text-black font-bold">
                <p className="opacity-90">" 0 12up 24px 24px raagadox 00.000.08, ragpa 4 / 4 4 6.4"</p>
                <p className="text-[10px] opacity-40 mt-1 uppercase tracking-[0.2em]">Trace_No.{serial}_09</p>
              </div>
            </div>

            {/* Back: Artifact Style */}
            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] rounded-[24px] border border-black/[0.05] overflow-hidden
              shadow-[0_25px_60px_rgba(0,0,0,0.18),0_10px_25px_rgba(0,0,0,0.1)]">
              <CardBack item={item} />
            </div>
          </div>
        </div>

        <div className="h-16 mt-8 flex items-center justify-center space-x-16 z-10">
          {isFlipped ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); generateLink(item.id); }} className="text-[18px] opacity-40 hover:opacity-100 px-4 active:scale-75 transition-all text-black">▲</button>
              {isOwner && (
                <button onClick={(e) => { e.stopPropagation(); deleteCard(item, isMain); }} className="text-[22px] opacity-20 hover:opacity-100 px-4 active:scale-75 transition-all text-black">×</button>
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
    <div className="min-h-screen bg-[#EAE7D9] text-[#121212] overflow-x-hidden select-none">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <header className="fixed top-0 left-0 right-0 h-24 flex flex-col justify-center items-center z-50 pointer-events-none">
        <div className="w-[1px] h-12 bg-black opacity-10" />
      </header>

      <div className="pt-28 pb-64 min-h-screen">
        <div className="flex flex-col space-y-20">
          {allCards.map(main => (
            <div key={main.id} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar outline-none items-start">
              <Card item={main} isMain={true} />
              {(sideCells[main.id] || []).map(side => <Card key={side.id} item={side} isMain={false} />)}
              <div className="flex-shrink-0 w-screen snap-center flex flex-col items-center py-12 h-full justify-center">
                <label className="w-[280px] h-[453px] flex items-center justify-center cursor-pointer group rounded-[24px] border border-black/[0.03] bg-black/5">
                  <div className="text-[28px] opacity-10 group-hover:opacity-30 transition-opacity font-serif italic">○</div>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e, main.id)} />
                </label>
              </div>
            </div>
          ))}
          {allCards.length === 0 && <div className="h-[60vh] flex items-center justify-center opacity-10 text-[10px] tracking-[0.4em] uppercase font-serif italic">The Street is Quiet</div>}
        </div>
      </div>

      <nav className="fixed bottom-12 left-0 right-0 flex flex-col items-center z-50">
        <label className="w-16 h-16 flex items-center justify-center cursor-pointer transition-all active:scale-75 hover:scale-105 bg-[#F7F5ED] rounded-full shadow-xl border border-black/5">
          <span className="text-[28px] opacity-80 leading-none">◎</span>
          <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e)} />
        </label>
        <div className="mt-4 text-[9px] opacity-20 tracking-[0.5em] font-mono uppercase">sys.recta.artifact</div>
      </nav>

      {isUploading && <div className="fixed inset-0 bg-[#EAE7D9]/60 backdrop-blur-sm z-[60] flex items-center justify-center"><div className="w-6 h-[1px] bg-black opacity-40 animate-pulse" /></div>}
    </div>
  );
}