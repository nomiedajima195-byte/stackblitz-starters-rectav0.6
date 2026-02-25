"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sn_NxTgpLdu_ZFZ5-dcriA_Z5NYkr-_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const LIFESPAN_MS = 168 * 60 * 60 * 1000;

export default function EngineImageFixed() {
  const [mode, setMode] = useState('MAIN'); 
  const [streetPost, setStreetPost] = useState<any>(null);
  const [keeps, setKeeps] = useState<any[]>([]);
  const [wikiData, setWikiData] = useState({ title: '', content: '', bites_count: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBiting, setIsBiting] = useState(false);

  const [postInput, setPostInput] = useState({ title: '', body: '', image: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // --- IMAGE SELECTION FIXED ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        // 関数型アップデートで確実に現在のstateに合成する
        setPostInput(prev => ({ ...prev, image: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!postInput.title && !postInput.body && !postInput.image) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('posts').insert([{ 
        title: postInput.title || 'UNTITLED', 
        body: postInput.body || '', 
        image: postInput.image || null,
        bites_count: 0
      }]);
      if (!error) {
        setPostInput({ title: '', body: '', image: '' });
        setMode('MAIN');
        fetchStreet();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBite = async () => {
    setIsBiting(true);
    setTimeout(() => setIsBiting(false), 200);
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
      title: item.title, body: item.body || item.content, image: item.image || null 
    }]);
    if (!error) handleBite();
  };

  useEffect(() => {
    if (mode === 'KEEP') {
      supabase.from('keeps').select('*').order('created_at', { ascending: false }).then(({data}) => data && setKeeps(data));
    }
    if (mode === 'MAIN') fetchStreet();
  }, [mode, fetchStreet]);

  return (
    <div className="bg-[#1a1a1a] text-black font-mono h-[100dvh] flex flex-col overflow-hidden select-none border-x border-black">
      <header className="h-8 border-b border-black flex items-center justify-between px-4 shrink-0 bg-white z-20">
        <h1 className="text-sm font-black italic tracking-tighter">07734</h1>
        <span className="text-[8px] font-bold uppercase opacity-40">{mode}</span>
      </header>

      <main className="flex-grow relative flex flex-col overflow-hidden bg-[#dcdcdc] p-2">
        {(mode === 'MAIN' || mode === 'WIKI' || mode === 'KEEP') && (
          <div className="flex flex-col h-full relative">
            <div 
              style={mode === 'KEEP' ? {} : getBiteMask(mode === 'MAIN' ? streetPost?.bites_count : wikiData.bites_count)}
              className={`flex-grow overflow-y-auto custom-scrollbar p-6 bg-white shadow-lg relative border border-gray-400 transition-transform ${isBiting ? 'scale-[0.98]' : ''}`}
            >
              {(mode === 'MAIN' ? streetPost : (mode === 'KEEP' ? (keeps.length > 0 ? keeps[currentIndex % keeps.length] : null) : wikiData)) ? (
                <article>
                  {/* Street Image Display */}
                  {(mode === 'MAIN' ? streetPost : (mode === 'KEEP' ? keeps[currentIndex % keeps.length] : null))?.image && (
                    <img src={(mode === 'MAIN' ? streetPost : keeps[currentIndex % keeps.length]).image} className="w-full h-auto border border-black mb-6" alt="raw" />
                  )}
                  <h2 className="text-2xl font-black mb-6 leading-tight italic">
                    {(mode === 'MAIN' ? streetPost : (mode === 'KEEP' ? keeps[currentIndex % (keeps.length || 1)] : wikiData)).title}
                  </h2>
                  <p className="text-sm font-bold whitespace-pre-wrap pb-32">
                    {(mode === 'MAIN' ? streetPost?.body : (mode === 'KEEP' ? keeps[currentIndex % (keeps.length || 1)]?.body : wikiData.content))}
                  </p>
                </article>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] opacity-40">VOID</div>
              )}
            </div>

            <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-between items-center pointer-events-none">
              <button onClick={mode === 'MAIN' ? fetchStreet : (mode === 'WIKI' ? () => {} : () => setCurrentIndex(prev => prev + 1))} className="pointer-events-auto h-7 px-4 bg-black text-white text-[8px] font-black uppercase active:invert">
                {mode === 'KEEP' ? 'FLIP' : 'NEXT'}
              </button>
              <div className="pointer-events-auto flex gap-1">
                <button onClick={handleBite} className="h-7 px-3 border border-black bg-white text-[8px] font-black italic active:bg-black active:text-white">BITE</button>
                <button onClick={() => handleKeep(mode === 'MAIN' ? streetPost : (mode === 'WIKI' ? wikiData : null))} className="h-7 px-3 border border-black bg-white text-[8px] font-black uppercase active:bg-black active:text-white">KEEP</button>
              </div>
            </div>
          </div>
        )}

        {/* POST MODE FIXED */}
        {mode === 'POST' && (
          <div className="h-full flex flex-col p-6 bg-white border border-black">
             <input value={postInput.title} onChange={(e) => setPostInput(prev => ({...prev, title: e.target.value}))} placeholder="TITLE..." className="border-b border-black py-2 outline-none font-black text-lg uppercase mb-4" />
             
             <div className="flex-grow flex flex-col overflow-y-auto custom-scrollbar">
               {/* プレビューエリア：画像があれば表示、なければ「NO IMAGE」 */}
               <div onClick={() => fileInputRef.current?.click()} className="w-full min-h-[100px] border-2 border-dashed border-gray-300 flex items-center justify-center mb-4 cursor-pointer overflow-hidden bg-gray-50">
                 {postInput.image ? (
                   <img src={postInput.image} className="w-full h-full object-contain" alt="preview" />
                 ) : (
                   <span className="text-[8px] font-black opacity-30 uppercase tracking-tighter">Click to select image</span>
                 )}
               </div>
               <textarea value={postInput.body} onChange={(e) => setPostInput(prev => ({...prev, body: e.target.value}))} placeholder="DROP WORDS..." className="flex-grow outline-none text-sm font-bold resize-none min-h-[200px]" />
             </div>

             <div className="flex gap-2 pt-4">
               <button onClick={() => fileInputRef.current?.click()} className="h-7 px-4 border border-black text-[8px] font-black uppercase bg-white">Img</button>
               <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageChange} />
               <button onClick={handlePost} className="flex-grow h-7 bg-black text-white text-[8px] font-black uppercase" disabled={isLoading}>{isLoading ? '...' : 'DEPOSIT'}</button>
             </div>
          </div>
        )}
      </main>

      <footer className="h-10 border-t border-black flex bg-white shrink-0">
        {['MAIN', 'POST', 'WIKI', 'KEEP'].map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 flex items-center justify-center border-r border-black last:border-0 ${mode === m ? 'bg-black text-white' : 'bg-white'}`}>
            <span className="text-[9px] font-black uppercase tracking-widest">{m}</span>
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