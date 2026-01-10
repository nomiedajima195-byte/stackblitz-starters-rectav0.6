'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const imageBaseClass = `relative w-full aspect-square overflow-hidden rounded-[4px] bg-[#F8F8F8] shadow-sm transition-all duration-700`;

export default function Page() {
  const [mainline, setMainline] = useState<any[]>([]);
  const [sideCells, setSideCells] = useState<{[key: string]: any[]}>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isMineMode, setIsMineMode] = useState<string | null>(null);
  const [activeSideIndex, setActiveSideIndex] = useState<{[key: string]: number}>({});
  
  // 現像室（ダークルーム）
  const [darkroomImage, setDarkroomImage] = useState<string | null>(null);
  const [darkroomParentId, setDarkroomParentId] = useState<string | null>(null);
  const [settings, setSettings] = useState({ size: 400, br: 1.08, con: 0.85, sat: 0.6, q: 0.4 });
  
  const scrollRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const isDeepInAlley = useMemo(() => Object.values(activeSideIndex).some(idx => idx > 0), [activeSideIndex]);

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

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>, parentId: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDarkroomImage(ev.target?.result as string);
      setDarkroomParentId(parentId);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 現像：Canvasにフィルターを焼き付ける
  const developImage = async () => {
    if (!darkroomImage || isUploading) return;
    setIsUploading(true);
    
    const img = new Image();
    img.src = darkroomImage;
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const s = settings.size;
      let w = img.width, h = img.height;
      if (w > h) { if (w > s) { h *= s / w; w = s; } }
      else { if (h > s) { w *= s / h; h = s; } }
      
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // ここが重要：描画する前にCanvas自体にフィルターを適用する
        ctx.filter = `brightness(${settings.br}) contrast(${settings.con}) saturate(${settings.sat}) sepia(0.15) blur(0.2px)`;
        ctx.drawImage(img, 0, 0, w, h);
      }
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const fileName = `${Date.now()}.jpg`;
          await supabase.storage.from('images').upload(fileName, blob);
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
          if (!darkroomParentId) await supabase.from('mainline').insert([{ id: fileName, image_url: publicUrl }]);
          else await supabase.from('side_cells').insert([{ id: fileName, parent_id: darkroomParentId, image_url: publicUrl }]);
          
          setDarkroomImage(null);
          setIsUploading(false);
          fetchData();
        }
      }, 'image/jpeg', settings.q); // 圧縮率(GRAIN)もここで適用
    };
  };

  const handleDelete = async (id: string, table: 'mainline' | 'side_cells') => {
    await supabase.storage.from('images').remove([id]);
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  return (
    <div className={`min-h-screen bg-white text-black font-sans ${isDeepInAlley || darkroomImage ? 'overflow-hidden' : 'overflow-x-hidden'}`}>
      <style jsx global>{` .scrollbar-hide::-webkit-scrollbar { display: none; } body { overscroll-behavior-y: none; margin: 0; background-color: #fff; } `}</style>
      
      {darkroomImage && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center px-8 space-y-8">
          <div className="w-full max-w-xs aspect-square overflow-hidden rounded-[4px] bg-[#F8F8F8]">
            <img 
              src={darkroomImage} 
              style={{ filter: `brightness(${settings.br}) contrast(${settings.con}) saturate(${settings.sat}) sepia(0.15) blur(0.2px)` }}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="w-full max-w-xs space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] opacity-30"><span>SIZE / {settings.size}px</span></div>
              <input type="range" min="120" max="400" step="10" value={settings.size} onChange={e => setSettings({...settings, size: +e.target.value})} className="w-full accent-black" />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] opacity-30"><span>BRIGHT / {settings.br}</span></div>
              <input type="range" min="0.5" max="2" step="0.05" value={settings.br} onChange={e => setSettings({...settings, br: +e.target.value})} className="w-full accent-black" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] opacity-30"><span>GRAIN (COMPRESS)</span></div>
              <input type="range" min="0.1" max="1" step="0.05" value={settings.q} onChange={e => setSettings({...settings, q: +e.target.value})} className="w-full accent-black" />
            </div>
          </div>
          <div className="flex space-x-12 pt-4">
            <button onClick={() => setDarkroomImage(null)} className="text-[12px] opacity-30">CANCEL</button>
            <button onClick={developImage} className={`text-[12px] ${isUploading ? 'animate-pulse' : ''}`}>DEVELOP ●</button>
          </div>
        </div>
      )}

      {!isMineMode ? (
        <div className="max-w-md mx-auto relative">
          <header className={`fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md z-50 flex justify-center items-end pb-3 ${isDeepInAlley ? 'opacity-0' : 'opacity-100'}`}>
            <div onClick={() => fetchData()} className="w-[12px] h-[24px] bg-black cursor-pointer" />
          </header>

          <div className="pt-20 space-y-12 pb-48">
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
                    <div className="flex-shrink-0 w-screen snap-center px-4 relative flex flex-col items-center">
                      <div className={imageBaseClass}>
                        <img src={main.image_url} className="w-full h-full object-cover" />
                        {hasSide && !isThisRowDeep && <div className="absolute right-1 top-1/2 -translate-y-1/2 w-[1.5px] h-14 bg-black/30 z-20" />}
                      </div>
                      <div className="w-full flex justify-between px-3 pt-2 opacity-10">
                         <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}?mine=${main.id}`).then(() => alert("●"))} className="text-[10px]">●</button>
                         <button onClick={() => handleDelete(main.id, 'mainline')} className="text-[10px]">✖︎</button>
                      </div>
                    </div>
                    {(sideCells[main.id] || []).map((side) => (
                      <div key={side.id} className="flex-shrink-0 w-screen snap-center px-4 relative flex flex-col items-center">
                        <div className={imageBaseClass}><img src={side.image_url} className="w-full h-full object-cover" /></div>
                        <div className="w-full flex justify-between px-3 pt-2 opacity-10">
                           <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}?mine=${side.id}`).then(() => alert("●"))} className="text-[10px]">●</button>
                           <button onClick={() => handleDelete(side.id, 'side_cells')} className="text-[10px]">✖︎</button>
                        </div>
                      </div>
                    ))}
                    <div className="flex-shrink-0 w-screen snap-center flex items-center justify-center">
                       <label className="cursor-pointer opacity-10 p-20 text-[10px]">●<input type="file" className="hidden" accept="image/*" onChange={(e) => onFileSelect(e, main.id)} /></label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <nav className={`fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md z-50 flex justify-center items-start pt-4 ${isDeepInAlley ? 'opacity-0' : 'opacity-100'}`}>
            <label className="w-8 h-8 border-[1px] border-black rounded-full flex items-center justify-center cursor-pointer">
              <div className="w-1.5 h-1.5 bg-black rounded-full" />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => onFileSelect(e)} />
            </label>
          </nav>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-screen px-4 bg-white" onClick={() => setIsMineMode(null)}>
          <div className="w-full max-w-md">
            <div className={imageBaseClass}>
              <img src={mainline.concat(Object.values(sideCells).flat()).find(i=>i.id===isMineMode)?.image_url} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}