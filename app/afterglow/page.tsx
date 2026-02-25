"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sn_NxTgpLdu_ZFZ5-dcriA_Z5NYkr-_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const LIFESPAN_MS = 168 * 60 * 60 * 1000;

export default function EngineSingleBite() {
  const [mode, setMode] = useState('MAIN'); 
  const [streetPost, setStreetPost] = useState<any>(null);
  const [keeps, setKeeps] = useState<any[]>([]);
  const [wikiData, setWikiData] = useState({ title: '', content: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBiting, setIsBiting] = useState(false); // 振動エフェクト用

  const [postInput, setPostInput] = useState({ title: '', body: '', image: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- SINGLE BITE STYLE ---
  const getBiteStyle = (count: number) => {
    if (!count || count === 0) return {};
    // 何回食われても、この一定の角度で「一つ」の噛み跡
    return {
      clipPath: `polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 0% 100%)`,
      transition: 'clip-path 0.3s ease-out'
    };
  };

  const fetchStreet = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from('posts').select('*');
    if (data) {
      const alive = data.filter(p => (new Date().getTime() - new Date(p.created_at).getTime()) < LIFESPAN_MS);
      setStreetPost(alive.length > 0 ? alive[Math.floor(Math.random() * alive.length)] : null);
    }
    setIsLoading(false);
  }, []);

  const handleKeep = async (item: any) => {
    if (!item) return;
    setIsBiting(true); // 振動開始
    setTimeout(() => setIsBiting(false), 500); // 0.5秒で止める

    const { error: keepErr } = await supabase.from('keeps').insert([{ 
      title: item.title, body: item.body, image: item.image 
    }]);
    
    if (!keepErr && mode === 'MAIN' && item.id) {
      // 裏でカウントは増やすが、見た目は「一つ」のまま
      await supabase.from('posts').update({ bites_count: (item.bites_count || 0) + 1 }).eq('id', item.id);
      fetchStreet();
    }
  };

  const handlePost = async () => {
    if (!postInput.title && !postInput.body && !postInput.image) return;
    setIsLoading(true);
    const { error } = await supabase.from('posts').insert([{ title: postInput.title || 'UNTITLED', body: postInput.body, image: postInput.image }]);
    if (!error) { setPostInput({ title: '', body: '', image: '' }); setMode('MAIN'); fetchStreet(); }
    setIsLoading(false);
  };

  useEffect(() => {
    if (mode === 'KEEP') {
      supabase.from('keeps').select('*').order('created_at', { ascending: false }).then(({data}) => data && setKeeps(data));
    }
    if (mode === 'MAIN') fetchStreet();
  }, [mode, fetchStreet]);

  return (
    <div className="bg-white text-black font-mono h-[100dvh] flex flex-col overflow-hidden select-none">
      <header className="h-10 border-b-2 border-black flex items-center justify-between px-4 shrink-0 bg-white z-20">
        <h1 className="text-xl font-black italic tracking-tighter">07734</h1>
        <span className="text-[8px] font-black uppercase">{mode}</span>
      </header>

      <main className="flex-grow relative flex flex-col overflow-hidden bg-[#e0e0e0] p-3">
        {(mode === 'MAIN' || mode === 'KEEP') && (
          <div className={`flex flex-col h-full relative transition-transform ${isBiting ? 'animate-shake' : ''}`}>
            <div 
              style={mode === 'MAIN' ? getBiteStyle(streetPost?.bites_count) : {}}
              className="flex-grow overflow-y-auto custom-scrollbar p-6 bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
            >
              {(mode === 'MAIN' ? streetPost : keeps[currentIndex % keeps.length]) ? (
                <article>
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-black text-white text-[9px] px-2 py-0.5 font-black uppercase">
                      {mode === 'MAIN' ? `STREET [Bite:${streetPost?.bites_count || 0}]` : 'STOCK'}
                    </span>
                  </div>

                  {(mode === 'MAIN' ? streetPost : keeps[currentIndex % keeps.length]).image && (
                    <img src={(mode === 'MAIN' ? streetPost : keeps[currentIndex % keeps.length]).image} className="w-full h-auto border-2 border-black mb-6" />
                  )}
                  <h2 className="text-3xl font-black mb-6 underline decoration-4 italic">
                    {(mode === 'MAIN' ? streetPost : keeps[currentIndex % keeps.length]).title}
                  </h2>
                  <p className="text-base font-bold whitespace-pre-wrap leading-relaxed pb-32">
                    {(mode === 'MAIN' ? streetPost : keeps[currentIndex % keeps.length]).body}
                  </p>
                </article>
              ) : (
                <div className="h-full flex items-center justify-center italic text-gray-300">NO DATA IN STREET</div>
              )}
            </div>

            {/* Float Actions */}
            <div className="absolute bottom-8 left-4 right-4 flex gap-3">
              <button 
                onClick={mode === 'MAIN' ? fetchStreet : () => setCurrentIndex(prev => prev + 1)} 
                className="flex-[3] h-16 bg-black text-white font-black text-xl active:scale-95 shadow-[4px_4px_0px_0px_rgba(80,80,80,1)] uppercase"
              >
                {mode === 'MAIN' ? 'NEXT →' : 'FLIP'}
              </button>
              <button 
                onClick={() => handleKeep(mode === 'MAIN' ? streetPost : null)}
                className="flex-1 h-16 border-4 border-black bg-white font-black text-xs active:bg-black active:text-white uppercase"
              >
                Keep
              </button>
            </div>
          </div>
        )}

        {/* POST MODE (省略) */}
        {mode === 'POST' && (
           <div className="h-full flex flex-col p-4 bg-white border-4 border-black">
             <input value={postInput.title} onChange={(e) => setPostInput({...postInput, title: e.target.value})} placeholder="TITLE" className="border-b-4 border-black p-2 outline-none font-black text-2xl uppercase mb-4" />
             <textarea value={postInput.body} onChange={(e) => setPostInput({...postInput, body: e.target.value})} placeholder="捨て去る..." className="flex-grow outline-none text-lg font-bold resize-none mb-4" />
             <button onClick={handlePost} className="h-16 bg-black text-white font-black text-xl uppercase">POST</button>
           </div>
        )}
      </main>

      <footer className="h-16 border-t-2 border-black flex bg-white shrink-0">
        {['MAIN', 'POST', 'WIKI', 'KEEP'].map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 flex flex-col items-center justify-center border-r border-black last:border-0 ${mode === m ? 'bg-black text-white' : 'bg-white'}`}>
            <span className="text-lg leading-none">{m === 'MAIN' ? '■' : m === 'POST' ? '◎' : m === 'WIKI' ? '△' : '▲'}</span>
            <span className="text-[7px] font-black uppercase mt-1">{m}</span>
          </button>
        ))}
      </footer>

      <style jsx global>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          20% { transform: translate(-3px, 0px) rotate(-1deg); }
          40% { transform: translate(3px, 2px) rotate(1deg); }
          60% { transform: translate(-3px, 1px) rotate(-1deg); }
          80% { transform: translate(3px, 1px) rotate(1deg); }
          100% { transform: translate(1px, -2px) rotate(0deg); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: black; }
      `}</style>
    </div>
  );
}