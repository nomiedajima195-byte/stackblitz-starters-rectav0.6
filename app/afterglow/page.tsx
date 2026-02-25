"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sn_NxTgpLdu_ZFZ5-dcriA_Z5NYkr-_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const LIFESPAN_MS = 168 * 60 * 60 * 1000;

export default function EngineArticleFirstWithShare() {
  const [mode, setMode] = useState('MAIN'); 
  const [streetPost, setStreetPost] = useState<any>(null);
  const [keeps, setKeeps] = useState<any[]>([]);
  const [wikiData, setWikiData] = useState({ title: '', content: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [postInput, setPostInput] = useState({ title: '', body: '', image: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRemainingTime = (createdAt: string) => {
    const birth = new Date(createdAt).getTime();
    const remaining = LIFESPAN_MS - (new Date().getTime() - birth);
    if (remaining <= 0) return "0H:0M";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}H:${mins}M`;
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

  const fetchKeeps = useCallback(async () => {
    const { data } = await supabase.from('keeps').select('*').order('created_at', { ascending: false });
    if (data) setKeeps(data);
  }, []);

  const fetchWiki = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/random/summary`);
      const data = await res.json();
      setWikiData({ title: data.titles.display.replace(/<[^>]*>/g, ''), content: data.extract });
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handlePost = async () => {
    if (!postInput.title && !postInput.body && !postInput.image) return;
    setIsLoading(true);
    const { error } = await supabase.from('posts').insert([{ title: postInput.title || 'UNTITLED', body: postInput.body, image: postInput.image }]);
    if (!error) { setPostInput({ title: '', body: '', image: '' }); setMode('MAIN'); fetchStreet(); }
    setIsLoading(false);
  };

  const handleKeep = async (item: any) => {
    const { error } = await supabase.from('keeps').insert([{ title: item.title, body: item.body, image: item.image }]);
    if (!error) { alert("KEPT."); fetchKeeps(); }
  };

  // --- SHARE (再放流・転生) ---
  const handleShare = async () => {
    const item = keeps[currentIndex % keeps.length];
    if (!item) return;
    setIsLoading(true);
    const { error } = await supabase.from('posts').insert([{
      title: item.title.startsWith('♻') ? item.title : `♻ ${item.title}`,
      body: item.body,
      image: item.image
    }]);
    if (!error) { alert("REINCARNATED."); setMode('MAIN'); fetchStreet(); }
    setIsLoading(false);
  };

  useEffect(() => {
    if (mode === 'KEEP') fetchKeeps();
    if (mode === 'MAIN') fetchStreet();
    if (mode === 'WIKI' && !wikiData.title) fetchWiki();
  }, [mode, fetchKeeps, fetchStreet]);

  return (
    <div className="bg-white text-black font-mono h-[100dvh] flex flex-col overflow-hidden select-none border-x-2 border-black">
      <header className="h-10 border-b-2 border-black flex items-center justify-between px-4 shrink-0">
        <h1 className="text-xl font-black italic tracking-tighter uppercase">Rubbish</h1>
        <div className="flex items-center gap-2">
           <span className="text-[8px] font-black border border-black px-1 leading-none uppercase">{mode}</span>
           <span className="text-[8px] font-black animate-pulse text-red-600">● LIVE</span>
        </div>
      </header>

      <main className="flex-grow relative flex flex-col overflow-hidden">
        {(mode === 'MAIN' || mode === 'WIKI' || mode === 'KEEP') && (
          <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto custom-scrollbar p-4 pb-28">
              {(mode === 'MAIN' ? streetPost : (mode === 'KEEP' ? keeps[currentIndex % keeps.length] : null)) && (
                <div className="sticky top-0 z-10 flex justify-end mb-2">
                  <span className="bg-black text-white text-[9px] px-2 py-0.5 font-black">
                    TTL: {getRemainingTime(mode === 'MAIN' ? streetPost.created_at : keeps[currentIndex % keeps.length].created_at)}
                  </span>
                </div>
              )}

              <div className="animate-in fade-in duration-500">
                {mode === 'MAIN' && streetPost ? (
                  <article>
                    {streetPost.image && <img src={streetPost.image} className="w-full h-auto border-2 border-black mb-4" />}
                    <h2 className="text-3xl font-black mb-6 underline decoration-4 break-all leading-[1.1]">{streetPost.title}</h2>
                    <p className="text-base font-bold whitespace-pre-wrap leading-relaxed">{streetPost.body}</p>
                  </article>
                ) : mode === 'WIKI' ? (
                  <article>
                    <h2 className="text-3xl font-black mb-6 underline decoration-4 leading-[1.1] italic">{wikiData.title}</h2>
                    <p className="text-base font-bold leading-relaxed">{wikiData.content}</p>
                  </article>
                ) : mode === 'KEEP' && keeps.length > 0 ? (
                  <article>
                    {keeps[currentIndex % keeps.length].image && <img src={keeps[currentIndex % keeps.length].image} className="w-full h-auto border-2 border-black mb-4" />}
                    <h2 className="text-3xl font-black mb-6 underline decoration-4 leading-[1.1]">{keeps[currentIndex % keeps.length].title}</h2>
                    <p className="text-base font-bold whitespace-pre-wrap leading-relaxed">{keeps[currentIndex % keeps.length].body}</p>
                  </article>
                ) : <div className="h-64 flex items-center justify-center italic text-gray-300">VOID...</div>}
              </div>
            </div>

            {/* Float Action Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex gap-2">
               {mode === 'MAIN' && <button onClick={fetchStreet} className="flex-[3] h-14 bg-black text-white font-black text-lg active:scale-95 transition-transform uppercase tracking-tighter">Next →</button>}
               {mode === 'WIKI' && <button onClick={fetchWiki} className="flex-[3] h-14 bg-black text-white font-black text-lg active:scale-95 transition-transform uppercase tracking-tighter">Next →</button>}
               {mode === 'KEEP' && (
                 <div className="flex-[3] flex gap-2">
                   <button onClick={() => setCurrentIndex(prev => prev + 1)} className="flex-[2] h-14 bg-black text-white font-black text-lg active:scale-95 transition-transform uppercase tracking-tighter">Flip</button>
                   <button onClick={handleShare} className="flex-1 h-14 bg-white border-4 border-black text-black font-black text-[10px] active:invert transition-colors uppercase leading-none">Share / Rebirth</button>
                 </div>
               )}
               
               <div className="flex-1 flex flex-col gap-1">
                 {(mode === 'MAIN' || mode === 'WIKI') && (
                   <button onClick={() => {
                     if(mode === 'MAIN') handleKeep(streetPost);
                     if(mode === 'WIKI') handleKeep({title: wikiData.title, body: wikiData.content});
                   }} className="flex-1 border-2 border-black bg-white font-black text-[10px] active:invert">KEEP</button>
                 )}
                 <button className="flex-1 border-2 border-black bg-white font-black text-[10px] active:invert italic opacity-20">BITE</button>
               </div>
            </div>
          </div>
        )}

        {/* POST MODE */}
        {mode === 'POST' && (
          <div className="h-full flex flex-col p-4 animate-in slide-in-from-bottom-4 bg-white">
             <input value={postInput.title} onChange={(e) => setPostInput({...postInput, title: e.target.value})} placeholder="TITLE" className="border-b-4 border-black p-2 outline-none font-black text-3xl uppercase mb-4" />
             <div className="flex-grow flex flex-col overflow-hidden mb-4">
               {postInput.image && <div className="relative mb-2 shrink-0"><img src={postInput.image} className="h-40 w-full object-contain border-2 border-black" /><button onClick={()=>setPostInput({...postInput, image:''})} className="absolute top-0 right-0 bg-black text-white p-1 text-xs">X</button></div>}
               <textarea value={postInput.body} onChange={(e) => setPostInput({...postInput, body: e.target.value})} placeholder="文字情報を捨てる..." className="flex-grow outline-none text-lg font-bold resize-none p-2 border-2 border-black" />
             </div>
             <div className="flex gap-2 h-16 shrink-0">
               <button onClick={() => fileInputRef.current?.click()} className="flex-1 border-4 border-black font-black text-xs uppercase bg-gray-100 active:invert">IMAGE</button>
               <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => {
                 const file = e.target.files?.[0];
                 if(file){ const r=new FileReader(); r.onload=()=>setPostInput({...postInput, image:r.result as string}); r.readAsDataURL(file); }
               }} />
               <button onClick={handlePost} className="flex-[2] bg-black text-white font-black text-2xl active:scale-95 transition-transform" disabled={isLoading}>{isLoading ? '...' : 'POST'}</button>
             </div>
          </div>
        )}
      </main>

      <footer className="h-14 border-t-2 border-black flex items-stretch bg-white shrink-0">
        {[
          { m: 'MAIN', icon: '■' }, { m: 'POST', icon: '◎' }, { m: 'WIKI', icon: '△' }, { m: 'KEEP', icon: '▲' }
        ].map((item) => (
          <button key={item.m} onClick={() => setMode(item.m)} className={`flex-1 flex flex-col items-center justify-center border-r border-black last:border-0 ${mode === item.m ? 'bg-black text-white' : 'bg-white text-black'}`}>
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[7px] font-black mt-1 uppercase">{item.m}</span>
          </button>
        ))}
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: black; }
      `}</style>
    </div>
  );
}