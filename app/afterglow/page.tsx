"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONNECTION ---
const SUPABASE_URL = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sn_NxTgpLdu_ZFZ5-dcriA_Z5NYkr-_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function EngineFullConnect() {
  const [mode, setMode] = useState('WIKI'); 
  const [timeLeft, setTimeLeft] = useState(45);
  const [isClosed, setIsClosed] = useState(false);
  
  // DATA STATES
  const [wikiData, setWikiData] = useState({ title: '', content: '' });
  const [streetPost, setStreetPost] = useState<any>(null);
  const [keeps, setKeeps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [postInput, setPostInput] = useState({ title: '', body: '' });

  // --- INITIALIZE ---
  useEffect(() => {
    fetchWikiFull();
    fetchKeeps();
    fetchStreet();

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { setIsClosed(true); return 0; }
        return prev - 1;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // --- WIKIPEDIA API (FULL TEXT) ---
  const fetchWikiFull = async () => {
    setIsLoading(true);
    setWikiData({ title: 'LOADING...', content: '' });
    try {
      const resR = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/random/title`);
      const dataR = await resR.json();
      const title = dataR.items[0].title;

      const resC = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/mobile-sections/${encodeURIComponent(title)}`);
      const dataC = await resC.json();
      
      const clean = (html: string) => html ? html.replace(/<[^>]*>/g, '').trim() : '';
      const lead = clean(dataC.lead.sections[0].text);
      const remaining = dataC.remaining ? dataC.remaining.sections.map((s: any) => clean(s.text)).join('\n\n') : '';

      setWikiData({ title: dataC.lead.displaytitle || title, content: lead + '\n\n' + remaining });
    } catch (e) {
      setWikiData({ title: 'ERROR', content: 'データの取得に失敗した。' });
    }
    setIsLoading(false);
  };

  // --- SUPABASE ACTIONS ---
  const fetchStreet = async () => {
    const { data } = await supabase.from('posts').select('*').limit(10); // 簡易的に10件取得
    if (data && data.length > 0) setStreetPost(data[Math.floor(Math.random() * data.length)]);
  };

  const handlePost = async () => {
    if (!postInput.title || !postInput.body) return;
    const { error } = await supabase.from('posts').insert([
      { title: postInput.title, body: postInput.body }
    ]);
    if (!error) {
      setPostInput({ title: '', body: '' });
      setMode('MAIN');
      fetchStreet();
    }
  };

  const handleKeep = async (title: string, body: string, source: string) => {
    const { error } = await supabase.from('keeps').insert([
      { title, body, source }
    ]);
    if (!error) {
      alert("横丁へ運んだ。");
      fetchKeeps();
    }
  };

  const fetchKeeps = async () => {
    const { data } = await supabase.from('keeps').select('*').order('created_at', { ascending: false });
    if (data) setKeeps(data);
  };

  if (isClosed) return (
    <div className="bg-white text-black h-screen flex flex-col items-center justify-center font-mono border-[20px] border-black text-center p-10">
      <h1 className="text-4xl font-black mb-4 italic italic">07734</h1>
      <p className="text-xl border-y-2 border-black py-2 px-8 uppercase">閉店</p>
    </div>
  );

  return (
    <div className="bg-white text-black font-mono h-[100dvh] flex flex-col overflow-hidden border-2 border-black">
      {/* HEADER */}
      <header className="border-b-4 border-black p-4 flex justify-between items-center bg-white">
        <div className="w-10" />
        <h1 className="text-3xl font-black italic tracking-tighter">07734</h1>
        <span className="text-[10px] font-bold border-2 border-black px-1 leading-none h-5 flex items-center">{timeLeft}M</span>
      </header>

      <main className="flex-grow p-4 relative flex flex-col overflow-hidden">
        
        {/* STREET (MAIN) */}
        {mode === 'MAIN' && (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="flex-grow border-4 border-black p-6 flex flex-col overflow-hidden">
              <div className="text-[10px] font-bold border border-black px-2 self-start mb-4 uppercase">Street_Rubbish</div>
              {streetPost ? (
                <>
                  <h2 className="text-2xl font-black mb-4 underline decoration-4 break-words">{streetPost.title}</h2>
                  <div className="flex-grow overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">{streetPost.body}</div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => handleKeep(streetPost.title, streetPost.body, 'USER')} className="border-2 border-black px-4 py-1 text-[10px] font-bold active:invert">KEEP</button>
                    <button className="border-2 border-black px-4 py-1 text-[10px] font-bold active:invert italic">BITE</button>
                  </div>
                </>
              ) : (
                <div className="flex-grow flex items-center justify-center text-xs italic text-gray-300">STREET IS EMPTY...</div>
              )}
            </div>
            <button onClick={fetchStreet} className="mt-4 border-4 border-black py-6 font-black text-xl active:bg-black active:text-white uppercase tracking-tighter">Next_Encounter →</button>
          </div>
        )}

        {/* POST MODE */}
        {mode === 'POST' && (
          <div className="flex flex-col h-full space-y-4 animate-in slide-in-from-bottom-4">
            <div className="text-[10px] font-bold bg-black text-white px-2 self-start uppercase">New_Post</div>
            <input value={postInput.title} onChange={(e) => setPostInput({...postInput, title: e.target.value})} placeholder="TITLE" className="border-b-4 border-black p-2 outline-none font-bold text-xl" />
            <textarea value={postInput.body} onChange={(e) => setPostInput({...postInput, body: e.target.value})} placeholder="1000文字以内で何かを捨てろ..." className="flex-grow border-4 border-black p-4 outline-none text-sm resize-none" />
            <div className="flex space-x-2">
              <button onClick={() => setMode('MAIN')} className="flex-1 border-4 border-black py-4 font-black text-2xl active:invert">×</button>
              <button onClick={handlePost} className="flex-[3] border-4 border-black py-4 font-black text-2xl uppercase active:bg-black active:text-white">Post</button>
            </div>
          </div>
        )}

        {/* WIKI MODE */}
        {mode === 'WIKI' && (
          <div className="flex flex-col h-full">
            <div className={`flex-grow border-4 border-black p-6 flex flex-col overflow-hidden ${isLoading ? 'opacity-30' : ''}`}>
              <div className="text-[10px] font-bold bg-black text-white px-2 self-start mb-4 uppercase">Wiki_Fragment</div>
              <h2 className="text-2xl font-black mb-4 underline decoration-4 break-words">{wikiData.title}</h2>
              <div className="flex-grow overflow-y-auto text-sm leading-relaxed border-t-2 border-black pt-4 whitespace-pre-wrap">{wikiData.content}</div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              <button onClick={fetchWikiFull} className="col-span-3 border-4 border-black py-6 font-black text-xl active:invert uppercase">Next_Wiki →</button>
              <button onClick={() => handleKeep(wikiData.title, wikiData.content, 'WIKI')} className="border-4 border-black font-black uppercase text-xs">Keep</button>
            </div>
          </div>
        )}

        {/* KEEP MODE (横丁) */}
        {mode === 'KEEP' && (
          <div className="flex flex-col h-full">
            <div className="text-[10px] font-bold bg-black text-white px-2 self-start mb-2 uppercase italic">Alleyway ({keeps.length})</div>
            <div className="flex-grow border-4 border-black p-6 flex flex-col overflow-hidden">
              {keeps.length > 0 ? (
                <>
                  <h3 className="text-xl font-black mb-4 underline decoration-2">{keeps[currentIndex % keeps.length].title}</h3>
                  <div className="flex-grow overflow-y-auto text-sm whitespace-pre-wrap mb-4">{keeps[currentIndex % keeps.length].body}</div>
                  <div className="text-[8px] opacity-40 uppercase border-t border-dotted border-black pt-2">
                    Expires: {new Date(keeps[currentIndex % keeps.length].expires_at).toLocaleString()}
                  </div>
                </>
              ) : (
                <div className="flex-grow flex items-center justify-center text-xs italic text-gray-300 uppercase">Empty_Alleyway</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={() => setCurrentIndex(prev => prev + 1)} className="border-4 border-black py-4 font-black uppercase">Next_Keep</button>
              <button className="border-4 border-black py-4 font-black uppercase active:invert">Share</button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="h-20 border-t-4 border-black flex items-stretch">
        {[
          { m: 'MAIN', icon: '■', label: 'STREET' },
          { m: 'POST', icon: '◎', label: 'POST' },
          { m: 'WIKI', icon: '△', label: 'WIKI' },
          { m: 'KEEP', icon: '▲', label: 'KEEP' }
        ].map((item) => (
          <button key={item.m} onClick={() => { setMode(item.m); if(item.m === 'KEEP') fetchKeeps(); }}
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