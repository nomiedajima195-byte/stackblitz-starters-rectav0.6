'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIG ---
const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Room134() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [pads, setPads] = useState<(any | null)[]>(Array(8).fill(null));
  const [activePad, setActivePad] = useState<number | null>(null);
  const [track, setTrack] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isMPCVisible, setIsMPCVisible] = useState(false);
  const [showInput, setShowInput] = useState<{file: File | null} | null>(null);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<any[] | null>(null);
  const [playIdx, setPlayIdx] = useState(0);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (data) setNodes(data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 1. 通常投稿
  const handleUpload = async () => {
    if (!showInput && !inputText.trim()) return;
    setIsProcessing(true);
    let publicUrl = null;
    try {
      if (showInput?.file) {
        const file = showInput.file;
        const fileName = `${Date.now()}-${file.name}`;
        await supabase.storage.from('images').upload(fileName, file);
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }
      await supabase.from('mainline').insert([{
        image_url: publicUrl,
        description: inputText.trim() || null,
        owner_id: 'guest',
        created_at: new Date().toISOString()
      }]);
      setShowInput(null); setInputText(''); fetchData();
    } catch (e: any) { alert(e.message); } finally { setIsProcessing(false); }
  };

  // 2. リミックス・フォーク保存
  const archiveTrack = async () => {
    if (track.length === 0) return;
    setIsProcessing(true);
    try {
      await supabase.from('mainline').insert([{
        description: JSON.stringify(track),
        image_url: 'TRACK_TYPE',
        owner_id: 'room134_session', 
        created_at: new Date().toISOString()
      }]);
      setTrack([]); setIsRecording(false); setIsMPCVisible(false); setPads(Array(8).fill(null)); fetchData();
    } catch (e: any) { alert(e.message); } finally { setIsProcessing(false); }
  };

  const triggerPad = (idx: number) => {
    if (!pads[idx]) return;
    setActivePad(idx);
    if (isRecording && track.length < 32) setTrack(prev => [...prev, pads[idx]]);
    setTimeout(() => setActivePad(null), 120);
  };

  useEffect(() => {
    if (playingTrack && playIdx < playingTrack.length) {
      const timer = setTimeout(() => setPlayIdx(prev => prev + 1), 600);
      return () => clearTimeout(timer);
    } else if (playingTrack && playIdx >= playingTrack.length) {
      setPlayingTrack(null);
    }
  }, [playingTrack, playIdx]);

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-x-hidden selection:bg-black selection:text-white">
      <style jsx global>{`
        .stone-wall { column-count: 2; column-gap: 0.5rem; }
        @media (min-width: 768px) { .stone-wall { column-count: 4; } }
      `}</style>

      {/* FLASH LAYER */}
      {(activePad !== null || playingTrack) && (
        <div className="fixed inset-0 z-[3000] bg-black flex items-center justify-center animate-in fade-in duration-75">
          {(activePad !== null ? pads[activePad] : playingTrack?.[playIdx])?.image_url ? 
            <img src={(activePad !== null ? pads[activePad] : playingTrack?.[playIdx]).image_url} className="w-full h-full object-contain" /> : 
            <div className="text-white text-3xl italic px-12 text-center font-light">{(activePad !== null ? pads[activePad] : playingTrack?.[playIdx])?.description}</div>
          }
        </div>
      )}

      {/* HEADER: Updated to room134 */}
      <header className="py-10 flex justify-center sticky top-0 z-[50]">
        <h1 className="text-[10px] tracking-[1.5em] font-black uppercase opacity-20 bg-[#EBE8DB]/60 backdrop-blur-md px-10 py-4 rounded-full border border-black/5 transition-all hover:opacity-100 cursor-default">
          room134
        </h1>
      </header>

      {/* MAIN WALL */}
      <main className={`p-2 transition-all duration-1000 ${isMPCVisible || showInput ? 'opacity-30 blur-2xl scale-[0.97]' : 'opacity-100'}`}>
        <div className="stone-wall max-w-[120rem] mx-auto">
          {nodes.map(node => {
            const isTrack = node.image_url === 'TRACK_TYPE';
            const sequence = isTrack ? JSON.parse(node.description) : [];
            const thumb = isTrack && sequence[0]?.image_url;

            return (
              <div 
                key={node.id} 
                onClick={() => {
                  if (isTrack) {
                    setPlayingTrack(sequence); setPlayIdx(0);
                    setTrack([...sequence]);
                    const unique = Array.from(new Set(sequence.map((s:any)=>s.id))).map(id=>sequence.find((s:any)=>s.id===id)).slice(0,8);
                    setPads(prev => { const next = [...prev]; unique.forEach((n,i)=>next[i]=n); return next; });
                    setIsMPCVisible(true);
                  } else {
                    setPads(prev => { const next = [...prev]; const e = next.findIndex(p=>p===null); next[e===-1?track.length%8:e]=node; return next; });
                    setIsMPCVisible(true);
                  }
                }}
                className={`mb-2 break-inside-avoid rounded-sm overflow-hidden active:scale-95 transition-all cursor-pointer border border-black/5 relative ${isTrack ? 'h-48 bg-[#111]' : 'bg-[#EDE9D9] shadow-sm'}`}
              >
                {isTrack ? (
                  <>
                    {thumb && <img src={thumb} className="absolute inset-0 w-full h-full object-cover grayscale opacity-40 hover:opacity-80 transition-all duration-700" />}
                    <div className="absolute inset-0 flex items-center justify-center"><div className="text-white text-4xl font-thin opacity-10 italic tracking-tighter">Inherit</div></div>
                    <div className="bg-gradient-to-t from-black/80 to-transparent p-4 relative z-10 w-full h-full flex flex-col justify-end">
                      <div className="text-[7px] text-white/50 uppercase font-black tracking-[0.3em]">{sequence.length} / 32 Beats</div>
                    </div>
                  </>
                ) : (
                  <>
                    {node.image_url && <img src={node.image_url} className="w-full h-auto grayscale-[20%] hover:grayscale-0 transition-all duration-500" />}
                    {node.description && <div className="p-4 text-[11px] italic opacity-60 leading-relaxed tracking-tight">{node.description}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* FOOTER NAV */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center space-x-6 z-[500]">
        <button onClick={() => setShowInput({file: null})} className="bg-white/30 backdrop-blur-2xl w-16 h-16 rounded-full border border-white/40 text-2xl opacity-40 hover:opacity-100 transition-all flex items-center justify-center font-light shadow-xl">◎</button>
        <button onClick={() => setIsMPCVisible(!isMPCVisible)} className="px-10 py-4 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all">
          {isMPCVisible ? 'Close Room' : 'Enter Studio'}
        </button>
      </nav>

      {/* POST MODAL */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/98 backdrop-blur-3xl z-[2000] flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-500">
          <textarea autoFocus value={inputText} onChange={(e)=>setInputText(e.target.value)} placeholder="..." className="w-full max-w-xl bg-transparent border-none text-4xl italic outline-none text-center h-48 font-light placeholder:opacity-5" />
          <div className="mt-12 flex items-center space-x-12">
            <button onClick={()=>setShowInput(null)} className="text-[9px] uppercase opacity-20 font-black tracking-widest">Discard</button>
            <label className="text-3xl opacity-20 cursor-pointer hover:opacity-100 transition-all">📸<input type="file" className="hidden" accept="image/*" onChange={(e)=>setShowInput({file:e.target.files?.[0]||null})} /></label>
            <button onClick={handleUpload} className="text-[9px] font-black uppercase border-b border-black/20 pb-1 tracking-widest">Archive</button>
          </div>
        </div>
      )}

      {/* STUDIO MODAL */}
      {isMPCVisible && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center pb-32 p-4 pointer-events-none">
          <div className="bg-white/10 backdrop-blur-3xl w-full max-w-xs p-7 rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.2)] border border-white/20 pointer-events-auto animate-in slide-in-from-bottom-20 duration-500">
            <div className="flex justify-between items-center mb-7 px-2">
              <button onClick={() => setIsRecording(!isRecording)} className={`px-5 py-2 rounded-full border text-[8px] font-black uppercase transition-all ${isRecording ? 'bg-red-500 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'border-black/5 text-black/30'}`}>
                {isRecording ? 'Session On' : 'Standby'}
              </button>
              <div className="text-[8px] text-black/20 font-mono tracking-tighter uppercase">{track.length} / 32 Nodes</div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-7">
              {pads.map((pad, i) => (
                <div key={i} onMouseDown={() => triggerPad(i)} className={`aspect-square rounded-[1.2rem] border transition-all flex items-center justify-center overflow-hidden relative active:scale-90 ${pad ? 'bg-white/60 border-white/80 shadow-sm ring-1 ring-black/5' : 'bg-black/[0.03] border-dashed border-black/5'}`}>
                  {pad?.image_url && <img src={pad.image_url} className="w-full h-full object-cover mix-blend-multiply opacity-60" />}
                  {pad && <div className="absolute top-1.5 right-1.5 w-1 h-1 bg-black/10 rounded-full" />}
                </div>
              ))}
            </div>
            <button onClick={archiveTrack} disabled={track.length === 0} className="w-full py-5 bg-black text-white text-[9px] font-black uppercase tracking-[0.5em] rounded-2xl disabled:opacity-5 active:scale-[0.98] transition-all shadow-xl">
              Fork & Release
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL LOADING */}
      {isProcessing && (
        <div className="fixed inset-0 bg-[#EBE8DB]/60 backdrop-blur-md z-[5000] flex flex-col items-center justify-center">
          <div className="text-[10px] tracking-[1.5em] font-black uppercase italic animate-pulse opacity-40">Connecting Room...</div>
        </div>
      )}
    </div>
  );
}