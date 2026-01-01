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
      const { data: mainData } = await supabase.from('mainline').select('*').order('created_at', { ascending: true });
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
    if (!confirm('この画像を路地から消去しますか？')) return;
    const table = isSide ? 'side_cells' : 'mainline';
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans overflow-x-hidden">
      <div className="max-w-md mx-auto">
        <header className="mb-12 flex justify-between items-center text-[10px] opacity-40 tracking-[0.4em]">
          <h1>RECTA CLOUD v1.0</h1>
          <button onClick={() => fetchData()} className="border px-2 py-1">SYNC</button>
        </header>

        {!viewingSideParentId ? (
          <div className="space-y-20 pb-32">
            {mainline.map((slot) => (
              <div key={slot.cell.id} className="relative group">
                <button onClick={() => handleDelete(slot.cell.id, false)} className="absolute -top-4 -left-2 z-10 text-[12px] opacity-20 hover:opacity-100">delete</button>
                <div className="w-full bg-gray-50 rounded-sm overflow-hidden shadow-sm border border-gray-100">
                  {/* 比率を固定せず、そのまま表示 */}
                  <img src={slot.cell.imageUrl} alt="" className="w-full h-auto block" />
                </div>
                <button onClick={() => setViewingSideParentId(slot.cell.id)} className="mt-4 flex items-center text-[10px] tracking-widest opacity-30 hover:opacity-100 transition-opacity">
                  GO SIDEWAYS ➔
                </button>
              </div>
            ))}
            <label className="block w-full aspect-video border border-dashed border-gray-200 rounded-sm flex flex-col items-center justify-center cursor-pointer text-gray-300 hover:bg-gray-50">
              <span className="text-2xl font-light">＋</span>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e)} />
            </label>
          </div>
        ) : (
          <div className="pb-32">
            <button onClick={() => setViewingSideParentId(null)} className="text-[10px] opacity-40 mb-12 tracking-widest"> ← BACK </button>
            
            {/* 横並び・比率フリー仕様 */}
            <div className="flex overflow-x-auto space-x-8 pb-8 scrollbar-hide snap-x items-center">
              { (sideCells[viewingSideParentId] || []).map((cell: any) => (
                <div key={cell.id} className="relative group flex-shrink-0 snap-center">
                  <button onClick={() => handleDelete(cell.id, true)} className="absolute -top-6 left-0 z-10 text-[10px] opacity-20">delete</button>
                  <div className="h-[60vh] shadow-lg border border-gray-100 bg-gray-50">
                    {/* 高さを固定して、横幅を画像に合わせる */}
                    <img src={cell.imageUrl} alt="" className="h-full w-auto block object-contain" />
                  </div>
                </div>
              ))}
              <label className="flex-shrink-0 w-40 h-[60vh] border border-dashed border-gray-200 rounded-sm flex flex-col items-center justify-center cursor-pointer text-gray-300 snap-center">
                <span className="text-xl">＋</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, viewingSideParentId)} />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}