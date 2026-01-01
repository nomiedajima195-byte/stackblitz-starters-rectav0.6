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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, parentId: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;
      const id = `${Date.now()}`;
      if (!parentId) {
        await supabase.from('mainline').insert([{ id, image_url: imageUrl }]);
      } else {
        await supabase.from('side_cells').insert([{ id, parent_id: parentId, image_url: imageUrl }]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string, isSide: boolean) => {
    const table = isSide ? 'side_cells' : 'mainline';
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black font-sans overflow-x-hidden selection:bg-black selection:text-white">
      <div className="max-w-md mx-auto px-6">
        
        {/* ヘッダー：9:18の縦長ロゴ（中央） */}
        <header className="pt-12 pb-16 flex flex-col items-center">
          <div 
            onClick={() => fetchData()} 
            className="w-[18px] h-[36px] bg-black cursor-pointer active:scale-90 transition-transform shadow-sm"
            title="SYNC"
          />
        </header>

        {!viewingSideParentId ? (
          <div className="space-y-16 pb-40">
            {mainline.map((slot) => (
              <div key={slot.cell.id} className="relative group animate-in fade-in duration-700">
                {/* 削除：図形化（右上） */}
                <button 
                  onClick={() => handleDelete(slot.cell.id, false)} 
                  className="absolute -top-3 -right-1 z-10 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-20 hover:!opacity-100 transition-opacity"
                >
                  <div className="w-3 h-[1px] bg-black rotate-45 absolute" />
                  <div className="w-3 h-[1px] bg-black -rotate-45 absolute" />
                </button>

                {/* メイン画像：1:1 スクエア / 角丸12px */}
                <div className="aspect-square bg-white rounded-[12px] overflow-hidden shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] p-1 border border-black/[0.02]">
                  <img src={slot.cell.imageUrl} alt="" className="w-full h-full object-cover rounded-[10px]" />
                </div>

                {/* 横丁への示唆：画像下のライン */}
                <div className="mt-6 flex flex-col items-center">
                  <button 
                    onClick={() => setViewingSideParentId(slot.cell.id)} 
                    className="w-full h-12 flex items-center justify-center space-x-2 group/btn"
                  >
                    <div className="h-[1px] w-4 bg-black/10 group-hover/btn:w-8 transition-all" />
                    <div className="text-[10px] tracking-[0.3em] opacity-20 group-hover/btn:opacity-60 transition-opacity">EXPLORE</div>
                    <div className="h-[1px] w-4 bg-black/10 group-hover/btn:w-8 transition-all" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pb-40 animate-in slide-in-from-right duration-500">
            {/* 戻る：中央の記号 */}
            <div className="flex justify-center mb-16">
              <button onClick={() => setViewingSideParentId(null)} className="w-10 h-10 flex items-center justify-center opacity-20 hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 border-t border-l border-black -rotate-45" />
              </button>
            </div>
            
            <div className="flex overflow-x-auto space-x-8 pb-12 scrollbar-hide snap-x items-center px-4 -mx-10">
              { (sideCells[viewingSideParentId] || []).map((cell: any) => (
                <div key={cell.id} className="relative group flex-shrink-0 snap-center">
                  <button onClick={() => handleDelete(cell.id, true)} className="absolute -top-6 left-0 z-10 w-4 h-4 opacity-10 hover:opacity-100">
                    <div className="w-full h-[1px] bg-black rotate-45 absolute" />
                    <div className="w-full h-[1px] bg-black -rotate-45 absolute" />
                  </button>
                  <div className="h-[50vh] aspect-[3/4] shadow-2xl rounded-sm overflow-hidden bg-white p-1 border border-black/[0.05]">
                    <img src={cell.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* タスクバー：中央に ● ボタン */}
        <nav className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/90 to-transparent flex justify-center items-center pointer-events-none">
          <label className="w-14 h-14 bg-black rounded-full flex items-center justify-center cursor-pointer shadow-xl active:scale-90 transition-all pointer-events-auto border-4 border-white">
            <div className="w-3 h-3 bg-white rounded-full" />
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, viewingSideParentId)} />
          </label>
        </nav>

      </div>
    </div>
  );
}