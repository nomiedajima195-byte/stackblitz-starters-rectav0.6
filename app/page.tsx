'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 裏面のコンポーネント ---
const CardBack = ({ id, wantedCount, onWant }: { id: string, wantedCount: number, onWant: () => void }) => {
  const serial = id.split('.')[0].slice(-6).replace(/(\d{3})(\d{3})/, '$1-$2');
  return (
    <div className="w-full h-full bg-white flex flex-col items-center justify-between p-8 text-black select-none border border-black/5">
      <div className="w-full flex justify-between items-start">
        <div className="text-[10px] font-mono tracking-tighter opacity-30">LOC: 35.6895N 139.6917E</div>
        <div className="text-[10px] font-mono opacity-30">SN:{serial}</div>
      </div>
      
      <div className="flex flex-col items-center">
        <div className="w-1 h-1 bg-black rounded-full mb-8 opacity-20" />
        <p className="text-[9px] tracking-[0.3em] font-light leading-relaxed opacity-40 text-center uppercase">
          This record will vanish<br/>into the alleyway in 168h.
        </p>
      </div>

      <div className="w-full flex justify-between items-end">
        <div 
          onClick={(e) => { e.stopPropagation(); onWant(); }}
          className="cursor-pointer group flex items-center space-x-2"
        >
          <div className={`w-1.5 h-1.5 rounded-full bg-black transition-opacity ${wantedCount > 0 ? 'opacity-40' : 'opacity-10 group-hover:opacity-30'}`} />
          {wantedCount > 0 && <span className="text-[8px] font-mono opacity-20">{wantedCount}</span>}
        </div>
        <div className="text-[8px] font-mono opacity-10 uppercase italic">Recta Certified</div>
      </div>
    </div>
  );
};

// --- メインコンポーネント ---
export default function Page() {
  const [mainline, setMainline] = useState<any[]>([]);
  const [sideCells, setSideCells] = useState<{[key: string]: any[]}>({});
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [wantedMap, setWantedMap] = useState<{[key: string]: number}>({});
  const [pressingId, setPressingId] = useState<string | null>(null);

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

  const toggleFlip = (id: string) => {
    setFlippedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addWant = (id: string) => {
    setWantedMap(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const Card = ({ item }: { item: any }) => {
    const isFlipped = flippedIds.has(item.id);
    return (
      <div className="flex-shrink-0 w-screen snap-center px-10 relative flex flex-col items-center">
        {/* 3Dカードコンテナ */}
        <div 
          className="relative w-full max-w-[300px] cursor-pointer"
          style={{ perspective: '1200px' }}
          onClick={() => toggleFlip(item.id)}
        >
          <div 
            className={`relative w-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
            style={{ aspectRatio: '1 / 1.618' }}
          >
            {/* 表面 */}
            <div 
              className="absolute inset-0 bg-white p-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] [backface-visibility:hidden] rounded-[12px] overflow-hidden"
              onMouseDown={() => setPressingId(item.id)}
              onMouseUp={() => setPressingId(null)}
              onTouchStart={() => setPressingId(item.id)}
              onTouchEnd={() => setPressingId(null)}
            >
              <div 
                className="w-full h-full rounded-[6px]" 
                style={{ backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
              {/* 長押し鑑定（表面のみ） */}
              <div className={`absolute bottom-2 left-0 right-0 text-center transition-opacity duration-300 ${pressingId === item.id ? 'opacity-20' : 'opacity-0'}`}>
                <span className="text-[7px] font-mono tracking-widest">SN:{item.id.slice(-6)}</span>
              </div>
            </div>

            {/* 裏面 */}
            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] shadow-[0_4px_20px_rgba(0,0,0,0.06)] rounded-[12px] overflow-hidden">
              <CardBack 
                id={item.id} 
                wantedCount={wantedMap[item.id] || 0} 
                onWant={() => addWant(item.id)} 
              />
            </div>
          </div>
        </div>
        
        {/* 下部操作（あえて薄く） */}
        <div className="w-full max-w-[300px] flex justify-between px-2 pt-6 opacity-5">
           <button className="text-[10px]">●</button>
           <button className="text-[10px]">✖︎</button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-black overflow-x-hidden font-sans">
      <style jsx global>{` body { overscroll-behavior: none; } .scrollbar-hide::-webkit-scrollbar { display: none; } `}</style>
      
      <header className="h-20 flex justify-center items-center">
        <div className="w-3 h-5 bg-black" />
      </header>

      <div className="pt-10 space-y-24 pb-48">
        {mainline.map(main => (
          <div key={main.id} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            <Card item={main} />
            {(sideCells[main.id] || []).map(side => <Card key={side.id} item={side} />)}
          </div>
        ))}
      </div>
    </div>
  );
}