"use client";

import React, { useState, useEffect } from 'react';

export default function EngineWhiteAnonymized() {
  const [mode, setMode] = useState('WIKI'); 
  const [timeLeft, setTimeLeft] = useState(45);
  const [isClosed, setIsClosed] = useState(false);
  const [wikiData, setWikiData] = useState({ title: '...', extract: '...' });
  const [isLoading, setIsLoading] = useState(false);
  const [keeps, setKeeps] = useState<any[]>([]);
  const [postInput, setPostInput] = useState({ title: '', body: '' });
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const savedKeeps = JSON.parse(localStorage.getItem('07734_keeps') || '[]');
    setKeeps(savedKeeps);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { setIsClosed(true); return 0; }
        return prev - 1;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchWiki = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/random/summary`);
      const data = await res.json();
      setWikiData({ title: data.title, extract: data.extract });
    } catch (e) { setWikiData({ title: 'ERROR', extract: '通信失敗' }); }
    setIsLoading(false);
  };

  const handleKeep = (item: any) => {
    const newKeep = { ...item, kept_at: Date.now(), expires_at: Date.now() + (168 * 60 * 60 * 1000) };
    const updated = [newKeep, ...keeps];
    setKeeps(updated);
    localStorage.setItem('07734_keeps', JSON.stringify(updated));
  };

  if (isClosed) return (
    <div className="bg-white text-black h-screen flex flex-col items-center justify-center font-mono border-[20px] border-black text-center">
      <h1 className="text-4xl font-black mb-4 italic">07734</h1>
      <p className="text-xl border-y-2 border-black py-2 px-8">今日は閉店⭐︎</p>
    </div>
  );

  return (
    <div className="bg-white text-black font-mono h-[100dvh] flex flex-col overflow-hidden border-2 border-black">
      {/* HEADER: 番号を消し、中央にロゴ、右に時間 */}
      <header className="border-b-4 border-black p-4 flex justify-between items-center bg-white">
        <div className="w-12"></div> {/* スペース確保用 */}
        <h1 className="text-3xl font-black italic tracking-[ -0.1em]">07734</h1>
        <span className="text-[10px] font-bold border border-black px-1">{timeLeft}M</span>
      </header>

      <main className="flex-grow p-4 relative flex flex-col overflow-hidden">
        {/* WIKI MODE */}
        {mode === 'WIKI' && (
          <div className="flex flex-col h-full">
            <div className={`flex-grow border-4 border-black p-6 bg-white flex flex-col ${isLoading ? 'opacity-20' : ''}`}>
              <div className="text-[10px] font-bold bg-black text-white px-2 self-start mb-4">WIKI_FRAG</div>
              <h2 className="text-2xl font-black mb-4 underline decoration-4">{wikiData.title}</h2>
              <div className="flex-grow overflow-y-auto text-sm leading-relaxed">{wikiData.extract}</div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              <button onClick={fetchWiki} className="col-span-3 border-4 border-black py-6 font-black text-xl active:bg-black active:text-white uppercase tracking-tighter">NEXT_WIKI →</button>
              <button onClick={() => handleKeep(wikiData)} className="border-4 border-black font-black active:bg-black active:text-white uppercase text-xs text-center flex items-center justify-center">Keep</button>
            </div>
          </div>
        )}

        {/* POST MODE */}
        {mode === 'POST' && (
          <div className="flex flex-col h-full space-y-4">
            <div className="text-[10px] font-bold bg-black text-white px-2 self-start uppercase">New_Post</div>
            <input 
              value={postInput.title}
              onChange={(e) => setPostInput({...postInput, title: e.target.value})}
              placeholder="TITLE" 
              className="border-b-2 border-black p-2 outline-none font-bold placeholder:text-gray-300" 
            />
            <textarea 
              value={postInput.body}
              onChange={(e) => setPostInput({...postInput, body: e.target.value})}
              placeholder="1000文字以内の何か..." 
              className="flex-grow border-2 border-black p-4 outline-none text-sm resize-none" 
            />
            <div className="flex space-x-2">
              <button onClick={() => setMode('WIKI')} className="flex-1 border-2 border-black py-4 font-black text-2xl active:bg-black active:text-white">×</button>
              <button className="flex-[3] border-2 border-black py-4 font-black text-xl uppercase active:bg-black active:text-white">→ Post</button>
            </div>
          </div>
        )}

        {/* KEEP/STREET のプレースホルダーは維持 */}
        {mode !== 'WIKI' && mode !== 'POST' && (
          <div className="flex-grow flex items-center justify-center italic text-gray-300">
            {mode} AREA
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
          <button 
            key={item.m}
            onClick={() => { setMode(item.m); if(item.m === 'WIKI') fetchWiki(); }}
            className={`flex-1 flex flex-col items-center justify-center ${mode === item.m ? 'bg-black text-white' : 'bg-white text-black'} border-r border-gray-100 last:border-0`}
          >
            <span className="text-xl leading-none mb-1">{item.icon}</span>
            <span className="text-[7px] font-black tracking-[0.2em]">{item.label}</span>
          </button>
        ))}
      </footer>
    </div>
  );
}