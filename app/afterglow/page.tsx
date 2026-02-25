"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sn_NxTgpLdu_ZFZ5-dcriA_Z5NYkr-_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const LIFESPAN_MS = 168 * 60 * 60 * 1000;

export default function EngineSubtleBite() {
  const [mode, setMode] = useState('MAIN'); 
  const [streetPost, setStreetPost] = useState<any>(null);
  const [keeps, setKeeps] = useState<any[]>([]);
  const [wikiData, setWikiData] = useState({ title: '', content: '', bites_count: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBiting, setIsBiting] = useState(false);

  const [postInput, setPostInput] = useState({ title: '', body: '', image: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- SUBTLE ROUND BITE (小さめの噛み跡) ---
  const getBiteMask = (count: number) => {
    if (!count || count === 0) return {};
    // 半径を30pxに縮小。角ギリギリをえぐる。
    return {
      maskImage: 'radial-gradient(circle 30px at calc(100% - 2px) 2px, transparent 100%, black 100%)',
      WebkitMaskImage: 'radial-gradient(circle 30px at calc(100% - 2px) 2px, transparent 100%, black 100%)',
    };
  };

  const triggerBiteEffect = () => {
    setIsBiting(true);
    setTimeout(() => setIsBiting(false), 200);
  };

  const handleBite = async () => {
    triggerBiteEffect();
    if (mode === 'MAIN' && streetPost) {
      const newCount = (streetPost.bites_count || 0) + 1;
      await supabase.from('posts').update({ bites_count: newCount }).eq('id', streetPost.id);
      setStreetPost({ ...streetPost, bites_count: newCount });
    } else if (mode === 'WIKI') {
      setWikiData(prev => ({ ...prev, bites_count: (prev.bites_count || 0) + 1 }));
    }
  };

  const handleKeep = async (item: any) => {
    if (!item) return;
    const { error } = await supabase.from('keeps').insert([{ 
      title: item.title, body: item.body || item.content, image: item.image || '' 
    }]);
    if (!error) handleBite();
  };

  const handlePost = async () => {
    if (!postInput.title && !postInput.body && !postInput.image) return;
    setIsLoading(true);
    const { error } = await supabase.from('posts').insert([{ 
      title: postInput.title || 'UNTITLED', body: postInput.body, image: postInput.image 
    }]);
    if (!error) { setPostInput({ title: '', body: '', image: '' }); setMode('MAIN'); fetchStreet(); }
    setIsLoading(false);
  };

  const fetchStreet = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (data) {
      const alive = data.filter(p => (new Date().getTime() - new Date(p.created_at).getTime()) < LIFESPAN_MS);
      setStreetPost(alive.length > 0 ? alive[Math.floor(Math.random() * alive.length)] : null);
    }
    setIsLoading(false);
  }, []);

  const fetchWiki = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/random/summary`);
      const data = await res.json();
      setWikiData({ title: data.titles.display.replace(/<[^>]*>/g, ''), content: data.extract, bites_count: 0 });
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => {
    if (mode === 'KEEP') {
      supabase.from('keeps').select('*').order('created_at', { ascending: false }).then(({data}) => data && setKeeps(data));
    }
    if (mode === 'MAIN') fetchStreet();
    if (mode === 'WIKI' && !wikiData.title) fetchWiki();
  }, [mode, fetchStreet]);

  return (
    <div className="bg-[#1a1a1a] text-black font-mono h-[100dvh] flex flex-col overflow-hidden select-none border-x border-black">
      {/* Mini Header */}
      <header className="h-8 border-b border-black flex items-center justify-between px-4 shrink-0 bg-white z-20">
        <h1 className="text-sm font-black italic tracking-tighter">07734</h1>
        <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">{mode}</span>
      </header>

      {/* Main Container - Gray background to see the bites */}
      <main className="flex-grow relative flex flex-col overflow-hidden bg-[#dcdcdc] p-2">
        {(mode === 'MAIN' || mode === 'WIKI' || mode === 'KEEP') && (
          <div className={`flex flex-col h-full relative transition-transform duration-75 ${isBiting ? 'scale-[0.99] rotate-1' : 'scale-100 rotate-0'}`}>
            <div 
              style={mode === 'KEEP' ? {} : getBiteMask(mode === 'MAIN' ? streetPost?.bites_count : wikiData.bites_count)}
              className="flex-grow overflow-y-auto custom-scrollbar p-6 bg-white shadow-lg relative border border-gray-400"
            >
              {(mode === 'MAIN' ? streetPost : (mode === 'WIKI' ? wikiData : (keeps.length > 0 ? keeps[currentIndex % keeps.length] : null))) ? (
                <article className={isBiting ? 'animate-pulse' : ''}>
                  {/* Images are now FULL COLOR */}
                  {(mode === 'MAIN' ? streetPost : (mode === 'WIKI' ? null : keeps[currentIndex % (keeps.length || 1)]))?.image && (
                    <img src={(mode === 'MAIN' ? streetPost : keeps[currentIndex % (keeps.length || 1)]).image} className="w-full h-auto border border-black mb-6 block" alt="fragment" />
                  )}
                  <h2 className="text-2xl font-black mb-6 leading-tight break-all italic">
                    {(mode === 'MAIN' ? streetPost : (mode === 'WIKI' ? wikiData : keeps[currentIndex % (keeps.length || 1)])).title}
                  </h2>
                  <p className="text-sm font-bold whitespace-pre-wrap leading-relaxed pb-32">
                    {(mode === 'MAIN' ? streetPost?.body : (mode === 'WIKI' ? wikiData.content : keeps[currentIndex % (keeps.length || 1)]?.body))}
                  </p>
                </article>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] italic opacity-40 uppercase">Void_Signal</div>
              )}
            </div>

            {/* Tiny Action Bar */}
            <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-between items-center bg-transparent pointer-events-none">
              <button 
                onClick={mode === 'MAIN' ? fetchStreet : (mode === 'WIKI' ? fetchWiki : () => setCurrentIndex(prev => prev + 1))} 
                className="pointer-events-auto h-7 px-4 bg-black text-white text-[8px] font-black uppercase tracking-tighter active:bg-gray-800 transition-all"
              >
                {mode === 'KEEP' ? 'Flip' : 'Next'}
              </button>
              
              <div className="pointer-events-auto flex gap-1">
                <button onClick={handleBite} className="h-7 px-3 border border-black bg-white text-[8px] font-black italic active:bg-black active:text-white">BITE</button>
                <button onClick={() => handleKeep(mode === 'MAIN' ? streetPost : (mode === 'WIKI' ? wikiData : null))} className="h-7 px-3 border border-black bg-white text-[8px] font-black active:bg-black active:text-white uppercase">KEEP</button>
              </div>
            </div>
          </div>
        )}

        {/* POST MODE */}
        {mode === 'POST' && (
          <div className="h-full flex flex-col p-6 bg-white border border-black">
             <input value={postInput.title} onChange={(e) => setPostInput({...postInput, title: e.target.value})} placeholder="TITLE..." className="border-b border-black py-2 outline-none font-black text-lg uppercase mb-6" />
             <textarea value={postInput.body} onChange={(e) => setPostInput({...postInput, body: e.target.value})} placeholder="Body..." className="flex-grow outline-none text-sm font-bold resize-none mb-6" />
             <div className="flex gap-2">
               <button onClick={() => fileInputRef.current?.click()} className="h-7 px-4 border border-black text-[8px] font-black uppercase">Img</button>
               <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e)=>{const f=e.target.files?.[0]; if(f){const r=new FileReader(); r.onload=()=>setPostInput({...postInput,image:r.result as string}); r.readAsDataURL(f);}}} />
               <button onClick={handlePost} className="flex-grow h-7 bg-black text-white text-[8px] font-black uppercase" disabled={isLoading}>Deposit</button>
             </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-10 border-t border-black flex bg-white shrink-0">
        {['MAIN', 'POST', 'WIKI', 'KEEP'].map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 flex items-center justify-center border-r border-black last:border-0 ${mode === m ? 'bg-black text-white' : 'bg-white'}`}>
            <span className="text-[9px] font-black tracking-widest uppercase">{m}</span>
          </button>
        ))}
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: black; }
      `}</style>
    </div>
  );
}