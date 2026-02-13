"use client";

import React, { useState, useEffect, useRef } from 'react';

const APP_NAME = "07734";

export default function App() {
  const [status, setStatus] = useState('entry'); 
  const [article, setArticle] = useState({ title: '', extract: '', pageid: null, imageUrl: '' });
  const [canProceed, setCanProceed] = useState(false);
  const scrollRef = useRef(null);

  const fetchRandomArticle = async () => {
    setStatus('loading');
    setCanProceed(false);
    try {
      const randomRes = await fetch(
        `https://ja.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=1&origin=*`
      );
      const randomData = await randomRes.json();
      const pageid = randomData.query.random[0].id;

      // propにpageimagesを追加、pithumbsizeで画像の大きさを指定
      const contentRes = await fetch(
        `https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageimages&explaintext&pithumbsize=1000&pageids=${pageid}&origin=*`
      );
      const contentData = await contentRes.json();
      const page = contentData.query.pages[pageid];

      setArticle({
        title: page.title,
        extract: page.extract || "（本文データなし）",
        pageid: pageid,
        imageUrl: page.thumbnail ? page.thumbnail.source : '' // 画像があればURLを入れる
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
    const isBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
    if (isBottom) setCanProceed(true);
  };

  if (status === 'entry') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white font-mono overflow-hidden">
        <h1 className="text-8xl mb-12 tracking-tighter opacity-90 border-b border-white">{APP_NAME}</h1>
        <button onClick={fetchRandomArticle} className="border border-white px-10 py-3 hover:bg-white hover:text-black transition-all">START</button>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white font-mono">
        <div className="animate-pulse">LOADING FRAGMENT...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-gray-300 font-mono overflow-hidden">
      <header className="p-4 border-b border-gray-900 flex justify-between text-[10px] tracking-widest text-gray-600">
        <div>RUBBISH_NODE_ID: {article.pageid}</div>
        <div>STRICT_MODE: ACTIVE</div>
      </header>

      <main className="flex-grow flex flex-col p-6 overflow-hidden max-w-3xl mx-auto w-full">
        <div className="mb-6 pt-4">
          <h2 className="text-3xl text-white font-bold tracking-tight border-l-4 border-white pl-4 uppercase">
            {article.title}
          </h2>
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-grow overflow-y-auto pr-4 text-base leading-relaxed scrollbar-hide">
          {/* 画像セクション：あれば表示 */}
          {article.imageUrl && (
            <div className="mb-8 border border-gray-800 p-1 bg-gray-900/30">
              <img 
                src={article.imageUrl} 
                alt={article.title} 
                className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-700 opacity-80"
              />
              <p className="text-[9px] text-gray-600 mt-1 text-center italic font-sans">VISUAL_FRAGMENT_ID: {article.pageid}</p>
            </div>
          )}

          <div className="py-4">
            {article.extract.split('\n').map((para, i) => (
              <p key={i} className="mb-8">{para}</p>
            ))}
          </div>
          <div className="h-[20vh] flex items-center justify-center border-t border-gray-900 mt-12">
            <p className="text-xs text-gray-600 uppercase tracking-[0.2em]">End of Fragment</p>
          </div>
        </div>

        <div className="h-24 flex items-center justify-center mt-4">
          {canProceed ? (
            <button onClick={fetchRandomArticle} className="w-full border border-white text-white py-4 hover:bg-white hover:text-black transition-all">NEXT</button>
          ) : (
            <div className="text-[10px] text-gray-700 animate-pulse tracking-widest">--- READ TO THE BOTTOM TO RELEASE ---</div>
          )}
        </div>
      </main>
    </div>
  );
}