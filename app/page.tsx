'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
          resolve(canvas.toDataURL('image/jpeg', 0.8));
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
      const id = `${Date.now()}`;
      if (!parentId) { await supabase.from('mainline').insert([{ id, image_url: resizedDataUrl }]); }
      else { await supabase.from('side_cells').insert([{ id, parent_id: parentId, image_url: resizedDataUrl }]); }
      await fetchData();
    } catch (err) { console.error(err); } finally { setIsUploading(false); }
  };

  const handleDelete = async (id: string, isSide: boolean) => {
    const table = isSide ? 'side_cells' : 'mainline';
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black font-sans overflow-x-hidden selection:bg-black">
      <div className="max-w-md mx-auto px-6">
        
        {/* ヘッダー：9:18 矩形 */}
        <header className="pt-12 pb-16 flex flex-col items-center">
          <div onClick={() => fetchData()} className={`w-[18px] h-[36px] bg-black cursor-pointer shadow-sm transition-all ${isUploading ? 'animate-pulse opacity-50' : 'active:scale-90'}`} />
        </header>

        {!viewingSideParentId ? (
          <div className="space-y-16 pb-40">
            {mainline.map((slot) => {
              const hasSide = (sideCells[slot.cell.id] || []).length > 0;
              return (
                <div key={slot.cell.id} className="relative group">
                  <button onClick={() => handleDelete(slot.cell.id, false)} className="absolute -top-3 -right-1 z-10 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-20 hover:!opacity-100 transition-opacity">
                    <div className="w-3 h-[1px] bg-black rotate-45 absolute" /><div className="w-3 h-[1px] bg-black -rotate-45 absolute" />
                  </button>

                  <div className="aspect-square bg-white rounded-[12px] overflow-hidden shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] p-1 border border-black/[0.02]">
                    <img src={slot.cell.imageUrl} alt="" className="w-full h-full object-cover rounded-[10px]" />
                  </div>

                  {/* 横丁示唆UI：小●と横線 */}
                  <div className="mt-8 flex items-center justify-center relative h-6">
                    {/* 横丁がある場合のみ伸びる線 */}
                    {hasSide && <div className="absolute w-full h-[1px] bg-black/[0.08]" />}
                    
                    <button 
                      onClick={() => setViewingSideParentId(slot.cell.id)} 
                      className="relative z-10 w-7 h-7 bg-white border border-black/[0.05] rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-all hover:border-black/20"
                    >
                      <div className="w-1.5 h-1.5 bg-black rounded-full opacity-30 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="pb-40 animate-in slide-in-from-right duration-500">
            <div className="flex justify-center mb-16">
              <button onClick={() => setViewingSideParentId(null)} className="w-10 h-10 flex items-center justify-center opacity-20 hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 border-t border-l border-black -rotate-45" />
              </button>
            </div>
            
            <div className="flex overflow-x-auto space-x-8 pb-12 scrollbar-hide snap-x items-center px-4 -mx-10">
              { (sideCells[viewingSideParentId] || []).map((cell: any) => (
                <div key={cell.id} className="relative group flex-shrink-0 snap-center">
                  <button onClick={() => handleDelete(cell.id, true)} className="absolute -top-8 left-0 z-10 w-4 h-4 opacity-10 hover:opacity-100">
                    <div className="w-full h-[1px] bg-black rotate-45 absolute" /><div className="w-full h-[1px] bg-black -rotate-45 absolute" />
                  </button>
                  <div className="h-[50vh] aspect-[3/4] shadow-2xl rounded-sm overflow-hidden bg-white p-1 border border-black/[0.05]">
                    <img src={cell.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                </div>
              ))}
              {/* 横丁内での追加ボタンも小●に統一 */}
              <label className="flex-shrink-0 w-24 h-[50vh] flex flex-col items-center justify-center cursor-pointer opacity-10 hover:opacity-40 transition-opacity snap-center">
                <div className="w-1.5 h-1.5 bg-black rounded-full" />
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, viewingSideParentId)} />
              </label>
            </div>
          </div>
        )}

        {/* 下部ナビ：大●（投稿） */}
        <nav className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F8F8F8] via-[#F8F8F8]/90 to-transparent flex justify-center items-center pointer-events-none">
          <label className={`w-14 h-14 bg-black rounded-full flex items-center justify-center cursor-pointer shadow-xl transition-all pointer-events-auto border-4 border-white ${isUploading ? 'opacity-30 scale-75' : 'active:scale-90'}`}>
            <div className={`w-3 h-3 bg-white rounded-full ${isUploading ? 'animate-ping' : ''}`} />
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, viewingSideParentId)} disabled={isUploading} />
          </label>
        </nav>

      </div>
    </div>
  );
}