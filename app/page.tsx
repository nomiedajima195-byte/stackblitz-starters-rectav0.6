'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIG ---
const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Room134Final() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [pads, setPads] = useState<(any | null)[]>(Array(8).fill(null));
  const [activePad, setActivePad] = useState<number | null>(null);
  const [track, setTrack] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isMPCVisible, setIsMPCVisible] = useState(false);
  const [showInput, setShowInput] = useState<{file: File | null, targetPad?: number} | null>(null);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<any[] | null>(null);
  const [playIdx, setPlayIdx] = useState(0);

  // 07734 (Serendipity Engine) States
  const [showSerendipity, setShowSerendipity] = useState(false);
  const [serenArticle, setSerenArticle] = useState<any>(null);
  const [canSample, setCanSample] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (data) setNodes(data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- 07734 LOGIC ---
  const fetchRandomSerendipity = async () => {
    setSerenArticle(null); setCanSample(false);
    try {
      const res = await fetch(`https://ja.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=1&origin=*`);
      const data = await res.json();
      const pageid = data.query.random[0].id;
      const contentRes = await fetch(`https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext&pageids=${pageid}&origin=*`);
      const contentData = await contentRes.json();
      setSerenArticle(contentData.query.pages[pageid]);
    } catch (e) { console.error(e); }
  };

  const handleSerenScroll = () => {
    const el = scrollRef.current;
    if (el && el.scrollHeight - el.scrollTop <= el.clientHeight + 20) setCanSample(true);
  };

  const sampleFromSeren = () => {
    if (!canSample || !serenArticle) return;
    const newNode = { id: `seren-${Date.now()}`, description: `${serenArticle.title}\n\n${serenArticle.extract.substring(0, 200)}...`, image_url: null };
    const emptyIdx = pads.findIndex(p => p === null);
    if (emptyIdx !== -1) {
      setPads(prev => { const n = [...prev]; n[emptyIdx] = newNode; return n; });
    }
    setShowSerendipity(false);
  };

  // --- STUDIO LOGIC ---
  const resetStudio = () => {
    setTrack([]);
    setPads(Array(8).fill(null));
    setIsRecording(false);
  };

  const handleUpload = async () => {
    if (!inputText.trim() && !showInput?.file) return;
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
      
      const newNode = {
        image_url: publicUrl,
        description: inputText.trim() || null,
        owner_id: 'guest',
        created_at: new Date().toISOString()
      };

      // 💡 MPC直割当モードならパッドに入れるだけ。そうでなければDBへ。
      if (showInput?.targetPad !== undefined) {
        setPads(prev => { const n = [...prev]; n[showInput.targetPad!] = newNode; return n; });
      } else {
        await supabase.from('mainline').insert([newNode]);
        fetchData();
      }
      setShowInput(null); setInputText('');
    } catch (e: any) { alert(e.message); } finally { setIsProcessing(false); }
  };

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
      resetStudio(); setIsMPCVisible(false); fetchData();
    } catch (e: any) { alert(e.message); } finally { setIsProcessing(false); }
  };

  const triggerPad = (idx: number) => {
    if (!pads[idx]) {
      setShowInput({ file: null, targetPad: idx });
      return;
    }
    setActivePad(idx);
    if (isRecording && track.length < 32) setTrack(prev => [...prev, pads[idx]]);
    setTimeout(() => setActivePad(null), 120);
  };

  // 💡 再生中のノードを拾う（Capture）
  const captureCurrentNode = () => {
    if (!playingTrack) return;
    const currentNode = playingTrack[playIdx];
    const emptyIdx = pads.findIndex(p => p === null);
    if (emptyIdx !== -1) {
      setPads(prev => { const n = [...prev]; n[emptyIdx] = currentNode; return n; });
    }
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* FLASH & PLAYBACK LAYER */}
      {(activePad !== null || playingTrack) && (
        <div className="fixed inset-0 z-[3000] bg-black flex flex-col items-center justify-center">
          <div className="flex-grow flex items-center justify-center w-full">
            {(activePad !== null ? pads[activePad] : playingTrack?.[playIdx])?.image_url ? 
              <img src={(activePad !== null ? pads[activePad] : playingTrack?.[playIdx]).image_url} className="w-full h-full object-contain" /> : 
              <div className="text-white text-3xl italic px-12 text-center font-light leading-relaxed">{(activePad !== null ? pads[activePad] : playingTrack?.[playIdx])?.description}</div>
            }
          </div>
          {playingTrack && (
            <button onClick={captureCurrentNode} className="mb-20 px-8 py-3 border border-white/20 text-white/40 text-[10px] uppercase tracking-widest hover:text-white hover:border-white transition-all rounded-full z-[3001]">Capture Node</button>
          )}
        </div>
      )}

      {/* HEADER */}
      <header className="py-10 flex justify-center sticky top-0 z-[50]">
        <h1 className="text-[10px] tracking-[1.5em] font-black uppercase opacity-20 bg-[#EBE8DB]/60 backdrop-blur-md px-10 py-4 rounded-full border border-black/5">room134</h1>
      </header>

      {/* MAIN WALL */}
      <main className={`p-2 transition-all duration-1000 ${(isMPCVisible || showInput || showSerendipity) ? 'opacity-20 blur-3xl scale-90' : 'opacity-100'}`}>
        <div className="stone-wall max-w-[120rem] mx-auto">
          {nodes.map(node => {
            const isTrack = node.image_url === 'TRACK_TYPE';
            const sequence = isTrack ? JSON.parse(node.description) : [];
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
                className={`mb-2 break-inside-avoid rounded-sm overflow-hidden active:scale-95 transition-all cursor-pointer border border-black/5 relative ${isTrack ? 'h-48 bg-[#0a0a0a]' : 'bg-[#EDE9D9]'}`}
              >
                {isTrack ? (
                  <div className="p-6 h-full flex flex-col justify-end">
                    <div className="absolute inset-0 flex items-center justify-center opacity-5 text-6xl italic font-black text-white">FORK</div>
                    <div className="text-[7px] text-white/30 uppercase font-black tracking-widest mb-1">Session Node</div>
                    <div className="text-[10px] italic text-white/60">{sequence.length} fragments</div>
                  </div>
                ) : (
                  <>
                    {node.image_url && <img src={node.image_url} className="w-full h-auto grayscale-[20%]" />}
                    {node.description && <div className="p-4 text-[11px] italic opacity-50 leading-relaxed">{node.description}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* FOOTER NAV */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center space-x-6 z-[500]">
        <button onClick={() => setShowInput({file: null})} className="bg-white/30 backdrop-blur-2xl w-16 h-16 rounded-full border border-white/40 text-2xl opacity-40 hover:opacity-100 transition-all flex items-center justify-center shadow-xl">◎</button>
        <button onClick={() => setIsMPCVisible(!isMPCVisible)} className="px-12 py-5 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all">
          {isMPCVisible ? 'Studio Close' : 'Studio Open'}
        </button>
      </nav>

      {/* 07734: SERENDIPITY ENGINE MODAL */}
      {showSerendipity && (
        <div className="fixed inset-0 bg-black z-[4000] flex flex-col text-gray-400 font-mono">
          <header className="p-6 border-b border-white/5 flex justify-between text-[9px] tracking-widest text-white/20">
            <div>ENGINE_ID: 07734</div>
            <button onClick={() => setShowSerendipity(false)} className="hover:text-white transition-colors">EXIT_STRICT_MODE</button>
          </header>
          {!serenArticle ? (
            <div className="flex-grow flex items-center justify-center">
              <button onClick={fetchRandomSerendipity} className="text-white border border-white/20 px-12 py-6 hover:bg-white hover:text-black transition-all tracking-[1em] text-xs">INITIALIZE</button>
            </div>
          ) : (
            <main className="flex-grow flex flex-col max-w-2xl mx-auto w-full p-8 overflow-hidden">
              <h2 className="text-2xl text-white mb-10 border-l-2 border-white pl-6">{serenArticle.title}</h2>
              <div ref={scrollRef} onScroll={handleSerenScroll} className="flex-grow overflow-y-auto pr-4 leading-loose text-sm space-y-8 no-scrollbar">
                {serenArticle.extract.split('\n').map((p:string, i:number) => <p key={i}>{p}</p>)}
                <div className="h-40 border-t border-white/5 pt-10 text-[8px] text-center opacity-20">--- END OF FRAGMENT ---</div>
              </div>
              <div className="h-32 flex items-center justify-center mt-6">
                {canSample ? (
                  <button onClick={sampleFromSeren} className="w-full bg-white text-black py-5 text-[10px] font-black tracking-widest animate-in fade-in duration-1000">SAMPLE INTO PAD</button>
                ) : (
                  <div className="text-[8px] opacity-20 tracking-[0.3em] animate-pulse">READ TO THE BOTTOM TO SAMPLE</div>
                )}
              </div>
            </main>
          )}
        </div>
      )}

      {/* STUDIO MODAL */}
      {isMPCVisible && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center pb-32 p-4 pointer-events-none">
          <div className="bg-white/10 backdrop-blur-3xl w-full max-w-xs p-6 rounded-[3rem] shadow-2xl border border-white/20 pointer-events-auto animate-in slide-in-from-bottom-20 duration-500">
            <div className="flex justify-between items-center mb-6 px-1">
              <button onClick={() => setIsRecording(!isRecording)} className={`px-4 py-2 rounded-full border text-[8px] font-black uppercase transition-all ${isRecording ? 'bg-red-500 text-white border-red-500 shadow-lg' : 'border-black/5 text-black/20'}`}>
                {isRecording ? 'Rec On' : 'Standby'}
              </button>
              <button onClick={resetStudio} className="text-[8px] font-black uppercase tracking-widest opacity-20 hover:opacity-100 transition-opacity">New Session</button>
            </div>
            
            <div className="grid grid-cols-4 gap-3 mb-6">
              {pads.map((pad, i) => (
                <div key={i} onMouseDown={() => triggerPad(i)} className={`aspect-square rounded-2xl border transition-all flex items-center justify-center overflow-hidden relative active:scale-90 ${pad ? 'bg-white/60 border-white/80 shadow-sm' : 'bg-black/5 border-dashed border-black/10'}`}>
                  {pad?.image_url && <img src={pad.image_url} className="w-full h-full object-cover mix-blend-multiply opacity-50" />}
                  {!pad && <div className="text-[10px] opacity-10">＋</div>}
                  {pad && <div className="absolute top-1.5 right-1.5 w-1 h-1 bg-black/10 rounded-full" />}
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <button onClick={() => setShowSerendipity(true)} className="flex-1 py-4 bg-white/20 text-black/60 text-[8px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/40 transition-all">07734</button>
              <button onClick={archiveTrack} disabled={track.length === 0} className="flex-[2] py-4 bg-black text-white text-[9px] font-black uppercase tracking-[0.4em] rounded-2xl disabled:opacity-5 shadow-xl">Release</button>
            </div>
          </div>
        </div>
      )}

      {/* INPUT MODAL */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/98 backdrop-blur-3xl z-[2000] flex flex-col items-center justify-center p-8">
          <textarea autoFocus value={inputText} onChange={(e)=>setInputText(e.target.value)} placeholder="..." className="w-full max-w-xl bg-transparent border-none text-3xl italic outline-none text-center h-48 font-light" />
          <div className="mt-12 flex items-center space-x-12">
            <button onClick={()=>setShowInput(null)} className="text-[9px] uppercase opacity-20 font-black">Discard</button>
            <label className="text-3xl opacity-20 cursor-pointer hover:opacity-100 transition-all">📸<input type="file" className="hidden" accept="image/*" onChange={(e)=>setShowInput({...showInput, file:e.target.files?.[0]||null})} /></label>
            <button onClick={handleUpload} className="text-[9px] font-black uppercase border-b border-black/20 pb-1">Set Pad</button>
          </div>
        </div>
      )}
    </div>
  );
}