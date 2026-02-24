"use client";

import React, { useState, useEffect } from 'react';

export default function EngineWhiteAPI() {
  const [userNo] = useState("00412");
  const [mode, setMode] = useState('MAIN'); 
  const [timeLeft, setTimeLeft] = useState(45);
  const [isClosed, setIsClosed] = useState(false);
  
  // Wikipediaデータ用のステート
  const [wikiData, setWikiData] = useState({ title: 'LOADING...', extract: '...' });
  const [isLoading, setIsLoading] = useState(false);

  // Wikipediaからランダムな記事を取得する関数
  const fetchWiki = async () => {
    setIsLoading(true);
    try {
      // ランダムな1記事を取得するAPI
      const res = await fetch(
        `https://ja.wikipedia.org/api/rest_v1/page/random/summary`
      );
      const data = await res.json();
      setWikiData({
        title: data.title,
        extract: data.extract
      });
    } catch (error) {
      setWikiData({ title: 'ERROR', extract: '通信に失敗した。' });
    }
    setIsLoading(false);
  };

  // 最初にWIKIモードに切り替わった時や、初期化時に取得
  useEffect(() => {
    fetchWiki();
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsClosed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  if (isClosed) return (
    <div className="bg-white text-black h-screen flex flex-col items-center justify-center font-mono border-[20px] border-black">
      <h1 className="text-4xl font-black mb-4 italic">07734</h1>
      <p className="text-xl border-y-2 border-black py-2 px-8">今日は閉店⭐︎</p>
    </div>
  );

  return (
    <div className="bg-white text-black font-mono h-[100dvh] flex flex-col overflow-hidden border-2 border-black">
      <header className="border-b-4 border-black p-4 flex justify-between items-baseline bg-white">
        <span className="text-xs font-bold tracking-tighter">NO.{userNo}</span>
        <h1 className="text-2xl font-black italic tracking-tighter">07734</h1>
        <span className="text-xs font-bold">{timeLeft}M LEFT</span>
      </header>

      <main className="flex-grow p-4 relative flex flex-col">
        
        {/* WIKI MODE (△) */}
        {mode === 'WIKI' && (
          <div className="flex flex-col h-full animate-in fade-in duration-150">
            <div className={`flex-grow border-4 border-black p-6 bg-white flex flex-col ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
              <div className="text-[10px] font-bold bg-black text-white px-2 self-start mb-4 uppercase">Wiki_Random</div>
              
              <h2 className="text-2xl font-black mb-6 underline decoration-4 break-words">
                {wikiData.title}
              </h2>
              
              <div className="flex-grow overflow-y-auto text-sm leading-relaxed border-t-2 border-dotted border-gray-300 pt-4">
                {wikiData.extract || "概要データが見つかりませんでした。"}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4">
              <button 
                onClick={fetchWiki}
                className="col-span-3 border-4 border-black py-6 font-black text-xl active:bg-black active:text-white uppercase tracking-tighter"
              >
                NEXT_WIKI →
              </button>
              <button className="border-4 border-black py-6 font-black flex items-center justify-center active:bg-black active:text-white">
                KEEP
              </button>
            </div>
          </div>
        )}

        {/* その他のモード（MAIN, POST, KEEP）は前回のロジックを継承 */}
        {mode !== 'WIKI' && (
          <div className="flex-grow flex items-center justify-center italic text-gray-400">
            {mode} AREA (WIKIをテストしてくれ)
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="h-20 border-t-4 border-black flex items-stretch bg-white">
        <button onClick={() => setMode('MAIN')} className={`flex-1 flex flex-col items-center justify-center ${mode === 'MAIN' ? 'bg-black text-white' : ''}`}>
          <div className="w-5 h-5 border-2 border-current mb-1" /><span className="text-[8px] font-black uppercase">Street</span>
        </button>
        <button onClick={() => setMode('POST')} className={`flex-1 flex flex-col items-center justify-center ${mode === 'POST' ? 'bg-black text-white' : ''}`}>
          <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center mb-1"><div className="w-2 h-2 bg-current rounded-full" /></div>
          <span className="text-[8px] font-black uppercase">Post</span>
        </button>
        <button onClick={() => { setMode('WIKI'); fetchWiki(); }} className={`flex-1 flex flex-col items-center justify-center ${mode === 'WIKI' ? 'bg-black text-white' : ''}`}>
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[18px] border-b-current mb-1" /><span className="text-[8px] font-black uppercase">Wiki</span>
        </button>
        <button onClick={() => setMode('KEEP')} className={`flex-1 flex flex-col items-center justify-center ${mode === 'KEEP' ? 'bg-black text-white' : ''}`}>
          <div className="w-4 h-4 border-2 border-current bg-current mb-1" /><span className="text-[8px] font-black uppercase">Keep</span>
        </button>
      </footer>
    </div>
  );
}