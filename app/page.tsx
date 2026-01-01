'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- 博士専用：URLとキー ---
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

  // --- 画像削除機能 ---
  const handleDelete = async (id: string, isSide: boolean) => {
    if (!confirm('この画像を路地から消去しますか？')) return;
    const table = isSide ? 'side_cells' : 'mainline';
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans">
      <div className="max-w-md mx-auto">
        <header className="mb-8 flex justify-between items-center text-xs opacity-40 tracking-[0.3em]">
          <h1>RECTA CLOUD v0.7</h1>
          <button onClick={() => fetchData()} className="border px-2 py-1">SYNC</button>
        </header>

        {!viewingSideParentId ? (
          <div className="space-y-12 pb-32">
            {mainline.map((slot) => (
              <div key={slot.cell.id} className="relative group">
                {/* 削除ボタン */}
                <button onClick={() => handleDelete(slot.cell.id, false)} className="absolute -top-2 -left-2 z-10 bg-white border border-black/10 text-[10px] w-5 h-5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                
                <div className="aspect-[3/4] bg-gray-50 rounded-xl overflow-hidden border">
                  <img src={slot.cell.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <button onClick={() => setViewingSideParentId(slot.cell.id)} className="absolute -right-2 bottom-4 bg-black text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg active:scale-95 transition-transform"> → </button>
              </div>
            ))}
            <label className="block aspect-[3/4] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer text-gray-300 hover:bg-gray-50 transition-colors">
              <span className="text-3xl font-light">＋</span>
              <span className="text-[10px] mt-2 tracking-widest">ADD MAIN</span>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e)} />
            </label>
          </div>
        ) : (
          <div className="pb-32">
            <button onClick={() => setViewingSideParentId(null)} className="text-[10px] opacity-40 mb-6 tracking-widest"> ← BACK TO MAIN </button>
            
            {/* 横丁（サイドセル）をグリッド（横並び）で表示 */}
            <div className="grid grid-cols-2 gap-4">
              { (sideCells[viewingSideParentId] || []).map((cell: any) => (
                <div key={cell.id} className="relative group aspect-square">
                  <button onClick={() => handleDelete(cell.id, true)} className="absolute -top-2 -left-2 z-10 bg-white border border-black/10 text-[10px] w-5 h-5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  <div className="w-full h-full bg-gray-50 rounded-lg overflow-hidden border">
                    <img src={cell.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
              <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer text-gray-300 hover:bg-gray-50 transition-colors">
                <span className="text-xl">＋</span>
                <span className="text-[8px] mt-1 tracking-widest text-center">ADD SIDE</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, viewingSideParentId)} />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}