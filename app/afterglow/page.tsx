"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sn_NxTgpLdu_ZFZ5-dcriA_Z5NYkr-_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const LIFESPAN_MS = 168 * 60 * 60 * 1000;

export default function EngineRoundBite() {
  const [mode, setMode] = useState('MAIN'); 
  const [streetPost, setStreetPost] = useState<any>(null);
  const [keeps, setKeeps] = useState<any[]>([]);
  const [wikiData, setWikiData] = useState({ title: '', content: '', bites_count: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBiting, setIsBiting] = useState(false);

  const [postInput, setPostInput] = useState({ title: '', body: '', image: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ROUND BITE STYLE (Masking) ---
  const getBiteMask = (count: number) => {
    if (!count || count === 0) return {};
    // 右上を半径80pxの円でくり抜く
    return {
      maskImage: 'radial-gradient(circle 80px at calc(100% - 10px) 10px, transparent 100%, black 100%)',
      WebkitMaskImage: 'radial-gradient(circle 80px at calc(100% - 10px) 10px, transparent 100%, black 100%)',
    };
  };

  const triggerBiteEffect = () => {
    setIsBiting(true);
    setTimeout(() => setIsBiting(false), 300);
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
    if (!error) { handleBite(); }
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
    <div className="bg-white text-black font-mono h-[100dvh] flex flex-col overflow-hidden select-none border-x-2 border-black">
      <header className="h-10 border-b-2 border-black flex items-center justify-between px-4 bg-white z-20 shrink-0">
        <h1 className="text-xl font-black italic tracking-tighter uppercase">07734</h1>
        <span className="text-[10px] font-black uppercase border-2 border-black px-2 tracking-tighter bg-black text-white">{mode}</span>
      </header>

      <main className="flex-grow relative flex flex-col overflow-hidden bg-[#ccc] p-3">
        {(mode === 'MAIN' || mode === 'WIKI' || mode === 'KEEP') && (
          <div className={`flex flex-col h-full relative ${isBiting ? 'scale-95' : 'scale-100'} transition-transform duration-100`}>
            {/* Card Content with Round Mask */}
            <div 
              style={mode === 'KEEP' ? {} : getBiteMask(mode === 'MAIN' ? streetPost?.bites_count : wikiData.bites_count)}
              className="flex-grow overflow-y-auto custom-scrollbar p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative"
            >
              {(mode === 'MAIN' ? streetPost : (mode === 'WIKI' ? wikiData : keeps[currentIndex % (keeps.length || 1)])) ? (
                <article className={isBiting ? 'animate-shake' : ''}>
                  <div className="flex justify-between items-center mb-6 text-[10px] font-black uppercase italic">
                    {mode === 'MAIN' ? `FRAG / BITES: ${streetPost?.bites_count || 0}` : mode === 'WIKI' ? `WIKI / BITES: ${wikiData.bites_count}` : 'ALLEYWAY'}
                  </div>

                  {(mode === 'MAIN' ? streetPost : (mode === 'WIKI' ? null : keeps[currentIndex % keeps.length]))?.image && (
                    <img src={(mode === 'MAIN' ? streetPost : keeps[currentIndex % keeps.length]).image} className="w-full h-auto border-4 border-black mb-6" alt="fragment" />
                  )}
                  <h2 className="text-3xl font-black mb-6 underline decoration-4 leading-none italic break-all">
                    {(mode === 'MAIN' ? streetPost : (mode === 'WIKI' ? wikiData : keeps[currentIndex % keeps.length])).title}
                  </h2>
                  <p className="text-base font-bold whitespace-pre-wrap leading-tight pb-32">
                    {(mode === 'MAIN' ? streetPost?.body : (mode === 'WIKI' ? wikiData.content : keeps[currentIndex % keeps.length]?.body))}
                  </p>
                </article>
              ) : (
                <div className="h-full flex items-center justify-center italic text-black font-black">STREET IS EMPTY</div>
              )}
            </div>

            {/* Float Actions */}
            <div className="absolute bottom-6 left-4 right-4 flex gap-2">
              <button 
                onClick={mode === 'MAIN' ? fetchStreet : (mode === 'WIKI' ? fetchWiki : () => setCurrentIndex(prev => prev + 1))} 
                className="flex-[4] h-16 bg-black text-white font-black text-xl active:bg-white active:text-black border-4 border-black transition-colors"
              >
                {mode === 'KEEP' ? 'FLIP' : 'NEXT →'}
              </button>
              
              <div className="flex-[2] flex flex-col gap-1">
                <button onClick={handleBite} className="flex-1 bg-white border-4 border-black font-black text-[12px] active:bg-black active:text-white italic">BITE</button>
                <button onClick={() => handleKeep(mode === 'MAIN' ? streetPost : (mode === 'WIKI' ? wikiData : null))} className="flex-1 bg-white border-4 border-black font-black text-[12px] active:bg-black active:text-white uppercase">KEEP</button>
              </div>
            </div>
          </div>
        )}

        {/* POST MODE */}
        {mode === 'POST' && (
          <div className="h-full flex flex-col p-4 bg-white border-4 border-black">
             <input value={postInput.title} onChange={(e) => setPostInput({...postInput, title: e.target.value})} placeholder="TITLE" className="border-b-4 border-black p-2 outline-none font-black text-3xl uppercase mb-4" />
             <div className="flex-grow flex flex-col overflow-hidden mb-4 border-2 border-black p-2">
               {postInput.image && <img src={postInput.image} className="h-32 w-full object-contain mb-2 border-2 border-black" />}
               <textarea value={postInput.body} onChange={(e) => setPostInput({...postInput, body: e.target.value})} placeholder="捨てる言葉..." className="flex-grow outline-none text-lg font-bold resize-none custom-scrollbar" />
             </div>
             <div className="flex gap-2 h-14 shrink-0">
               <button onClick={() => fileInputRef.current?.click()} className="flex-1 border-4 border-black font-black text-xs uppercase">IMG</button>
               <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e)=>{const f=e.target.files?.[0]; if(f){const r=new FileReader(); r.onload=()=>setPostInput({...postInput,image:r.result as string}); r.readAsDataURL(f);}}} />
               <button onClick={handlePost} className="flex-[2] bg-black text-white font-black text-2xl" disabled={isLoading}>POST</button>
             </div>
          </div>
        )}
      </main>

      <footer className="h-14 border-t-2 border-black flex bg-white shrink-0">
        {['MAIN', 'POST', 'WIKI', 'KEEP'].map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 flex flex-col items-center justify-center border-r border-black last:border-0 ${mode === m ? 'bg-black text-white' : 'bg-white'}`}>
            <span className="text-xl leading-none">{m === 'MAIN' ? '■' : m === 'POST' ? '◎' : m === 'WIKI' ? '△' : '▲'}</span>
          </button>
        ))}
      </footer>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px) rotate(-1deg); }
          75% { transform: translateX(4px) rotate(1deg); }
        }
        .animate-shake { animation: shake 0.15s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: black; }
      `}</style>
    </div>
  );
}