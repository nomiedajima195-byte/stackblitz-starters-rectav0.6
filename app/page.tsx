'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 余白を排除し、画像そのものを引き立てるクラス
const imageContainerClass = `relative w-full aspect-square overflow-hidden rounded-[4px] brightness-[1.1] contrast-[1.2] bg-[#1A1A1A] shadow-[0_10px_30px_rgba(0,0,0,0.5)]`;

export default function Page() {
  const [mainline, setMainline] = useState<any[]>([]);
  const [sideCells, setSideCells] = useState<any>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isMineMode, setIsMineMode] = useState<string | null>(null);

  const cleanup = useCallback(async () => {
    const boundary = new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString();
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
  }, []);

  const fetchData = useCallback(async () => {
    await cleanup();
    const { data: mainData } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    const { data: sideData } = await supabase.from('side_cells').select('*').order('created_at', { ascending: true });
    if (mainData) setMainline(mainData);
    if (sideData) {
      const grouped: any = {};
      sideData.forEach(s => {
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

  const processImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const SIZE = 600; canvas.width = SIZE; canvas.height = SIZE;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, SIZE, SIZE);
          const scale = Math.max(SIZE / img.width, SIZE / img.height);
          const x = (SIZE / 2) - (img.width / 2) * scale;
          const y = (SIZE / 2) - (img.height / 2) * scale;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, 0, SIZE, SIZE);
          const grad = ctx.createRadialGradient(SIZE/2, SIZE/2, SIZE/4, SIZE/2, SIZE/2, SIZE/1.4);
          grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.5)');
          ctx.fillStyle = grad; ctx.globalCompositeOperation = 'source-over'; ctx.fillRect(0, 0, SIZE, SIZE);
          for (let i = 0; i < 5000; i++) {
            const rx = Math.random() * SIZE; const ry = Math.random() * SIZE;
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; ctx.fillRect(rx, ry, 1, 1);
          }
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

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans overflow-x-hidden selection:bg-none">
      <style jsx global>{` .scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; } `}</style>
      
      {isMineMode ? (
        <div className="flex items-center justify-center min-h-screen px-6 animate-in fade-in duration-1000" onClick={() => setIsMineMode(null)}>
          <div className="w-full max-w-sm"><div className={imageContainerClass}><img src={mainline.find(m => m.id === isMineMode)?.image_url || Object.values(sideCells).flat().find((s:any) => s.id === isMineMode)?.image_url} className="w-full h-full object-cover" /></div></div>
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <header className="pt-12 pb-16 flex justify-center">
            <div onClick={() => fetchData()} className={`w-[1px] h-8 bg-white/20 cursor-pointer transition-all active:scale-y-50 ${isUploading ? 'animate-pulse bg-white' : ''}`} />
          </header>

          <div className="space-y-40 pb-64">
            {mainline.map((main) => (
              <div key={main.id} className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
                <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                  <div className="flex-shrink-0 w-[10%]" />
                  
                  {/* メイン画像（余白なし） */}
                  <div className="flex-shrink-0 w-[80%] snap-center px-1 relative group">
                    <button onClick={() => handleDelete(main.id, 'mainline')} className="absolute -top-6 right-2 z-10 opacity-0 group-hover:opacity-40 hover:!opacity-100 text-[10px] tracking-widest transition-opacity">DELETE</button>
                    <div className={imageContainerClass}><img src={main.image_url} className="w-full h-full object-cover" loading="lazy" /></div>
                  </div>

                  {/* 横丁画像（余白なし・シームレス） */}
                  {(sideCells[main.id] || []).map((side: any) => (
                    <div key={side.id} className="flex-shrink-0 w-[80%] snap-center px-1 relative group">
                      <button onClick={() => handleDelete(side.id, 'side_cells')} className="absolute -top-6 right-2 z-10 opacity-0 group-hover:opacity-40 hover:!opacity-100 text-[10px] tracking-widest transition-opacity">DELETE</button>
                      <div className={imageContainerClass}><img src={side.image_url} className="w-full h-full object-cover" loading="lazy" /></div>
                    </div>
                  ))}

                  {/* 横丁追加（極小のドットのみ） */}
                  <label className="flex-shrink-0 w-[40%] flex items-center justify-center cursor-pointer opacity-10 hover:opacity-50 snap-center transition-opacity">
                    <div className="w-[1px] h-[1px] bg-white" />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, main.id)} />
                  </label>
                  <div className="flex-shrink-0 w-[10%]" />
                </div>
              </div>
            ))}
          </div>

          {/* フッターのアップロードボタン（極限までシンプルに） */}
          <nav className="fixed bottom-12 left-0 right-0 flex justify-center items-center pointer-events-none z-40">
            <label className="w-10 h-10 flex items-center justify-center cursor-pointer pointer-events-auto group">
              <div className={`w-[1px] h-[1px] bg-white transition-all group-active:scale-[20] ${isUploading ? 'animate-ping h-2 w-2' : ''}`} />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e)} disabled={isUploading} />
            </label>
          </nav>
        </div>
      )}
    </div>
  );
}