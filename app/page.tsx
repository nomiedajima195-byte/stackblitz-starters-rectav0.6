'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 裏面のコンポーネント (Rubbish仕様) ---
const CardBack = ({ id, wanted, onWant }: { id: string, wanted: boolean, onWant: () => void }) => {
  const serial = id.split('.')[0].slice(-6).toUpperCase();
  return (
    <div className="w-full h-full bg-white flex flex-col items-center justify-between p-8 text-black select-none">
      <div className="w-full flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-[7px] font-mono tracking-[0.2em] opacity-20 uppercase">Statement</span>
          <span className="text-[10px] font-mono opacity-40">#S-{serial}</span>
        </div>
        <div className="text-[7px] font-mono opacity-10 uppercase border border-black/20 px-1 py-0.5">Original</div>
      </div>
      
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-6 bg-black opacity-10 mb-6" />
        <p className="text-[11px] tracking-[0.4em] font-serif italic opacity-60 text-center uppercase leading-loose">
          Influencer<br/>is<br/>Rubbish
        </p>
        <div className="w-0.5 h-6 bg-black opacity-10 mt-6" />
      </div>

      <div className="w-full flex justify-between items-end">
        <div onClick={(e) => { e.stopPropagation(); onWant(); }} className="cursor-pointer group">
          <span className="text-[6px] font-mono opacity-20 uppercase block mb-1">Interest</span>
          <div className={`w-1.5 h-1.5 rounded-full bg-black transition-all duration-1000 ${wanted ? 'opacity-40 scale-125' : 'opacity-10 group-hover:opacity-30'}`} />
        </div>
        <div className="text-[8px] font-mono opacity-30 italic">Transient Record</div>
      </div>
    </div>
  );
};

// --- メインコンポーネント ---
export default function Page() {
  const [mainline, setMainline] = useState<any[]>([]);
  const [sideCells, setSideCells] = useState<{[key: string]: any[]}>({});
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [wantedIds, setWantedIds] = useState<Set<string>>(new Set()); // 数値ではなく「気配があるか」
  const [pressingId, setPressingId] = useState<string | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

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

  // 長押しの開始
  const startPress = (id: string) => {
    pressTimer.current = setTimeout(() => {
      setPressingId(id);
    }, 300); // 0.3秒以上で鑑定モード
  };

  // 終了（クリック判定もここで行う）
  const endPress = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      // 長押し（鑑定）にならなかった場合はフリップ
      if (!pressingId) {
        setFlippedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }
    }
    setPressingId(null);
  };

  const Card = ({ item }: { item: any }) => {
    const isFlipped = flippedIds.has(item.id);
    const isPressing = pressingId === item.id;
    
    return (
      <div className="flex-shrink-0 w-screen snap-center px-10 relative flex flex-col items-center">
        <div 
          className="relative w-full max-w-[300px] select-none touch-none"
          style={{ perspective: '1200px', aspectRatio: '1 / 1.618' }}
          onMouseDown={() => startPress(item.id)}
          onMouseUp={(e) => endPress(item.id, e)}
          onMouseLeave={() => { if(pressTimer.current) clearTimeout(pressTimer.current); setPressingId(null); }}
          onTouchStart={() => startPress(item.id)}
          onTouchEnd={(e) => endPress(item.id, e)}
        >
          <div 
            className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
          >
            {/* 表面 */}
            <div 
              className="absolute inset-0 bg-white p-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] [backface-visibility:hidden] rounded-[12px] overflow-hidden"
              style={{ WebkitTouchCallout: 'none' }}
            >
              <div 
                className="w-full h-full rounded-[6px] pointer-events-none" 
                style={{ backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
              {/* 鑑定表示 */}
              <div className={`absolute bottom-3 left-0 right-0 text-center transition-opacity duration-300 pointer-events-none ${isPressing ? 'opacity-40' : 'opacity-0'}`}>
                <span className="text-[8px] font-mono tracking-[0.3em] font-bold">CERTIFIED SN:{item.id.slice(-6).toUpperCase()}</span>
              </div>
            </div>

            {/* 裏面 */}
            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] shadow-[0_4px_24px_rgba(0,0,0,0.08)] rounded-[12px] overflow-hidden">
              <CardBack 
                id={item.id} 
                wanted={wantedIds.has(item.id)} 
                onWant={() => setWantedIds(prev => new Set(prev).add(item.id))} 
              />
            </div>
          </div>
        </div>
        
        <div className="w-full max-w-[300px] flex justify-between px-2 pt-6 opacity-5">
           <button className="text-[10px]">●</button>
           <button className="text-[10px]">✖︎</button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-black overflow-x-hidden font-sans">
      <style jsx global>{` 
        body { overscroll-behavior: none; margin: 0; background-color: #F2F2F2; -webkit-tap-highlight-color: transparent; } 
        .scrollbar-hide::-webkit-scrollbar { display: none; } 
      `}</style>
      
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