'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 博士のリサーチに基づく「赤っぽい退色ポラ」エフェクト
// 露出+、コントラスト高、白レベル強、マゼンタ寄り、彩度低、テクスチャ低
const filmEffectClass = `
  relative overflow-hidden rounded-[12px] 
  brightness-[1.15] 
  contrast-[1.4] 
  saturate-[0.7] 
  sepia-[0.2] 
  hue-rotate-[-15deg] 
  blur-[0.8px]
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
          const MAX_SIZE = 512;
          let width = img.width; let height = img.height;
          if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
          else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
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
    } catch (err) { console.error(err); } finally { setIsUploading(false); e.target.value = ''; }
  };

  const handleDelete = async (id: string, isSide: boolean) => {
    const table = isSide ? 'side_cells' : 'mainline';
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#E2E2E2] text-black font-sans overflow-x-hidden">
      {/* 粒子（グレイン）エフェクト */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.05] mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

      <div className="max-w-md mx-auto px-6">
        
        <header className="pt-12 pb-16 flex flex-col items-center">
          <div onClick={() => fetchData()} className={`w-[18px] h-[36px] bg-black cursor-pointer shadow-sm transition-all ${isUploading ? 'animate-pulse opacity-50' : 'active:scale-90'}`} />
        </header>

        {!viewingSideParentId ? (
          <div className="space-y-20 pb-40">
            {mainline.map((slot) => {
              const hasSide = (sideCells[slot.cell.id] || []).length > 0;
              return (
                <div key={slot.cell.id} className="relative group animate-in fade-in zoom-in-95 duration-700">
                  <button onClick={() => handleDelete(slot.cell.id, false)} className="absolute -top-3 -right-1 z-10 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-20 hover:!opacity-100 transition-opacity">
                    <div className="w-3 h-[1px] bg-black rotate-45 absolute" /><div className="w-3 h-[1px] bg-black -rotate-45 absolute" />
                  </button>

                  {/* ダブルラウンド：台紙12px / 画像12px */}
                  <div className="bg-white p-3 pb-12 rounded-[12px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] border border-black/[0.03]">
                    <div className={filmEffectClass}>
                      {/* ヴィネット（周辺減光を強化） */}
                      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.25)_140%)]" />
                      <img src={slot.cell.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <div className="mt-10 flex items-center justify-center relative h-6">
                    {hasSide && <div className="absolute w-full h-[1px] bg-black/[0.12]" />}
                    <button onClick={() => setViewingSideParentId(slot.cell.id)} className="relative z-10 w-8 h-8 bg-white border border-black/[0.05] rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all">
                      <div className="w-1.5 h-1.5 bg-black rounded-full opacity-30" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="pb-40 animate-in slide-in-from-right duration-500">
            <div className="flex justify-center mb-16">
              <button onClick={() => setViewingSideParentId(null)} className="w-10 h-10 flex items-center justify-center opacity-20 hover:opacity-100">
                <div className="w-2 h-2 border-t border-l border-black -rotate-45" />
              </button>
            </div>
            
            <div className="flex overflow-x-auto space-x-6 pb-12 scrollbar-hide snap-x items-center px-4 -mx-10">
              { (sideCells[viewingSideParentId] || []).map((cell: any) => (
                <div key={cell.id} className="relative group flex-shrink-0 snap-center w-[85%]">
                  <button onClick={() => handleDelete(cell.id, true)} className="absolute -top-8 left-0 z-10 w-4 h-4 opacity-10 hover:opacity-100">
                    <div className="w-full h-[1px] bg-black rotate-45 absolute" /><div className="w-full h-[1px] bg-black -rotate-45 absolute" />
                  </button>
                  <div className="bg-white p-2 pb-10 rounded-[12px] shadow-2xl border border-black/[0.02]">
                    <div className={filmEffectClass}>
                      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.2)_140%)]" />
                      <img src={cell.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              ))}
              <label className="flex-shrink-0 w-24 aspect-square flex flex-col items-center justify-center cursor-pointer opacity-10">
                <div className="w-1.5 h-1.5 bg-black rounded-full" />
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, viewingSideParentId)} />
              </label>
            </div>
          </div>
        )}

        <nav className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#E2E2E2] via-[#E2E2E2]/90 to-transparent flex justify-center items-center pointer-events-none">
          <label className={`w-14 h-14 bg-black rounded-full flex items-center justify-center cursor-pointer shadow-xl transition-all pointer-events-auto border-4 border-white ${isUploading ? 'opacity-30 scale-75' : 'active:scale-90'}`}>
            <div className={`w-3 h-3 bg-white rounded-full ${isUploading ? 'animate-ping' : ''}`} />
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, viewingSideParentId)} disabled={isUploading} />
          </label>
        </nav>

      </div>
    </div>
  );
}