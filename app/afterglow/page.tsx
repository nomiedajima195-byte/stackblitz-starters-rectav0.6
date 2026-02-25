"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sn_NxTgpLdu_ZFZ5-dcriA_Z5NYkr-_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const LIFESPAN_MS = 168 * 60 * 60 * 1000;

export default function EngineWikiRestored() {
  const [mode, setMode] = useState('MAIN'); 
  const [streetPost, setStreetPost] = useState<any>(null);
  const [keeps, setKeeps] = useState<any[]>([]);
  const [wikiData, setWikiData] = useState<any>(null); // nullで初期化
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBiting, setIsBiting] = useState(false);

  const [postInput, setPostInput] = useState({ title: '', body: '', image: '' });

  const getBiteMask = (count: number) => {
    if (!count || count === 0) return {};
    return {
      maskImage: 'radial-gradient(circle 30px at calc(100% - 2px) 2px, transparent 100%, black 100%)',
      WebkitMaskImage: 'radial-gradient(circle 30px at calc(100% - 2px) 2px, transparent 100%, black 100%)',
    };
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

  // --- WIKI API FIXED ---
  const fetchWiki = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/random/summary`);
      const data = await res.json();
      if (data && data.title) {
        setWikiData({
          title: data.titles.display.replace(/<[^>]*>/g, ''),
          content: data.extract,
          bites_count: 0,
          image: data.originalimage?.source || null // Wikiの画像も拾う
        });
      }
    } catch (e) {
      console.error("Wiki Fetch Error", e);
    }
    setIsLoading(false);
  };

  const handleBite = () => {
    setIsBiting(true);
    setTimeout(() => setIsBiting(false), 200);
    if (mode === 'MAIN' && streetPost) {
      const newCount = (streetPost.bites_count || 0) + 1;
      supabase.from('posts').update({ bites_count: newCount }).eq('id', streetPost.id).then(() => {
        setStreetPost({ ...streetPost, bites_count: newCount });
      });
    } else if (mode === 'WIKI' && wikiData) {
      setWikiData({ ...wikiData, bites_count: (wikiData.bites_count || 0) + 1 });
    }
  };

  useEffect(() => {
    if (mode === 'MAIN') fetchStreet();
    if (mode === 'KEEP') {
      supabase.from('keeps').select('*').order('created_at', { ascending: false }).then(({data}) => data && setKeeps(data));
    }
    if (mode === 'WIKI' && !wikiData) fetchWiki();
  }, [mode, fetchStreet, wikiData]);

  const currentDisplay = mode === 'MAIN' ? streetPost : mode === 'KEEP' ? keeps[currentIndex % (keeps.length || 1)] : wikiData;

  return (
    <div className="bg-[#1a1a1a] text-black font-mono h-[100dvh] flex flex-col overflow-hidden select-none border-x border-black">
      <header className="h-8 border-b border-black flex items-center justify-between px-4 shrink-0 bg-white z-20">
        <h1 className="text-sm font-black italic tracking-tighter">07734</h1>
        <span className="text-[8px] font-bold uppercase opacity-40">{mode}</span>
      </header>

      <main className="flex-grow relative flex flex-col overflow-hidden bg-[#dcdcdc] p-2">
        {(mode !== 'POST') && (
          <div className="flex flex-col h-full relative">
            <div 
              style={mode === 'KEEP' ? {} : getBiteMask(currentDisplay?.bites_count)}
              className={`flex-grow overflow-y-auto custom-scrollbar p-6 bg-white shadow-lg relative border border-gray-400 transition-transform ${isBiting ? 'scale-[0.98]' : ''}`}
            >
              {currentDisplay ? (
                <article>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-black uppercase italic opacity-30">{mode}</span>
                  </div>

                  {currentDisplay.image && (
                    <img src={currentDisplay.image} className="w-full h-auto border border-black mb-6" alt="visual" />
                  )}
                  <h2 className="text-2xl font-black mb-6 leading-tight italic">{currentDisplay.title}</h2>
                  <p className="text-sm font-bold whitespace-pre-wrap pb-32">
                    {currentDisplay.body || currentDisplay.content}
                  </p>
                </article>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] opacity-40 uppercase">
                  {isLoading ? 'Scanning...' : 'No Data'}
                </div>
              )}
            </div>

            <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-between items-center pointer-events-none">
              <button 
                onClick={mode === 'MAIN' ? fetchStreet : mode === 'WIKI' ? fetchWiki : () => setCurrentIndex(prev => prev + 1)} 
                className="pointer-events-auto h-7 px-4 bg-black text-white text-[8px] font-black uppercase active:invert transition-all"
              >
                {mode === 'KEEP' ? 'FLIP' : 'NEXT'}
              </button>
              
              <div className="pointer-events-auto flex gap-1">
                <button onClick={handleBite} className="h-7 px-3 border border-black bg-white text-[8px] font-black italic active:bg-black active:text-white">BITE</button>
                <button 
                  onClick={async () => {
                    if(!currentDisplay) return;
                    await supabase.from('keeps').insert([{ 
                        title: currentDisplay.title, 
                        body: currentDisplay.body || currentDisplay.content, 
                        image: currentDisplay.image || null 
                    }]);
                  }} 
                  className="h-7 px-3 border border-black bg-white text-[8px] font-black uppercase active:bg-black active:text-white"
                >
                  KEEP
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'POST' && (
          <div className="h-full flex flex-col p-6 bg-white border border-black">
              <input value={postInput.title} onChange={(e) => setPostInput(prev => ({...prev, title: e.target.value}))} placeholder="TITLE..." className="border-b border-black py-2 outline-none font-black text-lg uppercase mb-4" />
              <textarea value={postInput.body} onChange={(e) => setPostInput(prev => ({...prev, body: e.target.value}))} placeholder="DROP WORDS..." className="flex-grow outline-none text-sm font-bold resize-none" />
              <button onClick={async () => {
                await supabase.from('posts').insert([{ title: postInput.title || 'UNTITLED', body: postInput.body, image: null, bites_count: 0 }]);
                setMode('MAIN'); fetchStreet();
              }} className="h-8 bg-black text-white text-[8px] font-black uppercase mt-4">DEPOSIT</button>
          </div>
        )}
      </main>

      <footer className="h-10 border-t border-black flex bg-white shrink-0">
        {['MAIN', 'POST', 'WIKI', 'KEEP'].map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 flex items-center justify-center border-r border-black last:border-0 ${mode === m ? 'bg-black text-white' : 'bg-white'}`}>
            <span className="text-[9px] font-black uppercase">{m}</span>
          </button>
        ))}
      </footer>

      <style jsx global>{`
        article { user-select: none; -webkit-user-select: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: black; }
      `}</style>
    </div>
  );
}