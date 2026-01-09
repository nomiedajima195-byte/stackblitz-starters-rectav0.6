'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 画像の質感を少し硬めに（コントラスト上げ）
const imageContainerClass = `relative w-full aspect-square overflow-hidden rounded-[8px] bg-[#EEEEEE] contrast-[1.15] brightness-[1.05] shadow-sm`;

export default function Page() {
  const [mainline, setMainline] = useState<any[]>([]);
  const [sideCells, setSideCells] = useState<{[key: string]: any[]}>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isMineMode, setIsMineMode] = useState<string | null>(null);
  const [activeSideIndex, setActiveSideIndex] = useState<{[key: string]: number}>({});
  
  const scrollRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const isDeepInAlley = useMemo(() => Object.values(activeSideIndex).some(idx => idx > 0), [activeSideIndex]);

  // 画像リサイズ＆あえて画質を落とす
  const processImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 640; // 粗さを出すためのサイズダウン
          let w = img.width;
          let h = img.height;
          if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
          else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/jpeg', 0.5); // 画質50%でザラつきを許容
        };
      };
    });
  };

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
    const params = new URLSearchParams(window.location.search);
    if (params.get('mine')) setIsMineMode(params.get('mine'));
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, parentId: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;
    setIsUploading(true);
    try {
      const blob = await processImage(file);
      const fileName = `${Date.now()}.jpg`;
      await supabase.storage.from('images').upload(fileName, blob);
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
      if (!parentId) await supabase.from('mainline').insert([{ id: fileName, image_url: publicUrl }]);
      else await supabase.from('side_cells').insert([{ id: fileName, parent_id: parentId, image_url: publicUrl }]);
      fetchData();
    } catch (err) {} finally { setIsUploading(false); if(e.target) e.target.value = ''; }
  };

  const handleDelete = async (id: string, table: 'mainline' | 'side_cells') => {
    await supabase.storage.from('images').remove([id]);
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  const copyMineUrl = (id: string) => {
    const url = `${window.location.origin}?mine=${id}`;
    navigator.clipboard.writeText(url).then(() => alert("●"));
  };

  const displayImageUrl = useMemo(() => {
    if (!isMineMode) return '';
    const all = [...mainline, ...Object.values(sideCells).flat()];
    return all.find(img => img.id === isMineMode)?.image_url || '';
  }, [isMineMode, mainline, sideCells]);

  return (
    <div className={`min-h-screen bg-white text-black font-sans ${isDeepInAlley ? 'overflow-hidden' : 'overflow-x-hidden'}`}
         style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <style jsx global>{` .scrollbar-hide::-webkit-scrollbar { display: none; } body { overscroll-behavior-y: none; margin: 0; background-color: #fff; } `}</style>
      
      {isMineMode ? (
        <div className="flex items-center justify-center min-h-screen px-4 bg-white" onClick={() => setIsMineMode(null)}>
          <div className="w-full max-w-md"><div className={imageContainerClass}><img src={displayImageUrl} className="w-full h-full object-cover" /></div></div>
        </div>
      ) : (
        <div className="max-w-md mx-auto relative">
          <header className={`fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md z-50 flex justify-center items-end pb-3 transition-opacity duration-500 ${isDeepInAlley ? 'opacity-0' : 'opacity-100'}`}>
            <div onClick={() => fetchData()} className={`w-[12px] h-[24px] bg-black cursor-pointer ${isUploading ? 'animate-pulse' : ''}`} />
          </header>

          <div className="pt-20 space-y-12 pb-48">
            {mainline.map((main) => {
              const isThisRowDeep = (activeSideIndex[main.id] || 0) > 0;
              const anyOtherRowDeep = Object.entries(activeSideIndex).some(([id, idx]) => id !== main.id && idx > 0);
              return (
                <div key={main.id} className={`relative transition-opacity duration-500 ${anyOtherRowDeep ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  {isThisRowDeep && (
                    <button onClick={() => scrollRefs.current[main.id]?.scrollTo({left:0, behavior:'smooth'})} className="absolute -top-6 left-1/2 -translate-x-1/2 z-50 text-[14px] opacity-40 p-2">＜</button>
                  )}
                  <div ref={el => { scrollRefs.current[main.id] = el; }} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]" onScroll={(e) => {
                    const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
                    setActiveSideIndex(prev => prev[main.id] === idx ? prev : { ...prev, [main.id]: idx });
                  }}>
                    <div className="flex-shrink-0 w-screen snap-center px-4 relative flex flex-col items-center">
                      <div className={imageContainerClass}><img src={main.image_url} className="w-full h-full object-cover" loading="eager" decoding="async" /></div>
                      <div className="w-full flex justify-between px-3 pt-2 opacity-30">
                         <button onClick={() => copyMineUrl(main.id)} className="text-[10px]">●</button>
                         <button onClick={() => handleDelete(main.id, 'mainline')} className="text-[10px]">✖︎</button>
                      </div>
                    </div>
                    {(sideCells[main.id] || []).map((side) => (
                      <div key={side.id} className="flex-shrink-0 w-screen snap-center px-4 relative flex flex-col items-center">
                        <div className={imageContainerClass}><img src={side.image_url} className="w-full h-full object-cover" loading="lazy" decoding="async" /></div>
                        <div className="w-full flex justify-between px-3 pt-2 opacity-30">
                           <button onClick={() => copyMineUrl(side.id)} className="text-[10px]">●</button>
                           <button onClick={() => handleDelete(side.id, 'side_cells')} className="text-[10px]">✖︎</button>
                        </div>
                      </div>
                    ))}
                    <div className="flex-shrink-0 w-screen snap-center flex items-center justify-center relative">
                       <label className="cursor-pointer opacity-10 p-20 text-[10px]">●<input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, main.id)} /></label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <nav className={`fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md z-50 flex justify-center items-start pt-4 transition-opacity duration-500 ${isDeepInAlley ? 'opacity-0' : 'opacity-100'}`}>
            <label className={`w-8 h-8 border-[1px] border-black rounded-full flex items-center justify-center cursor-pointer ${isUploading ? 'opacity-20' : ''}`}>
              <div className={`w-1.5 h-1.5 bg-black rounded-full ${isUploading ? 'animate-ping' : ''}`} />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e)} disabled={isUploading} />
            </label>
          </nav>
        </div>
      )}
    </div>
  );
}