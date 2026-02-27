"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sn_NxTgpLdu_ZFZ5-dcriA_Z5NYkr-_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const LIFESPAN_MS = 168 * 60 * 60 * 1000;

// ページデータの型定義
interface ArtifactPage {
  title: string;
  body: string;
  image: string;
}

export default function RubbishZineEngine() {
  const [mode, setMode] = useState('MAIN'); 
  const [streetPost, setStreetPost] = useState<any>(null);
  const [keeps, setKeeps] = useState<any[]>([]);
  const [wikiData, setWikiData] = useState({ title: '', pages: [] as ArtifactPage[] });
  const [isLoading, setIsLoading] = useState(false);
  
  // 閲覧用State
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentKeepIndex, setCurrentKeepIndex] = useState(0);

  // 投稿用State
  const [postPages, setPostPages] = useState<ArtifactPage[]>([{ title: '', body: '', image: '' }]);
  const [editingPageIndex, setEditingPageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRemainingTime = (createdAt: string) => {
    if (!createdAt) return "---";
    const remaining = LIFESPAN_MS - (new Date().getTime() - new Date(createdAt).getTime());
    return remaining <= 0 ? "EXPIRED" : `${Math.floor(remaining / 3600000)}H`;
  };

  // --- ACTIONS ---
  const fetchStreet = useCallback(async () => {
    setIsLoading(true);
    setCurrentPageIndex(0);
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (data) {
      const alive = data.filter(p => (new Date().getTime() - new Date(p.created_at).getTime()) < LIFESPAN_MS);
      setStreetPost(alive.length > 0 ? alive[Math.floor(Math.random() * alive.length)] : null);
    }
    setIsLoading(false);
  }, []);

  const handlePost = async () => {
    setIsLoading(true);
    // pagesカラムはJSONB型で保存することを想定
    const { error } = await supabase.from('posts').insert([{ 
      title: postPages[0].title || 'UNTITLED ARTIFACT',
      pages: postPages, 
      created_at: new Date().toISOString()
    }]);
    if (!error) {
      setPostPages([{ title: '', body: '', image: '' }]);
      setEditingPageIndex(0);
      setMode('MAIN');
      fetchStreet();
    }
    setIsLoading(false);
  };

  const fetchWiki = async () => {
    setIsLoading(true);
    setCurrentPageIndex(0);
    try {
      const res = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/random/summary`);
      const data = await res.json();
      // Wikiをバラして3ページ程度のZineにする
      const chunks = data.extract.match(/.{1,150}/g) || []; 
      const pages = chunks.slice(0, 3).map((text: string, i: number) => ({
        title: i === 0 ? data.titles.display : `FRAGMENT ${i + 1}`,
        body: text,
        image: i === 0 && data.originalimage ? data.originalimage.source : ''
      }));
      setWikiData({ title: data.titles.display, pages });
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => {
    if (mode === 'KEEP') { supabase.from('keeps').select('*').order('created_at', { ascending: false }).then(({data})=>data && setKeeps(data)); }
    if (mode === 'MAIN') fetchStreet();
    if (mode === 'WIKI' && !wikiData.title) fetchWiki();
  }, [mode, fetchStreet]);

  // 現在表示中のページ群を取得
  const currentViewPages = mode === 'MAIN' ? (streetPost?.pages || []) : (mode === 'WIKI' ? wikiData.pages : (keeps[currentKeepIndex % keeps.length]?.pages || []));
  const currentPage = currentViewPages[currentPageIndex] || null;

  return (
    <div className="bg-white text-black font-mono h-[100dvh] flex flex-col overflow-hidden select-none border-x-2 border-black">
      <header className="h-10 border-b-2 border-black flex items-center justify-between px-4 shrink-0 bg-white z-30">
        <h1 className="text-xl font-black italic tracking-tighter">Rubbish</h1>
        <div className="flex items-center gap-2">
           <span className="text-[8px] font-black border border-black px-1 leading-none">{mode}</span>
           <span className="text-[8px] font-black animate-pulse">●</span>
        </div>
      </header>

      <main className="flex-grow relative flex flex-col overflow-hidden">
        {(mode === 'MAIN' || mode === 'WIKI' || mode === 'KEEP') && (
          <div className="flex flex-col h-full">
            <div className="flex-grow p-4 flex flex-col overflow-hidden relative">
              
              {/* STATUS BAR */}
              <div className="flex justify-between items-center mb-2 z-20">
                <span className="text-[9px] font-black italic uppercase">Page {currentPageIndex + 1} / {currentViewPages.length}</span>
                {mode === 'MAIN' && <span className="text-[9px] font-black bg-black text-white px-1">TTL: {getRemainingTime(streetPost?.created_at)}</span>}
              </div>

              {/* ARTIFACT CONTENT */}
              <div className="flex-grow flex flex-col animate-in fade-in duration-300">
                {currentPage ? (
                  <article className="h-full flex flex-col">
                    {currentPage.image && (
                      <div className="w-full h-1/2 mb-4 border-2 border-black overflow-hidden bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <img src={currentPage.image} className="w-full h-full object-cover" alt="Artifact" />
                      </div>
                    )}
                    <h2 className="text-2xl font-black mb-3 underline decoration-2 break-all">{currentPage.title || 'UNTITLED'}</h2>
                    <p className="text-base font-bold leading-snug overflow-y-auto custom-scrollbar">{currentPage.body}</p>
                  </article>
                ) : (
                  <div className="h-full flex items-center justify-center italic text-gray-300 uppercase font-black tracking-widest">End of Signal</div>
                )}
              </div>

              {/* PROGRESS DOTS */}
              <div className="flex gap-1 mt-4">
                {currentViewPages.map((_: any, i: number) => (
                  <div key={i} className={`h-1 flex-grow transition-colors ${i === currentPageIndex ? 'bg-black' : 'bg-gray-200'}`} />
                ))}
              </div>

              {/* INVISIBLE TAP AREAS */}
              <div className="absolute top-10 bottom-24 left-0 w-1/4 z-10" onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))} />
              <div className="absolute top-10 bottom-24 right-0 w-3/4 z-10" onClick={() => {
                if (currentPageIndex < currentViewPages.length - 1) setCurrentPageIndex(p => p + 1);
                else { /* 最後のページで次へボタン等に誘導しても良い */ }
              }} />
            </div>

            {/* ACTION FOOTER */}
            <div className="p-4 bg-white border-t-2 border-black flex gap-2 z-20">
               <button onClick={() => {
                 if(mode === 'MAIN') fetchStreet();
                 if(mode === 'WIKI') fetchWiki();
                 if(mode === 'KEEP') { setCurrentKeepIndex(i => i + 1); setCurrentPageIndex(0); }
               }} className="flex-grow h-12 bg-black text-white font-black uppercase text-sm active:invert">Next Artifact →</button>
               
               <button onClick={() => {
                 const artifact = mode === 'MAIN' ? streetPost : (mode === 'WIKI' ? {title: wikiData.title, pages: wikiData.pages} : null);
                 if(artifact) supabase.from('keeps').insert([{title: artifact.title, pages: artifact.pages}]).then(()=>alert("KEPT."));
               }} className="w-16 border-2 border-black font-black text-[10px] active:invert uppercase italic">KEEP</button>
            </div>
          </div>
        )}

        {/* POST MODE: ZINE CREATOR */}
        {mode === 'POST' && (
          <div className="h-full flex flex-col p-4 overflow-hidden bg-white">
             <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black uppercase">Editing Page {editingPageIndex + 1}</span>
                <span className={`text-[10px] font-black ${postPages[editingPageIndex].body.length > 500 ? 'text-red-500' : ''}`}>
                  {postPages[editingPageIndex].body.length} / 500
                </span>
             </div>

             <div className="flex-grow flex flex-col border-4 border-black p-4 mb-4 bg-gray-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <input 
                  value={postPages[editingPageIndex].title} 
                  onChange={(e) => {
                    const newPages = [...postPages];
                    newPages[editingPageIndex].title = e.target.value.toUpperCase();
                    setPostPages(newPages);
                  }} 
                  placeholder="PAGE TITLE" 
                  className="bg-transparent border-b-2 border-black mb-4 outline-none font-black text-xl" 
                />
                
                {postPages[editingPageIndex].image && (
                  <div className="relative h-32 mb-4 border-2 border-black">
                    <img src={postPages[editingPageIndex].image} className="w-full h-full object-cover" />
                    <button onClick={() => {
                      const newPages = [...postPages];
                      newPages[editingPageIndex].image = '';
                      setPostPages(newPages);
                    }} className="absolute top-0 right-0 bg-black text-white p-1 text-[8px]">REMOVE</button>
                  </div>
                )}

                <textarea 
                  value={postPages[editingPageIndex].body} 
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      const newPages = [...postPages];
                      newPages[editingPageIndex].body = e.target.value;
                      setPostPages(newPages);
                    }
                  }} 
                  placeholder="断片的な情報を500文字以内で..." 
                  className="flex-grow bg-transparent outline-none text-base font-bold resize-none" 
                />
             </div>

             <div className="flex gap-2 mb-4">
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 h-10 border-2 border-black font-black text-[10px] uppercase">Add Image</button>
                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if(file){ const r=new FileReader(); r.onload=()=> {
                    const newPages = [...postPages];
                    newPages[editingPageIndex].image = r.result as string;
                    setPostPages(newPages);
                  }; r.readAsDataURL(file); }
                }} />
                <button 
                  onClick={() => {
                    setPostPages([...postPages, { title: '', body: '', image: '' }]);
                    setEditingPageIndex(postPages.length);
                  }} 
                  className="flex-1 h-10 border-2 border-black font-black text-[10px] uppercase bg-black text-white"
                >+ New Page</button>
             </div>

             <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
                {postPages.map((_, i) => (
                  <button key={i} onClick={() => setEditingPageIndex(i)} className={`shrink-0 w-8 h-8 border-2 border-black font-black ${editingPageIndex === i ? 'bg-black text-white' : 'bg-white'}`}>{i + 1}</button>
                ))}
             </div>

             <button onClick={handlePost} className="h-16 bg-black text-white font-black text-2xl uppercase active:invert">Finish & Discard to Street</button>
          </div>
        )}
      </main>

      <footer className="h-14 border-t-2 border-black flex items-stretch bg-white shrink-0 z-30">
        {['MAIN', 'POST', 'WIKI', 'KEEP'].map((m) => (
          <button key={m} onClick={() => { setMode(m); setCurrentPageIndex(0); }} className={`flex-1 flex flex-col items-center justify-center border-r border-black last:border-0 ${mode === m ? 'bg-black text-white' : 'bg-white'}`}>
             <span className="text-[10px] font-black">{m}</span>
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