"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sn_NxTgpLdu_ZFZ5-dcriA_Z5NYkr-_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function EngineRecirculation() {
  const [mode, setMode] = useState('WIKI'); 
  const [timeLeft, setTimeLeft] = useState(45);
  const [isClosed, setIsClosed] = useState(false);
  
  const [wikiData, setWikiData] = useState({ title: '', content: '' });
  const [streetPost, setStreetPost] = useState<any>(null);
  const [keeps, setKeeps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [postInput, setPostInput] = useState({ title: '', body: '' });

  const cleanTags = (str: string) => str ? str.replace(/<[^>]*>/g, '').trim() : '';

  const fetchWikiSummary = async () => {
    setIsLoading(true);
    setWikiData({ title: 'CONNECTING...', content: '' });
    try {
      const res = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/random/summary`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setWikiData({ title: cleanTags(data.titles.display), content: cleanTags(data.extract) });
    } catch (e) {
      setWikiData({ title: 'SIGNAL ERROR', content: '再試行してください。' });
    }
    setIsLoading(false);
  };

  const fetchKeeps = useCallback(async () => {
    const { data } = await supabase.from('keeps').select('*').order('created_at', { ascending: false });
    if (data) setKeeps(data);
  }, []);

  const fetchStreet = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from('posts').select('*');
    if (data && data.length > 0) {
      setStreetPost(data[Math.floor(Math.random() * data.length)]);
    }
    setIsLoading(false);
  }, []);

  const handlePost = async () => {
    if (!postInput.title || !postInput.body) return;
    const { error } = await supabase.from('posts').insert([{ title: postInput.title, body: postInput.body }]);
    if (!error) {
      setPostInput({ title: '', body: '' });
      setMode('MAIN');
      fetchStreet();
    }
  };

  const handleKeep = async (title: string, body: string, source: string) => {
    if (!title || title.includes('...')) return;
    const { error } = await supabase.from('keeps').insert([{ title, body, source }]);
    if (!error) {
      alert("保存完了");
      fetchKeeps();
    }
  };

  // --- NEW: SHARE FUNCTION (Recirculate to Street) ---
  const handleShare = async () => {
    const currentKeep = keeps[currentIndex % keeps.length];
    if (!currentKeep) return;

    setIsLoading(true);
    const { error } = await supabase.from('posts').insert([
      { 
        title: `♻ ${currentKeep.title}`, // シェアされたことがわかるマーク
        body: currentKeep.body 
      }
    ]);

    if (!error) {
      alert("ストリートへ再放流した。");
      setMode('MAIN');
      fetchStreet();
    } else {
      alert("シェア失敗。");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (mode === 'KEEP') fetchKeeps();
    if (mode === 'MAIN') fetchStreet();
    if (mode === 'WIKI' && !wikiData.title) fetchWikiSummary();
  }, [mode, fetchKeeps, fetchStreet]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { setIsClosed(true); return 0; }
        return prev - 1;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  if (isClosed) return (
    <div className="bg-white text-black h-screen flex flex-col items-center justify-center font-mono border-[20px] border-black text-center p-10 select-none font-black uppercase">
      <h1 className="text-4xl italic mb-4">07734</h1>
      <p className="text-xl border-y-2 border-black py-2 px-8">Closed</p>
    </div>
  );

  return (
    <div className="bg-white text-black font-mono h-[100dvh] flex flex-col overflow-hidden border-2 border-black select-none">
      <header className="border-b-4 border-black p-4 flex justify-between items-center bg-white">
        <div className="w-10" />
        <h1 className="text-3xl font-black italic tracking-tighter">07734</h1>
        <span className="text-[10px] font-black border-2 border-black px-1 leading-none h-5 flex items-center">{timeLeft}M</span>
      </header>

      <main className="flex-grow p-4 relative flex flex-col overflow-hidden">
        {mode === 'WIKI' && (
          <div className="flex flex-col h-full animate-in fade-in">
            <div className={`flex-grow border-4 border-black p-6 flex flex-col overflow-hidden bg-white ${isLoading ? 'opacity-20' : 'opacity-100'}`}>
              <div className="text-[10px] font-black border-2 border-black px-2 self-start mb-4 uppercase">Fragment</div>
              <h2 className="text-2xl font-black mb-4 underline decoration-4 break-all leading-tight">{wikiData.title}</h2>
              <div className="flex-grow overflow-y-auto text-sm leading-relaxed border-t-2 border-black pt-4 font-bold">{wikiData.content}</div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              <button onClick={fetchWikiSummary} className="col-span-3 border-4 border-black py-6 font-black text-xl active:bg-black active:text-white uppercase tracking-tighter" disabled={isLoading}>{isLoading ? "..." : "Next →"}</button>
              <button onClick={() => handleKeep(wikiData.title, wikiData.content, 'WIKI')} className="border-4 border-black font-black uppercase text-xs active:invert" disabled={isLoading}>Keep</button>
            </div>
          </div>
        )}

        {mode === 'MAIN' && (
          <div className="flex flex-col h-full">
            <div className="flex-grow border-4 border-black p-6 flex flex-col overflow-hidden bg-white">
              <div className="text-[10px] font-black bg-black text-white px-2 self-start mb-4 uppercase tracking-tighter">Street</div>
              {streetPost ? (
                <>
                  <h2 className="text-2xl font-black mb-4 underline decoration-4 break-all leading-tight">{streetPost.title}</h2>
                  <div className="flex-grow overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap font-bold">{streetPost.body}</div>
                  <div className="mt-4 flex gap-2 pt-2 border-t-2 border-dotted border-black">
                    <button onClick={() => handleKeep(streetPost.title, streetPost.body, 'USER')} className="border-2 border-black px-4 py-1 text-[10px] font-black active:invert">KEEP</button>
                    <button className="border-2 border-black px-4 py-1 text-[10px] font-black active:invert italic opacity-20">BITE</button>
                  </div>
                </>
              ) : (
                <div className="flex-grow flex items-center justify-center text-xs italic text-gray-300 uppercase font-black">Signals Empty</div>
              )}
            </div>
            <button onClick={fetchStreet} className="mt-4 border-4 border-black py-6 font-black text-xl active:bg-black active:text-white uppercase tracking-tighter">Next Encounter →</button>
          </div>
        )}

        {mode === 'POST' && (
          <div className="flex flex-col h-full space-y-4">
            <div className="text-[10px] font-black bg-black text-white px-2 self-start uppercase">Deposit_Fragment</div>
            <input value={postInput.title} onChange={(e) => setPostInput({...postInput, title: e.target.value})} placeholder="TITLE" className="border-b-4 border-black p-2 outline-none font-black text-2xl uppercase" />
            <textarea value={postInput.body} onChange={(e) => setPostInput({...postInput, body: e.target.value})} placeholder="捨てる言葉を入力..." className="flex-grow border-4 border-black p-4 outline-none text-sm resize-none font-bold" />
            <div className="flex space-x-2">
              <button onClick={() => setMode('MAIN')} className="flex-1 border-4 border-black py-4 font-black text-2xl active:invert">×</button>
              <button onClick={handlePost} className="flex-[3] border-4 border-black py-4 font-black text-2xl uppercase active:bg-black active:text-white">Post</button>
            </div>
          </div>
        )}

        {mode === 'KEEP' && (
          <div className="flex flex-col h-full">
            <div className="text-[10px] font-black bg-black text-white px-2 self-start mb-2 uppercase italic tracking-widest">Alleyway ({keeps.length})</div>
            <div className={`flex-grow border-4 border-black p-6 flex flex-col overflow-hidden bg-white ${isLoading ? 'opacity-20' : 'opacity-100'}`}>
              {keeps.length > 0 ? (
                <>
                  <h3 className="text-xl font-black mb-4 underline decoration-2">{keeps[currentIndex % keeps.length].title}</h3>
                  <div className="flex-grow overflow-y-auto text-sm whitespace-pre-wrap mb-4 font-bold">{keeps[currentIndex % keeps.length].body}</div>
                  <div className="text-[8px] opacity-40 uppercase border-t border-dotted border-black pt-2 font-black italic">
                    Lifespan: 168 Hours
                  </div>
                </>
              ) : (
                <div className="flex-grow flex items-center justify-center text-xs italic text-gray-300 uppercase font-black tracking-widest">Nothing_Kept</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={() => setCurrentIndex(prev => prev + 1)} className="border-4 border-black py-4 font-black uppercase active:invert tracking-widest">Next</button>
              <button onClick={handleShare} className="border-4 border-black py-4 font-black uppercase active:bg-black active:text-white tracking-widest" disabled={isLoading}>Share</button>
            </div>
          </div>
        )}
      </main>

      <footer className="h-20 border-t-4 border-black flex items-stretch">
        {[
          { m: 'MAIN', icon: '■', label: 'STREET' },
          { m: 'POST', icon: '◎', label: 'POST' },
          { m: 'WIKI', icon: '△', label: 'WIKI' },
          { m: 'KEEP', icon: '▲', label: 'KEEP' }
        ].map((item) => (
          <button key={item.m} onClick={() => setMode(item.m)}
            className={`flex-1 flex flex-col items-center justify-center border-r-2 border-black last:border-0 ${mode === item.m ? 'bg-black text-white' : 'bg-white text-black'}`}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-[7px] font-black tracking-widest">{item.label}</span>
          </button>
        ))}
      </footer>
    </div>
  );
}