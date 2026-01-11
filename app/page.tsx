'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 1:1.618 黄金比
const cardStyle = {
  aspectRatio: '1 / 1.618',
  borderRadius: '12px',
};

const imageBaseClass = `relative w-full overflow-hidden bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-all duration-700 p-[12px]`;
// ↑ bg-white と p-[12px] で白い枠を表現

export default function Page() {
  const [mainline, setMainline] = useState<any[]>([]);
  const [sideCells, setSideCells] = useState<{[key: string]: any[]}>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isMineMode, setIsMineMode] = useState<string | null>(null);
  const [activeSideIndex, setActiveSideIndex] = useState<{[key: string]: number}>({});
  const [isAtTop, setIsAtTop] = useState(true);
  
  const scrollRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const isDeepInAlley = useMemo(() => Object.values(activeSideIndex).some(idx => idx > 0), [activeSideIndex]);

  useEffect(() => {
    const handleScroll = () => { setIsAtTop(window.scrollY < 10); };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleDelete = async (id: string, table: 'mainline' | 'side_cells') => {
    try {
      await supabase.storage.from('images').remove([id]);
      await supabase.from(table).delete().eq('id', id);
      fetchData();
    } catch (err) {}
  };

  const backToMainline = () => {
    Object.keys(scrollRefs.current).forEach(id => {
      scrollRefs.current[id]?.scrollTo({ left: 0, behavior: 'smooth' });
    });
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>, parentId: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;
    setIsUploading(true);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const targetW = 400;
      const targetH = 400 * 1.618;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, targetW, targetH);
        const imgRatio = img.width / img.height;
        const targetRatio = targetW / targetH;
        let drawW, drawH, drawX, drawY;
        if (imgRatio > targetRatio) { drawH = targetH; drawW = targetH * imgRatio; drawX = (targetW - drawW) / 2; drawY = 0; }
        else { drawW = targetW; drawH = targetW / imgRatio; drawX = 0; drawY = (targetH - drawH) / 2; }
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      }
      canvas.toBlob(async (blob) => {
        if (blob) {
          const fileName = `${Date.now()}.jpg`;
          await supabase.storage.from('images').upload(fileName, blob, { contentType: 'image/jpeg' });
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
          if (!parentId) await supabase.from('mainline').insert([{ id: fileName, image_url: publicUrl }]);
          else await supabase.from('side_cells').insert([{ id: fileName, parent_id: parentId, image_url: publicUrl }]);
          fetchData();
        }
        setIsUploading(false);
      }, 'image/jpeg', 0.6);
    };
    e.target.value = '';
  };

  return (
    <div className={`min-h-screen bg-[#F2F2F2] text-black font-sans ${isDeepInAlley ? 'overflow-hidden' : 'overflow-x-hidden'}`}>
      <style jsx global>{` .scrollbar-hide::-webkit-scrollbar { display: none; } body { overscroll-behavior-y: none; margin: 0; background-color: #F2F2F2; } `}</style>

      {!isMineMode ? (
        <div className="max-w-md mx-auto relative">
          <header className={`fixed top-0 left-0 right-0 h-14 z-50 flex justify-center items-end pb-3 transition-all duration-500 bg-[#F2F2F2]/80 backdrop-blur-md`}>
            <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={`w-[12px] h-[24px] bg-black cursor-pointer transition-opacity duration-500 ${isAtTop && !isDeepInAlley ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
            <div onClick={backToMainline} className={`absolute left-6 bottom-3 text-[20px] font-light cursor-pointer transition-opacity duration-500 ${isDeepInAlley ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>＜</div>
          </header>

          <div className="pt-24 space-y-16 pb-48">
            {mainline.map((main) => {
              const hasSide = sideCells[main.id]?.length > 0;
              const isThisRowDeep = (activeSideIndex[main.id] || 0) > 0;
              const anyOtherRowDeep = Object.entries(activeSideIndex).some(([id, idx]) => id !== main.id && idx > 0);
              return (
                <div key={main.id} className={`relative transition-opacity duration-500 ${anyOtherRowDeep ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  <div ref={el => { scrollRefs.current[main.id] = el; }} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]" onScroll={(e) => {
                    const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
                    setActiveSideIndex(prev => prev[main.id] === idx ? prev : { ...prev, [main.id]: idx });
                  }}>
                    <div className="flex-shrink-0 w-screen snap-center px-8 relative flex flex-col items-center">
                      <div className={imageBaseClass} style={cardStyle}>
                        <div className="w-full h-full overflow-hidden rounded-[8px]">
                           <img src={main.image_url} className="w-full h-full object-cover" />
                        </div>
                        {hasSide && !isThisRowDeep && <div className="absolute right-2 top-1/2 -translate-y-1/2 w-[1.5px] h-20 bg-black/10 z-20" />}
                      </div>
                      <div className="w-full flex justify-between px-3 pt-3 opacity-10">
                         <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}?mine=${main.id}`).then(() => alert("●"))} className="text-[10px]">●</button>
                         <button onClick={() => { if(confirm('消去？')) handleDelete(main.id, 'mainline') }} className="text-[10px]">✖︎</button>
                      </div>
                    </div>
                    {(sideCells[main.id] || []).map((side) => (
                      <div key={side.id} className="flex-shrink-0 w-screen snap-center px-8 relative flex flex-col items-center">
                        <div className={imageBaseClass} style={cardStyle}>
                          <div className="w-full h-full overflow-hidden rounded-[8px]">
                            <img src={side.image_url} className="w-full h-full object-cover" />
                          </div>
                        </div>
                        <div className="w-full flex justify-between px-3 pt-3 opacity-10">
                           <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}?mine=${side.id}`).then(() => alert("●"))} className="text-[10px]">●</button>
                           <button onClick={() => { if(confirm('消去？')) handleDelete(side.id, 'side_cells') }} className="text-[10px]">✖︎</button>
                        </div>
                      </div>
                    ))}
                    <div className="flex-shrink-0 w-screen snap-center flex items-center justify-center">
                       <label className="cursor-pointer opacity-20 p-24 text-[10px]">●<input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e, main.id)} /></label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <nav className={`fixed bottom-0 left-0 right-0 h-16 bg-[#F2F2F2]/80 backdrop-blur-md z-50 flex justify-center items-start pt-4 transition-opacity duration-500 ${isDeepInAlley ? 'opacity-0' : 'opacity-100'}`}>
            <label className={`w-8 h-8 border-[1px] border-black rounded-full flex items-center justify-center cursor-pointer ${isUploading ? 'animate-pulse' : ''}`}>
              <div className="w-1.5 h-1.5 bg-black rounded-full" />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e)} />
            </label>
          </nav>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-screen px-8 bg-[#F2F2F2]" onClick={() => setIsMineMode(null)}>
          <div className="w-full max-w-[300px]"><div className={imageBaseClass} style={cardStyle}><div className="w-full h-full overflow-hidden rounded-[8px]"><img src={mainline.concat(Object.values(sideCells).flat()).find(i=>i.id===isMineMode)?.image_url} className="w-full h-full object-cover" /></div></div></div>
        </div>
      )}
    </div>
  );
}