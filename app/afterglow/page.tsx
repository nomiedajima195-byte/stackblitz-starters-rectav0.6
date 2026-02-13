"use client";

import React, { useState, useRef } from 'react';

const APP_NAME = "07734";

// 型定義
interface Article {
  title: string;
  extract: string;
  pageid: number | null;
}

export default function App() {
  const [status, setStatus] = useState<'entry' | 'loading' | 'content'>('entry');
  const [article, setArticle] = useState<Article>({ title: '', extract: '', pageid: null });
  const [canProceed, setCanProceed] = useState(false);
  
  // HTMLDivElementの型を指定してuseRefを初期化
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchRandomArticle = async () => {
    setStatus('loading');
    setCanProceed(false);
    try {
      // 1. ランダムな記事IDを取得
      const randomRes = await fetch(
        `https://ja.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=1&origin=*`
      );
      const randomData = await randomRes.json();
      const pageid = randomData.query.random[0].id;

      // 2. 詳細文を取得（exintroを外し、全文をプレーンテキストで取得）
      const contentRes = await fetch(
        `https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext&pageids=${pageid}&origin=*`
      );
      const contentData = await contentRes.json();
      const page = contentData.query.pages[pageid];

      setArticle({
        title: page.title,
        extract: page.extract || "（本文データなし。次の遭遇へ進んでください）",
        pageid: pageid
      });
      setStatus('content');
    } catch (error) {
      console.error("遭遇失敗", error);
      setStatus('entry');
    }
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    // スクロール判定（一番下まで到達したか）
    // el.scrollHeight（全体の高さ） - el.scrollTop（現在の位置）が el.clientHeight（見えている高さ）とほぼ一致するか
    const isBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 50; // 50pxの余裕
    if (isBottom) {
      setCanProceed(true);
    }
  };

  if (status === 'entry') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white font-mono overflow-hidden p-4">
        <h1 className="text-7xl md:text-9xl mb-12 tracking-tighter opacity-90 border-b border-white select-none">
          {APP_NAME}
        </h1>
        <button 
          onClick={fetchRandomArticle}
          className="border border-white px-10 py-3 hover:bg-white hover:text-black transition-all duration-500 text-lg"
        >
          START ENCOUNTER
        </button>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white font-mono">
        <div className="animate-pulse tracking-[0.3em] text-xs">SYNCHRONIZING WITH RANDOM NODE...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-gray-300 font-mono overflow-hidden">
      {/* HEADER */}
      <header className="p-4 border-b border-gray-900 flex justify-between text-[10px] tracking-widest text-gray-600 select-none">
        <div>RUBBISH_NODE_ID: {article.pageid}</div>
        <div>STRICT_MODE: READ_MANDATORY</div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow flex flex-col p-6 overflow-hidden max-w-4xl mx-auto w-full">
        <div className="mb-8 pt-4">
          <span className="text-[10px] text-gray-600 block mb-2 underline tracking-widest uppercase">Target Subject:</span>
          <h2 className="text-2xl md:text-4xl text-white font-bold tracking-tight border-l-4 border-white pl-4 leading-tight">
            {article.title}
          </h2>
        </div>

        {/* SCROLLABLE TEXT AREA */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-grow overflow-y-auto pr-4 text-base md:text-lg leading-relaxed scroll-smooth"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 #000' }} 
        >
          <div className="py-4 opacity-80">
            {article.extract.split('\n').map((para, i) => (
              <p key={i} className="mb-10">{para}</p>
            ))}
          </div>
          
          {/* BOTTOM BUFFER & TRIGGER AREA */}
          <div className="h-[30vh] flex flex-col items-center justify-center border-t border-gray-900 mt-20 opacity-40">
            <p className="text-xs uppercase tracking-[0.5em] mb-4">Fragment Consumed</p>
            <div className="w-px h-20 bg-gradient-to-b from-gray-600 to-transparent"></div>
          </div>
        </div>

        {/* NEXT BUTTON AREA */}
        <div className="h-32 flex items-center justify-center mt-4">
          {canProceed ? (
            <button 
              onClick={fetchRandomArticle}
              className="w-full max-w-md border border-white text-white py-5 hover:bg-white hover:text-black transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
            >
              PROCEED TO NEXT FRAGMENT
            </button>
          ) : (
            <div className="text-[10px] text-gray-700 animate-pulse tracking-[0.4em] text-center border border-gray-900 px-8 py-4">
              --- EXHAUST THE TEXT TO UNLOCK NEXT ---
            </div>
          )}
        </div>
      </main>

      {/* FOOTER INDICATOR */}
      <footer className="p-2 border-t border-gray-950 text-[8px] text-center text-gray-800 tracking-[0.5em] uppercase select-none">
        Everything will be erased after 168 hours.
      </footer>
    </div>
  );
}