'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CARD_BG = "#F5F2E9";
const MAX_PIXEL = 320; 

const getRandomStr = (len: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const CardBack = () => (
  <div className="w-full h-full bg-[#F5F2E9] flex flex-col items-center justify-center p-10 text-[#2D2D2D] border-[0.5px] border-black/5 shadow-inner overflow-hidden font-serif text-center">
    <p className="text-[34px] leading-[1.1] font-bold tracking-tighter opacity-95">AFTER<br/>GLOW</p>
    <div className="absolute bottom-10 w-full text-center opacity-20">
      <span className="text-[8px] font-mono tracking-[0.5em] uppercase font-bold">STIGMERGY SEDIMENT</span>
    </div>
  </div>
);

export default function AfterglowPage() {
  const [allCards, setAllCards] = useState<any[]>([]);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [pairId, setPairId] = useState<string | null>(null);
  const lastClickTime = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    let id = localStorage.getItem('recta_pocket_id');
    if (!id) {
      id = `PKT-${getRandomStr(9)}`;
      localStorage.setItem('recta_pocket_id', id);
    }
    setPocketId(id);

    const params = new URLSearchParams(window.location.search);
    setPairId(params.get('pair') || 'public-afterglow');
  }, []);

  const fetchData = useCallback(async () => {
    if (!pairId) return;

    // 時間制限なしで、このペアのデータをすべて取得
    const { data, error } = await supabase
      .from('afterglow_scraps')
      .select('*')
      .eq('pair_id', pairId)
      .order('created_at', { ascending: false });

    if (error || !data) return;
    setAllCards(data); 
  }, [pairId]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 60000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const uploadFile = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || isUploading || !pocketId || !pairId) return;
    setIsUploading(true);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      let w = img.width; let h = img.height;
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
          const fileName = `afterglow/${Date.now()}.png`;
          await supabase.storage.from('images').upload(fileName, blob);
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
          
          await supabase.from('afterglow_scraps').insert([{
            image_url: publicUrl,
            keyword: note,
            pair_id: pairId,
            owner_id: pocketId
          }]);
          
          setNote('');
          fetchData();
        }
        setIsUploading(false);
      }, 'image/png');
    };
  };

  const Card = ({ item }: { item: any }) => {
    const isFlipped = flippedIds.has(item.id);
    const serial = useRef(getRandomStr(6)).current;

    return (
      <div className="flex-shrink-0 relative flex flex-col items-center py-6 font-serif">
        <div 
          className="relative w-[280px] aspect-[1/1.4] select-none cursor-pointer"
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
            <div className="absolute inset-0 bg-[#F5F2E9] rounded-[20px] border border-black/[0.04] [backface-visibility:hidden] shadow-xl flex flex-col items-center overflow-hidden">
              <div className="w-full pt-6 px-6 shrink-0 opacity-40">
                <p className="text-[8px] uppercase font-bold tracking-widest">{pairId}</p>
              </div>
              <div className="w-full flex-grow flex flex-col items-center px-5 justify-center">
                <div className="w-full aspect-square relative overflow-hidden rounded-sm bg-black/5 shadow-inner">
                  <img src={item.image_url} className="w-full h-full object-cover opacity-90 grayscale-[0.2]" />
                </div>
                <p className="mt-4 text-[13px] italic opacity-70 w-full text-left px-1 leading-tight min-h-[3em]">
                  {item.keyword || "..."}
                </p>
              </div>
              <div className="w-full pb-6 px-6 flex justify-between text-[7px] opacity-20 font-bold uppercase">
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                <span>No. {serial}</span>
              </div>
            </div>
            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] rounded-[20px] overflow-hidden shadow-xl">
              <CardBack />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-x-hidden">
      <header className="fixed top-8 left-0 right-0 flex flex-col items-center z-10 opacity-30">
        <p className="text-[10px] tracking-[1em] font-bold uppercase text-black">Rubbish / Afterglow</p>
      </header>
      <main className="pt-32 pb-64 px-10 flex flex-wrap justify-center gap-10">
        {allCards.length > 0 ? (
          allCards.map(item => <Card key={item.id} item={item} />)
        ) : (
          <div className="mt-40 opacity-10 italic text-sm tracking-widest text-black">Waiting for the sediment...</div>
        )}
      </main>
      <nav className="fixed bottom-10 left-0 right-0 flex flex-col items-center z-50">
        <div className="bg-[#F5F2E9] p-4 rounded-full shadow-2xl border border-black/5 flex items-center space-x-4 px-6">
          <input 
            id="afterglow-note"
            name="afterglow-note"
            type="text" 
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 20))}
            placeholder="Note"
            className="bg-transparent border-b border-black/10 outline-none text-[12px] italic w-32 pb-1 focus:border-black/30 transition-all text-black placeholder:text-black/20"
          />
          <label className="w-10 h-10 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
            <span className="text-xl opacity-40 text-black">◎</span>
            <input type="file" className="hidden" accept="image/*" onChange={uploadFile} />
          </label>
        </div>
        <p className="mt-4 text-[7px] opacity-10 tracking-[0.6em] font-bold uppercase text-black">Archive to Tomorrow</p>
      </nav>
      {isUploading && (
        <div className="fixed inset-0 bg-[#EBE8DB]/90 backdrop-blur-sm z-[100] flex items-center justify-center">
          <p className="text-[10px] tracking-[0.5em] animate-pulse opacity-40 font-bold uppercase text-black">Transmitting...</p>
        </div>
      )}
    </div>
  );
}