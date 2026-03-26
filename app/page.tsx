'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Room134DualEngine() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [pads, setPads] = useState<(any | null)[]>(Array(8).fill(null));
  const [isMPCVisible, setIsMPCVisible] = useState(false);
  const [openedBox, setOpenedBox] = useState<any[] | null>(null);
  
  // 再生用
  const [playingTrack, setPlayingTrack] = useState<any[] | null>(null);
  const [playIdx, setPlayIdx] = useState(0);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (data) setNodes(data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- 再生ロジック ---
  useEffect(() => {
    if (playingTrack && playIdx < playingTrack.length) {
      const timer = setTimeout(() => setPlayIdx(prev => prev + 1), 500); // 0.5秒間隔
      return () => clearTimeout(timer);
    } else if (playingTrack && playIdx >= playingTrack.length) {
      setPlayingTrack(null);
    }
  }, [playingTrack, playIdx]);

  // --- 投稿ロジック ---
  const handleRelease = async (type: 'BOX' | 'TRACK') => {
    const validPads = pads.filter(p => p !== null);
    if (validPads.length === 0) return;
    
    try {
      await supabase.from('mainline').insert([{
        description: JSON.stringify(validPads),
        image_url: type === 'BOX' ? 'BOX_TYPE' : 'TRACK_TYPE',
        owner_id: type === 'BOX' ? 'packer' : 'composer',
        created_at: new Date().toISOString()
      }]);
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const pickNode = (node: any) => {
    const emptyIdx = pads.findIndex(p => p === null);
    if (emptyIdx !== -1) {
      setPads(prev => { const n = [...prev]; n[emptyIdx] = node; return n; });
    }
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-x-hidden">
      <style jsx global>{`
        .stone-wall { column-count: 2; column-gap: 0.5rem; }
        @media (min-width: 768px) { .stone-wall { column-count: 4; } }
      `}</style>

      {/* FLASH LAYER (Track再生用) */}
      {playingTrack && (
        <div className="fixed inset-0 z-[5000] bg-black flex items-center justify-center">
          {playingTrack[playIdx]?.image_url ? (
            <img src={playingTrack[playIdx].image_url} className="w-full h-full object-contain" />
          ) : (
            <div className="text-white italic text-center px-10">{playingTrack[playIdx]?.description}</div>
          )}
        </div>
      )}

      <header className="py-10 flex justify-center sticky top-0 z-[50]">
        <h1 className="text-[10px] tracking-[1.5em] font-black uppercase opacity-20 bg-[#EBE8DB]/60 backdrop-blur-md px-10 py-4 rounded-full border border-black/5">room134</h1>
      </header>

      <main className={`p-2 transition-all duration-700 ${openedBox || isMPCVisible || playingTrack ? 'opacity-20 blur-3xl scale-95' : 'opacity-100'}`}>
        <div className="stone-wall max-w-[120rem] mx-auto">
          {nodes.map(node => {
            const isBox = node.image_url === 'BOX_TYPE';
            const isTrack = node.image_url === 'TRACK_TYPE';
            const contents = (isBox || isTrack) ? JSON.parse(node.description) : null;

            return (
              <div 
                key={node.id} 
                onClick={() => {
                  if (isBox) setOpenedBox(contents);
                  else if (isTrack) { setPlayingTrack(contents); setPlayIdx(0); }
                  else pickNode(node);
                }}
                className={`mb-2 break-inside-avoid rounded-sm overflow-hidden active:scale-95 transition-all cursor-pointer border border-black/5 relative 
                  ${isBox ? 'aspect-square bg-white/40 backdrop-blur-sm shadow-inner' : 
                    isTrack ? 'h-32 bg-black flex items-center justify-center' : 'bg-[#EDE9D9]'}`}
              >
                {isBox ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 space-y-3 opacity-30">
                    <div className="grid grid-cols-2 gap-1">{[...Array(4)].map((_,i)=><div key={i} className="w-3 h-3 bg-black rounded-full" />)}</div>
                    <div className="text-[9px] font-black uppercase tracking-[0.3em]">Box</div>
                  </div>
                ) : isTrack ? (
                  <div className="text-white/20 text-[9px] font-black uppercase tracking-[0.5em] italic">Play Track</div>
                ) : (
                  <>
                    {node.image_url && <img src={node.image_url} className="w-full h-auto grayscale-[20%]" />}
                    {node.description && <div className="p-4 text-[11px] italic opacity-50">{node.description}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* BOX OPENING LAYER (静的一覧) */}
      {openedBox && (
        <div className="fixed inset-0 z-[2000] bg-white/30 backdrop-blur-3xl flex flex-col animate-in fade-in duration-500">
          <header className="p-10 flex justify-between items-center max-w-4xl mx-auto w-full">
            <div className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30 italic">Pick from Box</div>
            <button onClick={() => setOpenedBox(null)} className="text-2xl font-light opacity-30 hover:opacity-100">✕</button>
          </header>
          <div className="flex-grow overflow-y-auto px-6 pb-40">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {openedBox.map((item: any, i: number) => (
                <div key={i} onClick={() => pickNode(item)} className="bg-white/40 p-1 rounded-sm shadow-sm active:scale-90 transition-transform cursor-copy group relative">
                  {item.image_url && <img src={item.image_url} className="w-full h-auto grayscale group-hover:grayscale-0" />}
                  {item.description && <div className="p-3 text-[10px] italic opacity-60">{item.description}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STUDIO PADS */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center space-x-6 z-[500]">
        <button onClick={() => setIsMPCVisible(!isMPCVisible)} className="px-14 py-6 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95">
          {isMPCVisible ? 'Close Room' : 'Enter Studio'}
        </button>
      </nav>

      {isMPCVisible && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center pb-32 p-4 pointer-events-none">
          <div className="bg-white/10 backdrop-blur-3xl w-full max-w-xs p-6 rounded-[3.5rem] shadow-2xl border border-white/20 pointer-events-auto animate-in slide-in-from-bottom-20">
            <div className="flex justify-between items-center mb-6 px-1">
              <button onClick={() => handleRelease('BOX')} className="text-[8px] font-black uppercase opacity-40 hover:opacity-100 transition-all bg-white px-3 py-1.5 rounded-full">Pack Box</button>
              <button onClick={() => handleRelease('TRACK')} className="text-[8px] font-black uppercase opacity-40 hover:opacity-100 transition-all bg-black text-white px-3 py-1.5 rounded-full">Release Track</button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {pads.map((pad, i) => (
                <div key={i} onClick={() => { if(pad) setPads(prev => { const n = [...prev]; n[i] = null; return n; }) }} className={`aspect-square rounded-2xl border transition-all flex items-center justify-center overflow-hidden relative active:scale-95 cursor-pointer ${pad ? 'bg-white/60 border-white/80' : 'bg-black/5 border-dashed border-black/10'}`}>
                  {pad?.image_url && <img src={pad.image_url} className="w-full h-full object-cover mix-blend-multiply opacity-50" />}
                  {!pad && <div className="text-[10px] opacity-10">＋</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}