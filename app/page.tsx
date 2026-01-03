'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const filmEffectClass = `
  relative w-full aspect-square overflow-hidden rounded-[12px] 
  brightness-[1.15] contrast-[1.4] saturate-[0.7] sepia-[0.2] 
  hue-rotate-[-15deg] blur-[0.8px] bg-[#1A1A1A]
`;

export default function Page() {
  const [mainline, setMainline] = useState<any[]>([]);
  const [sideCells, setSideCells] = useState<any>({});
  const [viewingSideParentId, setViewingSideParentId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data: mainData } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
      const { data: sideData } = await supabase.from('side_cells').select('*').order('created_at', { ascending: true });
      if (mainData) setMainline(mainData.map(d => ({ cell: { id: d.id, imageUrl: d.image_url } })));
      if (sideData) {
        const grouped: any = {};
        sideData.forEach(s => {
          if (!grouped[s.parent_id]) grouped[s.parent_id] = [];
          grouped[s.parent_id].push({ id: s.id, imageUrl: s.image_url });
        });
        setSideCells(grouped);
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const SIZE = 512;
          canvas.width = SIZE; canvas.height = SIZE;
          const ctx = canvas.getContext('2d');
          const scale = Math.max(SIZE / img.width, SIZE / img.height);
          const x = (SIZE / 2) - (img.width / 2) * scale;
          const y = (SIZE / 2) - (img.height / 2) * scale;
          ctx?.drawImage(img, x, y, img.width * scale, img.height * scale);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, parentId: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;
    setIsUploading(true);
    try {
      const resizedDataUrl = await resizeImage(file);
      const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      if (!parentId) { await supabase.from('mainline').insert([{ id: uniqueId, image_url: resizedDataUrl }]); }
      else { await supabase.from('side_cells').insert([{ id: uniqueId, parent_id: parentId, image_url: resizedDataUrl }]); }
      setTimeout(() => fetchData(), 500);
    } catch (err) { console.error(err); } finally { setIsUploading(false); if(e.target) e.target.value = ''; }
  };

  const handleDelete = async (id: string, isSide: boolean) => {
    const table = isSide ? 'side_cells' : 'mainline';
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans overflow-x-hidden selection:bg-none">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.08] mix-blend-screen bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

      <div className="max-w-md mx-auto">
        <header className="pt-12 pb-16 flex flex-col items-center px-6">
          <div onClick={() => fetchData()} className={`w-[18px] h-[36px] bg-white cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all ${isUploading ? 'animate-pulse opacity-50' : 'active:scale-90'}`} />
        </header>

        {!viewingSideParentId ? (
          <div className="space-y-20 pb-40 px-6">
            {mainline.map((slot) => {
              const hasSide = (sideCells[slot.cell.id] || []).length > 0;
              return (
                <div key={slot.cell.id} className="relative group animate-in fade-in zoom-in-95 duration-700">
                  <button onClick={() => handleDelete(slot.cell.id, false)} className="absolute -top-3 -right-1 z-10 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity">
                    <div className="w-3 h-[1px] bg-white rotate-45 absolute" /><div className="w-3 h-[1px] bg-white -rotate-45 absolute" />
                  </button>

                  <div className="bg-white p-3 pb-12 rounded-[12px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/[0.05]">
                    <div className={filmEffectClass}>
                      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.3)_140%)]" />
                      <img src={slot.cell.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <div className="mt-10 flex items-center justify-center relative h-6">
                    {hasSide && <div className="absolute w-full h-[1px] bg-white/[0.15]" />}
                    <button onClick={() => setViewingSideParentId(slot.cell.id)} className="relative z-10 w-8 h-8 bg-[#1A1A1A] border border-white/[0.1] rounded-full flex items-center justify-center shadow-lg active:scale-90">
                      <div className="w-1.5 h-1.5 bg-white rounded-full opacity-40" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="pb-40 animate-in slide-in-from-right duration-500">
            <div className="flex justify-center mb-12 px-6">
              <button onClick={() => setViewingSideParentId(null)} className="w-10 h-10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 border-t border-l border-white -rotate-45" />
              </button>
            </div>
            
            {/* 淵まで届く横スクロールエリア */}
            <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory items-center w-screen overflow-y-hidden">
              {/* 先頭の余白（最初の写真を中央に寄せるため） */}
              <div className="flex-shrink-0 w-[7.5%]" />
              
              { (sideCells[viewingSideParentId] || []).map((cell: any) => (
                <div key={cell.id} className="relative group flex-shrink-0 snap-center w-[85%] px-2">
                  <button onClick={() => handleDelete(cell.id, true)} className="absolute top-2 left-6 z-10 w-4 h-4 opacity-40 hover:opacity-100">
                    <div className="w-full h-[1px] bg-white rotate-45 absolute" /><div className="w-full h-[1px] bg-white -rotate-45 absolute" />
                  </button>
                  <div className="bg-white p-2 pb-10 rounded-[12px] shadow-2xl border border-white/[0.05]">
                    <div className={filmEffectClass}>
                      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.2)_140%)]" />
                      <img src={cell.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 追加ボタンもスナップ対象に */}
              <label className="flex-shrink-0 w-[50%] aspect-square flex items-center justify-center cursor-pointer opacity-20 hover:opacity-100 transition-opacity snap-center">
                <div className="w-2 h-2 border border-white rounded-full" />
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, viewingSideParentId)} />
              </label>

              {/* 末尾の余白 */}
              <div className="flex-shrink-0 w-[7.5%]" />
            </div>
          </div>
        )}

        <nav className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black via-black/90 to-transparent flex justify-center items-center pointer-events-none z-40">
          <label className={`w-14 h-14 bg-transparent border-2 border-white rounded-full flex items-center justify-center cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all pointer-events-auto ${isUploading ? 'opacity-30 scale-75' : 'active:scale-90 hover:border-white/100'}`}>
            <div className={`w-2 h-2 bg-white rounded-full ${isUploading ? 'animate-ping' : 'opacity-80'}`} />
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, viewingSideParentId)} disabled={isUploading} />
          </label>
        </nav>
      </div>
    </div>
  );
}