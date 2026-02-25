"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sn_NxTgpLdu_ZFZ5-dcriA_Z5NYkr-_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LIFESPAN_MS = 168 * 60 * 60 * 1000; // 168時間

export default function EngineFinalPost() {
  const [mode, setMode] = useState('MAIN'); 
  const [streetPost, setStreetPost] = useState<any>(null);
  const [keeps, setKeeps] = useState<any[]>([]);
  const [wikiData, setWikiData] = useState({ title: '', content: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [postInput, setPostInput] = useState({ title: '', body: '', image: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 寿命計算 (TTL表示) ---
  const getRemainingTime = (createdAt: string) => {
    const birth = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const remaining = LIFESPAN_MS - (now - birth);
    if (remaining <= 0) return "EXPIRED";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}H ${mins}M`;
  };

  // --- FETCH STREET (寿命内のものをランダムに) ---
  const fetchStreet = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (data) {
      const alive = data.filter(p => (new Date().getTime() - new Date(p.created_at).getTime()) < LIFESPAN_MS);
      if (alive.length > 0) {
        setStreetPost(alive[Math.floor(Math.random() * alive.length)]);
      } else {
        setStreetPost(null);
      }
    }
    setIsLoading(false);
  }, []);

  const fetchKeeps = useCallback(async () => {
    const { data } = await supabase.from('keeps').select('*').order('created_at', { ascending: false });
    if (data) setKeeps(data);
  }, []);

  // --- HANDLE POST (修正済) ---
  const handlePost = async () => {
    if (!postInput.title && !postInput.body && !postInput.image) return;
    setIsLoading(true);
    const { error } = await supabase.from('posts').insert([{ 
      title: postInput.title || 'UNTITLED', 
      body: postInput.body,
      image: postInput.image
    }]);
    
    if (!error) {
      setPostInput({ title: '', body: '', image: '' });
      setMode('MAIN');
      fetchStreet();
    } else {
      console.error(error);
      alert("POST ERROR: SQLでimageカラムを追加したか確認してくれ。");
    }
    setIsLoading(false);
  };

  // --- HANDLE SHARE (シェアから起算で転生) ---
  const handleShare = async () => {
    const item = keeps[currentIndex % keeps.length];
    if (!item) return;
    setIsLoading(true);
    const { error } = await supabase.from('posts').insert([{
      title: item.title.startsWith('♻') ? item.title : `♻ ${item.title}`,
      body: item.body,
      image: item.image
      // created_at は自動で現在時刻になり、ここから168時間スタート
    }]);
    if (!error) {
      alert("STREETへ転生成功。");
      setMode('MAIN');
      fetchStreet();
    }
    setIsLoading(false);
  };

  const handleKeep = async (item: any) => {
    const { error } = await supabase.from('keeps').insert([{ 
      title: item.title, body: item.body, image: item.image 
    }]);
    if (!error) { alert("KEEP SUCCESS"); fetchKeeps(); }
  };

  const fetchWiki = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/random/summary`);
      const data = await res.json();
      setWikiData({ title: data.titles.display.replace(/<[^>]*>/g, ''), content: data.extract });
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => {
    if (mode === 'KEEP') fetchKeeps();
    if (mode === 'MAIN') fetchStreet();
    if (mode === 'WIKI' && !wikiData.title) fetchWiki();
  }, [mode, fetchKeeps, fetchStreet]);

  return (
    <div className="bg-white text-black font-mono h-[100dvh] flex flex-col overflow-hidden border-2 border-black select-none">
      <header className="border-b-4 border-black p-4 flex justify-between items-center bg-white">
        <div className="w-10" />
        <h1 className="text-3xl font-black italic tracking-tighter">07734</h1>
        <div className="text-[10px] font-black border-2 border-black px-1 uppercase leading-none h-5 flex items-center">Live</div>
      </header>

      <main className="flex-grow p-4 relative flex flex-col overflow-hidden bg-white">
        {(mode === 'MAIN' || mode === 'KEEP' || mode === 'WIKI') && (
          <div className="flex flex-col h-full animate-in fade-in">
            <div className="flex-grow border-4 border-black p-4 flex flex-col overflow-hidden bg-white">
              <div className="flex justify-between items-start mb-2">
                <div className="text-[10px] font-black bg-black text-white px-2 uppercase tracking-tighter">
                  {mode === 'MAIN' ? 'Street' : mode === 'WIKI' ? 'Wiki' : 'Alleyway'}
                </div>
                {(mode === 'MAIN' ? streetPost : (mode === 'KEEP' ? keeps[currentIndex % keeps.length] : null)) && (
                  <div className="text-[9px] font-black border border-black px-1 uppercase">
                    TTL: {getRemainingTime(mode === 'MAIN' ? streetPost.created_at : keeps[currentIndex % keeps.length].created_at)}
                  </div>
                )}
              </div>
              
              <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar">
                {mode === 'MAIN' && streetPost ? (
                  <>
                    {streetPost.image && <img src={streetPost.image} className="w-full h-auto border-2 border-black mb-4" />}
                    <h2 className="text-2xl font-black mb-4 underline decoration-4 break-all leading-tight italic">{streetPost.title}</h2>
                    <p className="text-sm font-bold whitespace-pre-wrap">{streetPost.body}</p>
                  </>
                ) : mode === 'WIKI' ? (
                  <>
                    <h2 className="text-2xl font-black mb-4 underline decoration-4 italic">{wikiData.title}</h2>
                    <p className="text-sm font-bold">{wikiData.content}</p>
                  </>
                ) : mode === 'KEEP' && keeps.length > 0 ? (
                  <>
                    {keeps[currentIndex % keeps.length].image && <img src={keeps[currentIndex % keeps.length].image} className="w-full h-auto border-2 border-black mb-4" />}
                    <h2 className="text-2xl font-black mb-4 underline decoration-4 italic">{keeps[currentIndex % keeps.length].title}</h2>
                    <p className="text-sm font-bold whitespace-pre-wrap">{keeps[currentIndex % keeps.length].body}</p>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs italic text-gray-300 font-black uppercase tracking-widest">Nothing_Found</div>
                )}
              </div>

              <div className="mt-4 flex gap-2 pt-2 border-t-2 border-dotted border-black">
                {mode === 'MAIN' && streetPost && <button onClick={() => handleKeep(streetPost)} className="border-2 border-black px-4 py-1 text-[10px] font-black active:invert uppercase">Keep</button>}
                {mode === 'WIKI' && wikiData.title && <button onClick={() => handleKeep({title: wikiData.title, body: wikiData.content})} className="border-2 border-black px-4 py-1 text-[10px] font-black active:invert uppercase">Keep</button>}
                <button className="border-2 border-black px-4 py-1 text-[10px] font-black active:invert italic opacity-20 uppercase">Bite</button>
              </div>
            </div>
            
            <div className="mt-4 h-16">
              {mode === 'MAIN' && <button onClick={fetchStreet} className="w-full h-full border-4 border-black font-black text-xl uppercase active:bg-black active:text-white tracking-tighter">Next Fragment →</button>}
              {mode === 'WIKI' && <button onClick={fetchWiki} className="w-full h-full border-4 border-black font-black text-xl uppercase active:bg-black active:text-white tracking-tighter">Next Wiki →</button>}
              {mode === 'KEEP' && (
                <div className="flex gap-2 h-full">
                  <button onClick={() => setCurrentIndex(prev => prev + 1)} className="flex-1 border-4 border-black font-black uppercase active:invert">Next</button>
                  <button onClick={handleShare} className="flex-1 border-4 border-black font-black uppercase active:bg-black active:text-white tracking-tighter" disabled={isLoading}>Share</button>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'POST' && (
          <div className="flex flex-col h-full space-y-3 animate-in slide-in-from-bottom-4">
             <div className="text-[10px] font-black bg-black text-white px-2 self-start uppercase italic">Deposit_Your_Waste</div>
             <input value={postInput.title} onChange={(e) => setPostInput({...postInput, title: e.target.value})} placeholder="TITLE" className="border-b-4 border-black p-2 outline-none font-black text-2xl uppercase placeholder:text-gray-100" />
             <div className="flex-grow border-4 border-black p-4 flex flex-col min-h-0 bg-white">
               {postInput.image && (
                 <div className="relative mb-2 flex-shrink-0">
                    <img src={postInput.image} className="h-32 w-auto mx-auto border-2 border-black object-contain" />
                    <button onClick={() => setPostInput({...postInput, image: ''})} className="absolute top-0 right-0 bg-black text-white p-1 text-[8px]">X</button>
                 </div>
               )}
               <textarea value={postInput.body} onChange={(e) => setPostInput({...postInput, body: e.target.value})} placeholder="文字情報を入力..." className="flex-grow outline-none text-sm font-bold resize-none custom-scrollbar" />
             </div>
             <div className="flex gap-2 h-16">
               <button onClick={() => fileInputRef.current?.click()} className={`flex-1 border-4 border-black font-black text-[10px] uppercase ${postInput.image ? 'bg-black text-white' : 'bg-white'}`}>
                 {postInput.image ? 'IMAGE OK' : 'ADD IMAGE'}
               </button>
               <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) {
                   const r = new FileReader();
                   r.onload = () => setPostInput({...postInput, image: r.result as string});
                   r.readAsDataURL(file);
                 }
               }} />
               <button onClick={handlePost} className="flex-[2] border-4 border-black font-black text-2xl uppercase active:bg-black active:text-white" disabled={isLoading}>
                 {isLoading ? '...' : 'POST'}
               </button>
             </div>
          </div>
        )}
      </main>

      <footer className="h-20 border-t-4 border-black flex items-stretch bg-white">
        {[
          { m: 'MAIN', icon: '■', label: 'STREET' },
          { m: 'POST', icon: '◎', label: 'POST' },
          { m: 'WIKI', icon: '△', label: 'WIKI' },
          { m: 'KEEP', icon: '▲', label: 'KEEP' }
        ].map((item) => (
          <button key={item.m} onClick={() => setMode(item.m)} className={`flex-1 flex flex-col items-center justify-center border-r-2 border-black last:border-0 ${mode === item.m ? 'bg-black text-white' : 'bg-white text-black'}`}>
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-[7px] font-black tracking-widest">{item.label}</span>
          </button>
        ))}
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: black; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #eee; }
      `}</style>
    </div>
  );
}