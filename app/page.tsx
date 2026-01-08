'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const imageContainerClass = `relative w-full aspect-square overflow-hidden rounded-[12px] brightness-[1.05] contrast-[1.1] bg-[#F9F9F9] shadow-sm transition-all duration-500`;

export default function Page() {
  const [mainline, setMainline] = useState<any[]>([]);
  const [sideCells, setSideCells] = useState<any>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isMineMode, setIsMineMode] = useState<string | null>(null);
  const [activeSideIndex, setActiveSideIndex] = useState<{[key: string]: number}>({});

  const isDeepInAlley = Object.values(activeSideIndex).some(idx => idx > 0);

  const cleanup = useCallback(async () => {
    const boundary = new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString();
    try {
      const { data: expiredMain } = await supabase.from('mainline').select('*').lt('created_at', boundary);
      if (expiredMain) {
        for (const main of expiredMain) {
          const { data: sides } = await supabase.from('side_cells').select('*').eq('parent_id', main.id).order('created_at', { ascending: true });
          if (sides && sides.length > 0) {
            const firstSide = sides[0];
            await supabase.from('mainline').insert([{ id: firstSide.id, image_url: firstSide.image_url, created_at: firstSide.created_at }]);
            if (sides.length > 1) {
              for (const s of sides.slice(1)) await supabase.from('side_cells').update({ parent_id: firstSide.id }).eq('id', s.id);
            }
            await supabase.from('side_cells').delete().eq('id', firstSide.id);
          }
          await supabase.storage.from('images').remove([main.id]);
          await supabase.from('mainline').delete().eq('id', main.id);
        }
      }
    } catch (e) {}
  }, []);

  const fetchData = useCallback(async () => {
    await cleanup();
    const { data: mainData } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    const { data: sideData } = await supabase.from('side_cells').select('*').order('created_at', { ascending: true });
    if (mainData) setMainline(mainData);
    if (sideData) {
      const grouped: any = {};
      sideData.forEach((s: any) => {
        if (!grouped[s.parent_id]) grouped[s.parent_id] = [];
        grouped[s.parent_id].push(s);
      });
      setSideCells(grouped);
    }
  }, [cleanup]);

  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(window.location.search);
    if (params.get('mine')) setIsMineMode(params.get('mine'));
    const channel = supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleScroll = (id: string, e: React.UIEvent<HTMLDivElement>) => {
    const index = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
    if (activeSideIndex[id] !== index) setActiveSideIndex(prev => ({ ...prev, [id]: index }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, parentId: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;
    setIsUploading(true);
    try {
      const fileName = `${Date.now()}.jpg`;
      await supabase.storage.from('images').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
      if (!parentId) await supabase.from('mainline').insert([{ id: fileName, image_url: publicUrl }]);
      else await supabase.from('side_cells').insert([{ id: fileName, parent_id: parentId, image_url: publicUrl }]);
      setTimeout(() => fetchData(), 500);
    } catch (err) {} finally { setIsUploading(false); if(e.target) e.target.value = ''; }
  };

  const handleDelete = async (id: string, table: 'mainline' | 'side_cells') => {
    await supabase.storage.from('images').remove([id]);
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  const copyMineUrl = (id: string) => {
    const url = `${window.location.origin}?mine=${id}`;
    const textArea = document.createElement("textarea");
    textArea.value = url; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); alert("●"); } catch (e) {}
    document.body.removeChild(textArea);
  };

  return (
    <div className={`min-h-screen bg-white text-black font-sans selection:bg-none ${isDeepInAlley ? 'overflow-hidden' : 'overflow-x-hidden'}`}>
      <style jsx global>{` .scrollbar-hide::-webkit-scrollbar { display: none; } `}</style>
      
      {isMineMode ? (
        <div className="flex items-center justify-center min-h-screen px-2 bg-white" onClick={() => setIsMineMode(null)}>
          <div className="w-full max-w-md"><div className={imageContainerClass}><img src={mainline.find(m=>m.id===isMineMode)?.image_url || Object.values(sideCells).flat().find((s:any)=>s.id===isMineMode)?.image_url} className="w-full h-full object-cover" /></div></div>
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          {/* 固定ヘッダー：黒塗りのレクタングル */}
          <header className={`fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md z-50 flex justify-center items-center transition-opacity duration-700 ${isDeepInAlley ? 'opacity-0' : 'opacity-100'}`}>
            <div onClick={() => fetchData()} className={`w-[16px] h-[32px] bg-black cursor-pointer active:scale-95 ${isUploading ? 'animate-pulse' : ''}`} />
          </header>

          <div className="pt-32 space-y-48 pb-64">
            {mainline.map((main) => {
              const isThisRowDeep = (activeSideIndex[main.id] || 0) > 0;
              const anyOtherRowDeep = Object.entries(activeSideIndex).some(([id, idx]) => id !== main.id && idx > 0);

              return (
                <div key={main.id} className={`relative group transition-opacity duration-700 ${anyOtherRowDeep ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]" onScroll={(e) => handleScroll(main.id, e)}>
                    
                    {/* メイン画像 */}
                    <div className="flex-shrink-0 w-screen snap-center px-4 relative flex flex-col items-center">
                      <div className={imageContainerClass}><img src={main.image_url} className="w-full h-full object-cover" /></div>
                      
                      {/* 画像下のUIボタン */}
                      <div className="w-full flex justify-between px-2 pt-3 opacity-0 group-hover:opacity-40 transition-opacity">
                         <button onClick={() => copyMineUrl(main.id)} className="text-[10px]">●</button>
                         <button onClick={() => handleDelete(main.id, 'mainline')} className="text-[10px]">✖︎</button>
                      </div>

                      {/* 暗示の線（横丁がある時のみ） */}
                      {(sideCells[main.id] || []).length > 0 && (
                        <div className="absolute top-1/2 right-0 w-[6%] h-[1px] bg-black/20 z-10 pointer-events-none" />
                      )}
                    </div>

                    {/* 横丁画像 */}
                    {(sideCells[main.id] || []).map((side: any) => (
                      <div key={side.id} className="flex-shrink-0 w-screen snap-center px-4 relative flex flex-col items-center">
                        <div className={imageContainerClass}><img src={side.image_url} className="w-full h-full object-cover" /></div>
                        <div className="w-full flex justify-between px-2 pt-3 opacity-0 group-hover:opacity-40 transition-opacity">
                           <button onClick={() => copyMineUrl(side.id)} className="text-[10px]">●</button>
                           <button onClick={() => handleDelete(side.id, 'side_cells')} className="text-[10px]">✖︎</button>
                        </div>
                        <div className="absolute top-1/2 left-0 w-[6%] h-[1px] bg-black/10 z-10 pointer-events-none" />
                        <div className="absolute top-1/2 right-0 w-[6%] h-[1px] bg-black/20 z-10 pointer-events-none" />
                      </div>
                    ))}

                    {/* 追加ボタン */}
                    <div className="flex-shrink-0 w-screen snap-center flex items-center justify-center relative">
                       <div className="absolute top-1/2 left-0 w-[6%] h-[1px] bg-black/10 z-10" />
                       <label className="cursor-pointer opacity-10 hover:opacity-50 transition-opacity p-20 text-[10px]">●
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, main.id)} />
                       </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 固定フッター */}
          <nav className={`fixed bottom-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-md z-50 flex justify-center items-center transition-opacity duration-700 ${isDeepInAlley ? 'opacity-0' : 'opacity-100'}`}>
            <label className={`w-10 h-10 border-[1px] border-black rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-all ${isUploading ? 'opacity-20' : ''}`}>
              <div className={`w-1.5 h-1.5 bg-black rounded-full ${isUploading ? 'animate-ping' : ''}`} />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e)} disabled={isUploading} />
            </label>
          </nav>
        </div>
      )}
    </div>
  );
}