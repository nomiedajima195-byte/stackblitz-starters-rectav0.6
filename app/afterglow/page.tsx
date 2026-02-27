"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sn_NxTgpLdu_ZFZ5-dcriA_Z5NYkr-_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const LIFESPAN_MS = 168 * 60 * 60 * 1000;

export default function PaginatedRubbish() {
  const [mode, setMode] = useState('MAIN'); 
  const [streetPost, setStreetPost] = useState<any>(null);
  const [keeps, setKeeps] = useState<any[]>([]);
  const [wikiData, setWikiData] = useState({ title: '', pages: [] as string[], image: '' });
  const [isLoading, setIsLoading] = useState(false);
  
  // ページ管理用のState
  const [currentPage, setCurrentPage] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0); // 横丁の選択インデックス

  const [postInput, setPostInput] = useState({ title: '', body: '', image: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ページ分割ロジック ---
  const getPages = (text: string) => {
    if (!text) return [""];
    // "---" で分割。なければ適当な文字数で区切る（今回は手動分割を優先）
    return text.split('\n---\n').filter(p => p.trim() !== "");
  };

  const getRemainingTime = (createdAt: string) => {
    if (!createdAt) return "---";
    const remaining = LIFESPAN_MS - (new Date().getTime() - new Date(createdAt).getTime());
    return remaining <= 0 ? "EXPIRED" : `${Math.floor(remaining / 3600000)}H`;
  };

  // --- FETCH & RESET ---
  const resetPage = () => setCurrentPage(0);

  const fetchStreet = useCallback(async () => {
    setIsLoading(true);
    resetPage();
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (data) {
      const alive = data.filter(p => (new Date().getTime() - new Date(p.created_at).getTime()) < LIFESPAN_MS);
      setStreetPost(alive.length > 0 ? alive[Math.floor(Math.random() * alive.length)] : null);
    }
    setIsLoading(false);
  }, []);

  const fetchWiki = async () => {
    setIsLoading(true);
    resetPage();
    try {
      const res = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/random/summary`);
      const data = await res.json();
      // Wikiの長いテキストを「。」で分割して擬似ページ化
      const sentences = data.extract.split('。').map((s: string) => s + '。').filter((s: string) => s.length > 1);
      setWikiData({ 
        title: data.titles.display.replace(/<[^>]*>/g, ''), 
        pages: sentences,
        image: data.originalimage ? data.originalimage.source : ''
      });
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => {
    if (mode === 'KEEP') { supabase.from('keeps').select('*').order('created_at', { ascending: false }).then(({data})=>data && setKeeps(data)); }
    if (mode === 'MAIN') fetchStreet();
    if (mode === 'WIKI' && !wikiData.title) fetchWiki();
  }, [mode, fetchStreet]);

  // --- RENDER HELPERS ---
  const renderPagination = (pages: string[]) => (
    <div className="flex gap-1 mt-4">
      {pages.map((_, i) => (
        <div key={i} className={`h-1 flex-grow ${i === currentPage ? 'bg-black' : 'bg-gray-200'}`} />
      ))}
    </div>
  );

  const postPages = streetPost ? getPages(streetPost.body) : [];
  const keepPages = keeps.length > 0 ? getPages(keeps[currentIndex % keeps.length].body) : [];

  return (
    <div className="bg-white text-black font-mono h-[100dvh] flex flex-col overflow-hidden select-none border-x-2 border-black">
      <header className="h-10 border-b-2 border-black flex items-center justify-between px-4 shrink-0 bg-white z-20">
        <h1 className="text-xl font-black italic tracking-tighter">Rubbish</h1>
        <div className="text-[8px] font-black border border-black px-1 uppercase">{mode}</div>
      </header>

      <main className="flex-grow relative flex flex-col overflow-hidden">
        {(mode === 'MAIN' || mode === 'WIKI' || mode === 'KEEP') && (
          <div className="flex flex-col h-full">
            <div className="flex-grow p-4 flex flex-col overflow-hidden">
              
              {/* STATUS BAR */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black italic">PAGE {currentPage + 1} / {(mode === 'MAIN' ? postPages : mode === 'WIKI' ? wikiData.pages : keepPages).length}</span>
                <span className="text-[9px] font-black bg-black text-white px-1">TTL: {getRemainingTime(mode === 'MAIN' ? streetPost?.created_at : '')}</span>
              </div>

              {/* CONTENT (No Scroll, Just Pages) */}
              <div className="flex-grow flex flex-col">
                {mode === 'MAIN' && streetPost && (
                  <article className="h-full flex flex-col">
                    {currentPage === 0 && streetPost.image && <img src={streetPost.image} className="w-full h-48 object-cover border-2 border-black mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />}
                    <h2 className="text-2xl font-black mb-4 underline decoration-2">{streetPost.title}</h2>
                    <div className="text-lg font-bold leading-tight">{postPages[currentPage]}</div>
                  </article>
                )}
                {mode === 'WIKI' && (
                  <article className="h-full flex flex-col">
                    {currentPage === 0 && wikiData.image && <img src={wikiData.image} className="w-full h-48 object-cover border-2 border-black mb-4" />}
                    <h2 className="text-2xl font-black mb-4 italic underline">{wikiData.title}</h2>
                    <div className="text-lg font-bold leading-tight">{wikiData.pages[currentPage]}</div>
                  </article>
                )}
                {mode === 'KEEP' && keeps.length > 0 && (
                  <article className="h-full flex flex-col">
                    {currentPage === 0 && keeps[currentIndex % keeps.length].image && <img src={keeps[currentIndex % keeps.length].image} className="w-full h-48 object-cover border-2 border-black mb-4" />}
                    <h2 className="text-2xl font-black mb-4">{keeps[currentIndex % keeps.length].title}</h2>
                    <div className="text-lg font-bold leading-tight">{keepPages[currentPage]}</div>
                  </article>
                )}
              </div>
              
              {/* PAGE INDICATOR BAR */}
              {renderPagination(mode === 'MAIN' ? postPages : mode === 'WIKI' ? wikiData.pages : keepPages)}
            </div>

            {/* PAGE CONTROL OVERLAY (Invisible areas to tap) */}
            <div className="absolute top-10 bottom-24 left-0 w-1/2 z-10" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} />
            <div className="absolute top-10 bottom-24 right-0 w-1/2 z-10" onClick={() => {
              const max = (mode === 'MAIN' ? postPages : mode === 'WIKI' ? wikiData.pages : keepPages).length;
              setCurrentPage(p => Math.min(max - 1, p + 1));
            }} />

            {/* ACTION FOOTER */}
            <div className="p-4 bg-white border-t-2 border-black flex gap-2 z-20">
               <button onClick={() => {
                 if(mode === 'MAIN') fetchStreet();
                 if(mode === 'WIKI') fetchWiki();
                 if(mode === 'KEEP') { setCurrentIndex(i => i + 1); resetPage(); }
               }} className="flex-grow h-12 bg-black text-white font-black uppercase tracking-tighter">NEXT {mode === 'KEEP' ? 'ZINE' : 'FRAGMENT'} →</button>
               
               <button onClick={() => {
                 const item = mode === 'MAIN' ? streetPost : {title: wikiData.title, body: wikiData.pages.join('。'), image: wikiData.image};
                 if(item) supabase.from('keeps').insert([{title: item.title, body: item.body, image: item.image}]).then(()=>alert("KEPT."));
               }} className="w-16 border-2 border-black font-black text-[10px] active:invert italic uppercase">KEEP</button>
            </div>
          </div>
        )}

        {/* POST MODE (Simplified for multi-page) */}
        {mode === 'POST' && (
          <div className="h-full flex flex-col p-4">
             <div className="text-[10px] font-black mb-2 italic">※ Use "---" to create a new page</div>
             <input value={postInput.title} onChange={(e) => setPostInput({...postInput, title: e.target.value})} placeholder="TITLE" className="border-b-4 border-black p-2 outline-none font-black text-2xl mb-4" />
             <textarea value={postInput.body} onChange={(e) => setPostInput({...postInput, body: e.target.value})} placeholder="Page 1 Content&#10;---&#10;Page 2 Content..." className="flex-grow outline-none text-lg font-bold p-2 border-2 border-black mb-4" />
             <button onClick={async () => {
               const { error } = await supabase.from('posts').insert([{ title: postInput.title, body: postInput.body, image: postInput.image }]);
               if(!error) { setPostInput({title:'', body:'', image:''}); setMode('MAIN'); fetchStreet(); }
             }} className="h-16 bg-black text-white font-black text-2xl uppercase">Submit ZINE</button>
          </div>
        )}
      </main>

      <footer className="h-14 border-t-2 border-black flex items-stretch bg-white shrink-0 z-20">
        {['MAIN', 'POST', 'WIKI', 'KEEP'].map((m) => (
          <button key={m} onClick={() => { setMode(m); resetPage(); }} className={`flex-1 flex flex-col items-center justify-center border-r border-black last:border-0 ${mode === m ? 'bg-black text-white' : 'bg-white'}`}>
             <span className="text-[10px] font-black">{m}</span>
          </button>
        ))}
      </footer>
    </div>
  );
}