'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Room134Serendipity() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [pads, setPads] = useState<(any | null)[]>(Array(8).fill(null));
  const [isMPCVisible, setIsMPCVisible] = useState(false);
  const [openedBox, setOpenedBox] = useState<any[] | null>(null);
  const [showSerendipity, setShowSerendipity] = useState(false);
  const [serenArticle, setSerenArticle] = useState<any>(null);
  const [canSample, setCanSample] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (data) setNodes(data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- 07734 ENGINE LOGIC ---
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
    const emptyIdx = pads.findIndex(p => p === null);
    if (emptyIdx !== -1) {
      setPads(prev => {
        const n = [...prev];
        n[emptyIdx] = { 
          id: `seren-${Date.now()}`, 
          description: `${serenArticle.title}\n\n${serenArticle.extract.substring(0, 300)}...`, 
          image_url: null 
        };
        return n;
      });
    }
    setShowSerendipity(false);
  };

  const pickNode = (node: any) => {
    const emptyIdx = pads.findIndex(p => p === null);
    if (emptyIdx !== -1) {
      setPads(prev => { const n = [...prev]; n[emptyIdx] = node; return n; });
    }
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-x-hidden selection:bg-black selection:text-white">
      <style jsx global>{`
        .stone-wall { column-count: 2; column-gap: 0.5rem; }
        @media (min-width: 768px) { .stone-wall { column-count: 4; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* HEADER */}
      <header className="py-10 flex justify-center sticky top-0 z-[50]">
        <h1 className="text-[10px] tracking-[1.5em] font-black uppercase opacity-20 bg-[#EBE8DB]/60 backdrop-blur-md px-10 py-4 rounded-full border border-black/5 transition-all hover:opacity-100">room134</h1>
      </header>

      {/* MAIN WALL */}
      <main className={`p-2 transition-all duration-700 ${openedBox || isMPCVisible || showSerendipity ? 'opacity-20 blur-3xl scale-95' : 'opacity-100'}`}>
        <div className="stone-wall max-w-[120rem] mx-auto">
          {nodes.map(node => {
            const isBox = node.image_url === 'BOX_TYPE';
            const contents = isBox ? JSON.parse(node.description) : [];
            return (
              <div 
                key={node.id} 
                onClick={() => isBox ? setOpenedBox(contents) : pickNode(node)}
                className={`mb-2 break-inside-avoid rounded-sm overflow-hidden active:scale-95 transition-all cursor-pointer border border-black/5 relative ${isBox ? 'aspect-square bg-white/40 backdrop-blur-sm' : 'bg-[#EDE9D9]'}`}
              >
                {isBox ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 space-y-3 opacity-30">
                    <div className="grid grid-cols-2 gap-1">{[...Array(4)].map((_,i)=><div key={i} className="w-4 h-4 bg-black rounded-full" />)}</div>
                    <div className="text-[9px] font-black uppercase tracking-[0.3em]">Material Box</div>
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

      {/* 07734: SERENDIPITY ENGINE (WITH DISCARD) */}
      {showSerendipity && (
        <div className="fixed inset-0 bg-black z-[4000] flex flex-col text-gray-400 font-mono animate-in fade-in duration-500">
          <header className="p-6 border-b border-white/5 flex justify-between text-[9px] tracking-widest text-white/20">
            <div>ENGINE_ID: 07734</div>
            <button onClick={() => setShowSerendipity(false)} className="hover:text-white transition-colors">EXIT</button>
          </header>
          
          {!serenArticle ? (
            <div className="flex-grow flex items-center justify-center">
              <button onClick={fetchRandomSerendipity} className="text-white border border-white/10 px-12 py-6 hover:bg-white hover:text-black transition-all tracking-[1em] text-xs">INITIALIZE</button>
            </div>
          ) : (
            <main className="flex-grow flex flex-col max-w-2xl mx-auto w-full p-8 overflow-hidden">
              <h2 className="text-2xl text-white mb-10 border-l-2 border-white pl-6">{serenArticle.title}</h2>
              <div ref={scrollRef} onScroll={handleSerenScroll} className="flex-grow overflow-y-auto pr-4 leading-loose text-sm space-y-8 no-scrollbar scroll-smooth">
                {serenArticle.extract.split('\n').map((p:string, i:number) => <p key={i}>{p}</p>)}
                <div className="h-40 border-t border-white/5 pt-10 text-[8px] text-center opacity-20">--- END OF FRAGMENT ---</div>
              </div>
              
              <footer className="h-32 flex flex-col items-center justify-center mt-6 space-y-6">
                {canSample ? (
                  <button onClick={sampleFromSeren} className="w-full bg-white text-black py-5 text-[10px] font-black tracking-widest animate-in slide-in-from-bottom-2">SAMPLE INTO PAD</button>
                ) : (
                  <div className="text-[8px] opacity-20 tracking-[0.3em] animate-pulse uppercase">Read to the bottom to sample</div>
                )}
                
                {/* 💡 DISCARD: 次のランダム記事へスキップ */}
                <button 
                  onClick={fetchRandomSerendipity} 
                  className="text-[9px] uppercase tracking-[0.4em] opacity-30 hover:opacity-100 hover:text-red-400 transition-all border-b border-transparent hover:border-red-400/30 pb-1"
                >
                  Discard & Next Fragment
                </button>
              </footer>
            </main>
          )}
        </div>
      )}

      {/* BOX OPENING LAYER */}
      {openedBox && (
        <div className="fixed inset-0 z-[2000] bg-white/30 backdrop-blur-3xl flex flex-col animate-in fade-in duration-500">
          <header className="p-10 flex justify-between items-center max-w-4xl mx-auto w-full">
            <div className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30 italic">Pick your fragments</div>
            <button onClick={() => setOpenedBox(null)} className="text-2xl font-light opacity-30 hover:opacity-100">✕</button>
          </header>
          <div className="flex-grow overflow-y-auto px-6 pb-40 no-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {openedBox.map((item, i) => (
                <div key={i} onClick={() => pickNode(item)} className="bg-white/40 p-1 rounded-sm shadow-sm active:scale-90 transition-transform cursor-copy group relative">
                  {item.image_url && <img src={item.image_url} className="w-full h-auto grayscale group-hover:grayscale-0 transition-all" />}
                  {item.description && <div className="p-3 text-[10px] italic opacity-60 leading-tight">{item.description}</div>}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5">
                    <div className="bg-black text-white text-[8px] px-3 py-1 rounded-full uppercase tracking-widest font-black shadow-xl">Pick</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STUDIO CONTROLS */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center space-x-6 z-[500]">
        <button onClick={() => setIsMPCVisible(!isMPCVisible)} className="px-14 py-6 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all">
          {isMPCVisible ? 'Close Pad' : 'Your Studio'}
        </button>
      </nav>

      {isMPCVisible && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center pb-32 p-4 pointer-events-none">
          <div className="bg-white/10 backdrop-blur-3xl w-full max-w-xs p-6 rounded-[3.5rem] shadow-2xl border border-white/20 pointer-events-auto animate-in slide-in-from-bottom-20">
            <div className="flex justify-between items-center mb-6 px-1">
              <div className="text-[8px] font-black uppercase tracking-widest opacity-20 italic">Studio Pad</div>
              <button onClick={() => setShowSerendipity(true)} className="text-[9px] font-black uppercase bg-white/40 px-4 py-1.5 rounded-full hover:bg-white transition-all">07734</button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {pads.map((pad, i) => (
                <div key={i} onMouseDown={() => { if(pad) setPads(prev => { const n = [...prev]; n[i] = null; return n; }) }} className={`aspect-square rounded-2xl border transition-all flex items-center justify-center overflow-hidden relative active:scale-95 cursor-pointer ${pad ? 'bg-white/60 border-white/80' : 'bg-black/5 border-dashed border-black/10'}`}>
                  {pad?.image_url && <img src={pad.image_url} className="w-full h-full object-cover mix-blend-multiply opacity-50" />}
                  {!pad && <div className="text-[10px] opacity-10">＋</div>}
                  {pad && <div className="absolute top-1.5 right-1.5 w-1 h-1 bg-black/10 rounded-full" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}