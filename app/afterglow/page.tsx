"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function Room135() {
  const [mode, setMode] = useState<'HOME' | 'READ' | 'LIST'>('HOME');
  const [article, setArticle] = useState<{ title: string; extract: string; url: string } | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('room135_favs');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const toggleFavorite = (title: string) => {
    let newFavs;
    if (favorites.includes(title)) {
      newFavs = favorites.filter(f => f !== title);
    } else {
      newFavs = [...favorites, title];
    }
    setFavorites(newFavs);
    localStorage.setItem('room135_favs', JSON.stringify(newFavs));
  };

  const fetchRandom = async () => {
    setIsLoading(true);
    setCanNext(false);
    try {
      const res = await fetch('https://ja.wikipedia.org/api/rest_v1/page/random/summary');
      const data = await res.json();
      
      // ここでHTMLタグを除去。displaytitleに含まれる<span>等を取り除く
      const cleanTitle = data.titles.display.replace(/<[^>]*>/g, '');
      
      setArticle({
        title: cleanTitle,
        extract: data.extract,
        url: data.content_urls.desktop.page
      });
      setMode('READ');
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } catch (e) {
      console.error("Signal Lost");
    }
    setIsLoading(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setCanNext(true);
    }
  };

  return (
    <div className="bg-white text-black font-serif h-[100dvh] flex flex-col overflow-hidden select-none">
      <header className="h-16 flex items-center justify-center border-b border-gray-100 shrink-0">
        <h1 className="text-xl tracking-[0.2em] font-light italic">room135</h1>
      </header>

      <main className="flex-grow relative overflow-hidden flex flex-col">
        {mode === 'HOME' && (
          <div className="flex-grow flex items-center justify-center">
            <button onClick={fetchRandom} className="group flex flex-col items-center gap-4">
              <div className="w-16 h-16 border border-black rounded-full flex items-center justify-center group-active:scale-90 transition-transform">
                <div className="w-2 h-2 bg-black rounded-full" />
              </div>
              <span className="text-[10px] tracking-widest uppercase opacity-40">Start</span>
            </button>
          </div>
        )}

        {mode === 'READ' && article && (
          <div className="h-full flex flex-col">
            <div ref={scrollRef} onScroll={handleScroll} className="flex-grow overflow-y-auto px-8 pt-12 pb-32">
              <div className="max-w-md mx-auto">
                <h2 className="text-3xl font-bold mb-8 leading-tight">{article.title}</h2>
                <p className="text-lg leading-relaxed text-gray-800">{article.extract}</p>
                <div className="mt-12 h-px bg-gray-100 w-full" />
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white to-transparent flex items-center justify-between px-8 z-10">
              <div className="flex gap-12 items-center mx-auto">
                <button onClick={() => toggleFavorite(article.title)} className="text-2xl">
                  {favorites.includes(article.title) ? '★' : '☆'}
                </button>
                <button onClick={fetchRandom} disabled={!canNext || isLoading} className={`text-sm tracking-widest uppercase transition-opacity duration-500 ${canNext ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  {isLoading ? '...' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'LIST' && (
          <div className="h-full overflow-y-auto px-8 py-12">
            <div className="max-w-md mx-auto">
              <h3 className="text-[10px] tracking-[0.3em] uppercase opacity-30 mb-12 text-center">Collection</h3>
              <ul className="space-y-6">
                {favorites.length > 0 ? favorites.map((fav, i) => (
                  <li key={i} className="group flex items-baseline gap-4">
                    <span className="text-[8px] opacity-20">0{i+1}</span>
                    <span className="text-base font-medium border-b border-transparent group-hover:border-black transition-all cursor-crosshair">{fav}</span>
                  </li>
                )) : (
                  <li className="text-center italic opacity-20 text-sm">No records found.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className="h-16 border-t border-gray-100 flex items-center px-8 shrink-0 bg-white z-20">
        <button 
          onClick={() => setMode(mode === 'LIST' ? 'HOME' : 'LIST')}
          className={`text-xl transition-all ${mode === 'LIST' ? 'scale-110' : 'opacity-20 hover:opacity-100'}`}
        >
          ★
        </button>
      </footer>
    </div>
  );
}