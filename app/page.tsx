'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const filmEffectClass = `relative w-full aspect-square overflow-hidden rounded-[12px] brightness-[1.1] contrast-[1.2] bg-[#1A1A1A]`;

export default function Page() {
  const [mainline, setMainline] = useState<any[]>([]);
  const [sideCells, setSideCells] = useState<any>({});
  const [viewingSideParentId, setViewingSideParentId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMineMode, setIsMineMode] = useState<string | null>(null);

  const cleanup = useCallback(async () => {
    const boundary = new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString();
    
    // 1. 寿命が尽きたメイン画像を取得
    const { data: expiredMain } = await supabase.from('mainline').select('*').lt('created_at', boundary);
    
    if (expiredMain && expiredMain.length > 0) {
      for (const main of expiredMain) {
        // 横丁があるか確認
        const { data: sides } = await supabase.from('side_cells').select('*').eq('parent_id', main.id).order('created_at', { ascending: true });
        
        if (sides && sides.length > 0) {
          // 横丁の1枚目をメインに昇格させる
          const firstSide = sides[0];
          await supabase.from('mainline').insert([{ id: firstSide.id, image_url: firstSide.image_url, created_at: firstSide.created_at }]);
          // 残りの横丁の親IDを新しいメインのIDに付け替える
          if (sides.length > 1) {
            const otherSides = sides.slice(1);
            for (const s of otherSides) {
              await supabase.from('side_cells').update({ parent_id: firstSide.id }).eq('id', s.id);
            }
          }
          // 旧横丁の1枚目を削除（メインになったので）
          await supabase.from('side_cells').delete().eq('id', firstSide.id);
        }
        
        // 寿命が尽きたメインを削除（倉庫からも）
        await supabase.storage.from('images').remove([main.id]);
        await supabase.from('mainline').delete().eq('id', main.id);
      }
    }

    // 2. 親のいない（または寿命の）横丁も掃除
    const { data: expiredSides } = await supabase.from('side_cells').select('*').lt('created_at', boundary);
    if (expiredSides) {
      for (const s of expiredSides) {
        await supabase.storage.from('images').remove([s.id]);
        await supabase.from('side_cells').delete().eq('id', s.id);
      }
    }
  }, []);

  const fetchData = useCallback(async () => {
    await cleanup(); // 取得前に掃除を実行
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
  }, [cleanup]);

  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(window.location.search);
    const mineId = params.get('mine');
    const type = params.get('type');
    if (mineId) {
      setIsMineMode(mineId);
      if (type === 'alley') setViewingSideParentId(mineId);
    }
    const channel = supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // --- 処理ロジック (processImage, handleFileUpload, copyMineUrl) は v4.2 と同じ ---
  const processImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const SIZE = 600; 
          canvas.width = SIZE; canvas.height = SIZE;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, SIZE, SIZE);
          const scale = Math.max(SIZE / img.width, SIZE / img.height);
          const x = (SIZE / 2) - (img.width / 2) * scale;
          const y = (SIZE / 2) - (img.height / 2) * scale;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(0, 0, SIZE, SIZE);
          const grad = ctx.createRadialGradient(SIZE/2, SIZE/2, SIZE/4, SIZE/2, SIZE/2, SIZE/1.4);
          grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.5)');
          ctx.fillStyle = grad;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillRect(0, 0, SIZE, SIZE);
          for (let i = 0; i < 5000; i++) {
            const rx = Math.random() * SIZE; const ry = Math.random() * SIZE;
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
            ctx.fillRect(rx, ry, 1, 1);
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
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, processedBlob);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
      if (!parentId) { await supabase.from('mainline').insert([{ id: fileName, image_url: publicUrl }]); }
      else { await supabase.from('side_cells').insert([{ id: fileName, parent_id: parentId, image_url: publicUrl }]); }
      setTimeout(() => fetchData(), 500);
    } catch (err) { alert("現像に失敗しました。"); } finally { setIsUploading(false); if(e.target) e.target.value = ''; }
  };

  const handleDelete = async (id: string, isSide: boolean) => {
    await supabase.storage.from('images').remove([id]);
    await supabase.from(isSide ? 'side_cells' : 'mainline').delete().eq('id', id);
    fetchData();
  };

  const copyMineUrl = (id: string, isAlley: boolean = false) => {
    const url = `${window.location.origin}?mine=${id}${isAlley ? '&type=alley' : ''}`;
    const textArea = document.createElement("textarea");
    textArea.value = url; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); alert("💣 地雷URLをコピーしました。"); } catch (e) {}
    document.body.removeChild(textArea);
  };

  const getTargetImage = () => {
    if (!isMineMode) return null;
    const mainImg = mainline.find(m => m.cell.id === isMineMode);
    if (mainImg) return mainImg.cell.imageUrl;
    for (const p in sideCells) {
      const s = sideCells[p].find((img: any) => img.id === isMineMode);
      if (s) return s.imageUrl;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans overflow-x-hidden">
      {/* --- UI部分は v4.2 と同じため省略 --- */}
      <style jsx global>{` .scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; } `}</style>
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.08] mix-blend-screen bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
      <div className="max-w-md mx-auto">
        {isMineMode && getTargetImage() ? (
          <div className="flex flex-col items-center justify-center min-h-screen px-6 animate-in fade-in duration-1000">
            <div onClick={() => setIsMineMode(null)} className="w-full bg-white p-3 pb-12 rounded-[12px] shadow-2xl cursor-pointer active:scale-95 transition-transform">
              <div className={filmEffectClass}><img src={getTargetImage()!} alt="" className="w-full h-full object-cover" /></div>
            </div>
          </div>
        ) : (
          <>
            <header className="pt-12 pb-16 flex flex-col items-center px-6">
              <div onClick={() => fetchData()} className={`w-[18px] h-[36px] bg-white cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all ${isUploading ? 'animate-pulse opacity-50' : 'active:scale-90'}`} />
            </header>
            {!viewingSideParentId ? (
              <div className="space-y-20 pb-40 px-6">
                {mainline.map((slot) => (
                  <div key={slot.cell.id} className="relative group animate-in fade-in zoom-in-95 duration-700">
                    <button onClick={() => handleDelete(slot.cell.id, false)} className="absolute -top-3 -right-1 z-20 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-40 hover:!opacity-100"><div className="w-3 h-[1px] bg-white rotate-45 absolute" /><div className="w-3 h-[1px] bg-white -rotate-45 absolute" /></button>
                    <button onClick={() => copyMineUrl(slot.cell.id, false)} className="absolute -top-3 -left-1 z-20 w-8 h-8 opacity-0 pointer-events-auto">MINE</button>
                    <div className="bg-white p-3 pb-12 rounded-[12px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/[0.05]">
                      <div className={filmEffectClass}><img src={slot.cell.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" /></div>
                    </div>
                    <div className="mt-10 flex items-center justify-center relative h-6">
                      {(sideCells[slot.cell.id] || []).length > 0 && <div className="absolute w-full h-[1px] bg-white/[0.15]" />}
                      <button onClick={() => setViewingSideParentId(slot.cell.id)} className="relative z-10 w-8 h-8 bg-[#1A1A1A] border border-white/[0.1] rounded-full flex items-center justify-center shadow-lg active:scale-90"><div className="w-1.5 h-1.5 bg-white rounded-full opacity-40" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pb-40 animate-in slide-in-from-right duration-500">
                <div className="flex justify-center mb-12 px-6">
                  <button onClick={() => setViewingSideParentId(null)} className="w-10 h-10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"><div className="w-2 h-2 border-t border-l border-white -rotate-45" /></button>
                </div>
                <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory items-center w-screen overflow-y-hidden">
                  <div className="flex-shrink-0 w-[7.5%]" />
                  {(sideCells[viewingSideParentId] || []).map((cell: any) => (
                    <div key={cell.id} className="relative group flex-shrink-0 snap-center w-[85%] px-2">
                      <button onClick={() => handleDelete(cell.id, true)} className="absolute top-2 left-6 z-10 w-4 h-4 opacity-40 hover:opacity-100"><div className="w-full h-[1px] bg-white rotate-45 absolute" /><div className="w-full h-[1px] bg-white -rotate-45 absolute" /></button>
                      <div onClick={() => copyMineUrl(viewingSideParentId, true)} className="absolute top-0 left-0 w-20 h-20 z-20 opacity-0" />
                      <div className="bg-white p-2 pb-10 rounded-[12px] shadow-2xl border border-white/[0.05]">
                        <div className={filmEffectClass}><img src={cell.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" /></div>
                      </div>
                    </div>
                  ))}
                  <label className="flex-shrink-0 w-[50%] aspect-square flex items-center justify-center cursor-pointer opacity-20 hover:opacity-100 transition-opacity snap-center"><div className="w-2 h-2 border border-white rounded-full" /><input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, viewingSideParentId)} /></label>
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
          </>
        )}
      </div>
    </div>
  );
}