'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 画像サイズを大きく、白背景に馴染む影
const imageContainerClass = `relative w-full aspect-square overflow-hidden rounded-[2px] brightness-[1.05] contrast-[1.1] bg-[#F9F9F9] shadow-sm transition-all duration-500`;

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

  const processImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const SIZE = 800; canvas.width = SIZE; canvas.height = SIZE;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = "#FFF"; ctx.fillRect(0, 0, SIZE, SIZE);
          const scale = Math.max(SIZE / img.width, SIZE / img.height);
          const x = (SIZE / 2) - (img.width / 2) * scale;
          const y = (SIZE / 2) - (img.height / 2) * scale;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
        };
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, parentId: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;
    setIsUploading(true);
    try {
      const processedBlob = await processImage(file);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      await supabase.storage.from('images').upload(fileName, processedBlob);
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
      if (!parentId) await supabase.from('mainline').insert([{ id: fileName, image_url: publicUrl }]);
      else await supabase.from('side_cells').insert([{ id: fileName, parent_id: parentId, image_url: publicUrl }]);
      setTimeout(() => fetchData(), 500);
    } catch (err) { console.error(err); } finally { setIsUploading(false); if(e.target) e.target.value = ''; }
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
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(textArea);
  };

  // 修正：見失っていた関数を復旧
  const getMineImageUrl = () => {
    if (!isMineMode) return null;
    const mainFound = mainline.find(m => m.id === isMineMode);
    if (mainFound) return mainFound.image_url;
    const allSides = Object.values(sideCells).flat() as any[];
    const sideFound = allSides.find((s: any) => s.id === isMineMode);
    return sideFound?.image_url || null;
  };

  return (
    <div className={`min-h-screen bg-white text-black font-sans selection:bg-none ${isDeepInAlley ? 'overflow-hidden' : 'overflow-x-hidden'}`}>
      <style jsx global>{` .scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; } `}</style>
      
      {isMineMode && getMineImageUrl() ? (
        <div className="flex items-center justify-center min-h-screen px-2 animate-in fade-in duration-1000 bg-white" onClick={() => setIsMineMode(null)}>
          <div className="w-full max-w-md"><div className={imageContainerClass}><img src={getMineImageUrl()!} className="w-full h-full object-cover" /></div></div>
        </div>
      ) : (
        <div className="max-w-md mx-auto relative">
          
          {/* 固定ヘッダー：レクタングルマーク */}
          <header className={`fixed top-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-sm z-50 flex justify-center items-center transition-opacity duration-700 ${isDeepInAlley ? 'opacity-0' : 'opacity-100'}`}>
            <div onClick={() => fetchData()} className={`w-[14px] h-[28px] border-[1px] border-black cursor-pointer active:scale-95 transition-all ${isUploading ? 'animate-pulse' : ''}`} />
          </header>

          <div className="pt-32 space-y-48 pb-64">
            {mainline.map((main) => {
              const anyOtherRowDeep = Object.entries(activeSideIndex).some(([id, idx]) => id !== main.id && idx > 0);
              return (
                <div key={main.id} className={`relative group transition-opacity duration-700 ${anyOtherRowDeep ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]" onScroll={(e) => handleScroll(main.id, e)}>
                    
                    {/* メイン画像エリア */}
                    <div className="flex-shrink-0 w-screen snap-center px-2 relative flex flex-col items-center">
                      {/* URL作成ボタン（左上・）と削除ボタン（右上・） */}
                      <button onClick={() => copyMineUrl(main.id)} className="absolute top-2 left-4 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-30 text-[14px] z-10">・</button>
                      <button onClick={() => handleDelete(main.id, 'mainline')} className="absolute top-2 right-4 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-30 text-[14px] z-10">・</button>
                      
                      {/* 右横の暗示の点（メインのみ） */}
                      {(sideCells[main.id] || []).length > 0 && (
                        <div className="absolute top-1/2 -right-1 w-4 h-4 flex items-center justify-center text-[10px] opacity-40 pointer-events-none z-10">・</div>
                      )}
                      
                      <div className={imageContainerClass}><img src={main.image_url} className="w-full h-full object-cover" loading="lazy" /></div>
                    </div>

                    {/* 横丁画像エリア */}
                    {(sideCells[main.id] || []).map((side: any) => (
                      <div key={side.id} className="flex-shrink-0 w-screen snap-center px-2 relative flex flex-col items-center">
                        <button onClick={() => copyMineUrl(side.id)} className="absolute top-2 left-4 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-30 text-[14px] z-10">・</button>
                        <button onClick={() => handleDelete(side.id, 'side_cells')} className="absolute top-2 right-4 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-30 text-[14px] z-10">・</button>
                        <div className={imageContainerClass}><img src={side.image_url} className="w-full h-full object-cover" loading="lazy" /></div>
                      </div>
                    ))}

                    {/* 横丁追加ボタン */}
                    <div className="flex-shrink-0 w-screen snap-center flex items-center justify-center">
                       <label className="cursor-pointer opacity-10 hover:opacity-50 transition-opacity p-24 text-[14px]">・
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, main.id)} />
                       </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 固定フッター：アップボタン */}
          <nav className={`fixed bottom-0 left-0 right-0 h-24 bg-white/90 backdrop-blur-sm z-50 flex justify-center items-center transition-opacity duration-700 ${isDeepInAlley ? 'opacity-0' : 'opacity-100'}`}>
            <label className={`w-10 h-10 border-[1px] border-black rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-all ${isUploading ? 'opacity-20' : ''}`}>
              <div className={`w-1 h-1 bg-black rounded-full ${isUploading ? 'animate-ping' : ''}`} />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e)} disabled={isUploading} />
            </label>
          </nav>
        </div>
      )}
    </div>
  );
}