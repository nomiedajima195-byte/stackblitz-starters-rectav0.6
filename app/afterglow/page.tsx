"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function Room135() {
  const [mode, setMode] = useState<'HOME' | 'READ' | 'LIST'>('HOME');
  const [content, setContent] = useState<{ type: 'WIKI' | 'IMG', title?: string, body?: string, image?: string } | null>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // お気に入りの読み込み
  useEffect(() => {
    const saved = localStorage.getItem('room135_pure_favs');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  // 読了判定の自動リセットと監視
  useEffect(() => {
    if (mode === 'READ' && scrollRef.current) {
      const el = scrollRef.current;
      const timer = setTimeout(() => {
        // 画像や短いテキストの場合はスクロールなしでNEXTを許可
        if (el.scrollHeight <= el.clientHeight + 20) setCanNext(true);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [content, mode]);

  const toggleFavorite = (item: any) => {
    // 既に存在するかチェック
    const isExist = favorites.find(f => 
      (item.type === 'WIKI' && f.title === item.title) || 
      (item.type === 'IMG' && f.image === item.image)
    );
    
    let newFavs;
    if (isExist) {
      newFavs = favorites.filter(f => f !== isExist);
    } else {
      newFavs = [item, ...favorites];
    }
    
    setFavorites(newFavs);
    localStorage.setItem('room135_pure_favs', JSON.stringify(newFavs));
  };

  const fetchNextFragment = async () => {
    setIsLoading(true);
    setCanNext(false);
    
    // 記事2 : 画像1 の割合 (約66.6%でWiki、33.3%で画像)
    const isWiki = Math.random() < 0.666;

    try {
      if (isWiki) {
        const res = await fetch('https://ja.wikipedia.org/api/rest_v1/page/random/summary');
        const data = await res.json();
        setContent({
          type: 'WIKI',
          title: data.titles.display.replace(/<[^>]*>/g, ''),
          body: data.extract
        });
      } else {
        // APIキー不要の無料画像ソース（キャッシュ回避のためにランダムシードを付与）
        const randomSeed = Math.random().toString(36).substring(7);
        setContent({
          type: 'IMG',
          image: `https://picsum.photos/seed/${randomSeed}/800/1200`
        });
      }
      setMode('READ');
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } catch (e) { 
      console.error("Signal Lost"); 
    }
    
    setIsLoading(false);
  };

  return (
    <div className="bg-white text-black font-serif h-[100dvh] flex flex-col overflow-hidden select-none">
      {/* HEADER */}
      <header className="h-16 flex items-center justify-center border-b border-gray-50 bg-white/90 backdrop-blur-sm z-50 shrink-0">
        <h1 className="text-xl tracking-[0.4em] font-light italic cursor-pointer" onClick={() => setMode('HOME')}>room135</h1>
      </header>

      <main className="flex-grow relative overflow-hidden flex flex-col">
        {/* HOME MODE */}
        {mode === 'HOME' && (
          <div className="flex-grow flex items-center justify-center">
            <button 
              onClick={fetchNextFragment} 
              className="group flex flex-col items-center gap-4 transition-all"
            >
              <div className="w-16 h-16 border border-black rounded-full flex items-center justify-center group-active:scale-90 transition-transform duration-300">
                <div className="w-1.5 h-1.5 bg-black rounded-full" />
              </div>
              <span className="text-[10px] tracking-widest uppercase opacity-40 group-hover:opacity-100 transition-opacity">Start</span>
            </button>
          </div>
        )}

        {/* READ MODE */}
        {mode === 'READ' && content && (
          <div className="h-full flex flex-col animate-in fade-in duration-1000">
            <div 
              ref={scrollRef} 
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                if (scrollHeight - scrollTop <= clientHeight + 30) setCanNext(true);
              }} 
              className="flex-grow overflow-y-auto pt-16 pb-40 px-8 scroll-smooth"
            >
              <div className="max-w-md mx-auto">
                {content.type === 'WIKI' ? (
                  <article>
                    <div className="text-[10px] tracking-[0.3em] opacity-30 mb-8 uppercase italic">Text Fragment</div>
                    <h2 className="text-3xl font-bold mb-10 leading-snug">{content.title}</h2>
                    <p className="text-lg leading-relaxed text-gray-800">{content.body}</p>
                    <div className="mt-12 h-px bg-gray-100 w-full" />
                  </article>
                ) : (
                  <article>
                    <div className="text-[10px] tracking-[0.3em] opacity-30 mb-8 uppercase italic">Visual Fragment</div>
                    <div className="border border-gray-100 p-1 shadow-sm bg-white">
                      <img 
                        src={content.image} 
                        className="w-full h-auto grayscale opacity-90 hover:grayscale-0 hover:opacity-100 transition-all duration-1000" 
                        alt="Drift" 
                      />
                    </div>
                  </article>
                )}
              </div>
            </div>

            {/* Float Navigation */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent flex items-center justify-center z-40">
              <div className="flex gap-16 items-center">
                <button 
                  onClick={() => toggleFavorite(content)} 
                  className={`text-2xl transition-all ${
                    favorites.find(f => (content.type === 'WIKI' ? f.title === content.title : f.image === content.image)) 
                    ? 'scale-125 opacity-100' 
                    : 'opacity-20 hover:opacity-100'
                  }`}
                >
                  ★
                </button>
                <button 
                  onClick={fetchNextFragment} 
                  disabled={!canNext || isLoading} 
                  className={`text-[10px] tracking-[0.4em] uppercase transition-all duration-700 ${canNext ? 'opacity-100' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                >
                  {isLoading ? '...' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LIST MODE (Archive) */}
        {mode === 'LIST' && (
          <div className="h-full overflow-y-auto px-8 py-20 bg-[#fafafa]">
             <div className="max-w-md mx-auto">
                <h3 className="text-[10px] tracking-[0.3em] uppercase opacity-30 mb-12 text-center">Collection</h3>
                <div className="space-y-8">
                  {favorites.length > 0 ? favorites.map((fav, i) => (
                    <div key={i} className="group border-l border-black pl-4 py-1 hover:border-l-4 transition-all">
                      {fav.type === 'WIKI' ? (
                        <span className="text-sm font-medium opacity-60 group-hover:opacity-100 transition-opacity cursor-default">{fav.title}</span>
                      ) : (
                        <img src={fav.image} className="w-24 h-24 object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all shadow-sm" />
                      )}
                    </div>
                  )) : (
                    <div className="text-center italic opacity-20 text-sm">Empty room.</div>
                  )}
                </div>
             </div>
          </div>
        )}
      </main>

      {/* GLOBAL FOOTER */}
      <footer className="h-16 border-t border-gray-50 flex items-center px-8 shrink-0 bg-white z-50">
        <button 
          onClick={() => { setMode(mode === 'LIST' ? 'HOME' : 'LIST'); setContent(null); }} 
          className={`text-xl transition-all ${mode === 'LIST' ? 'opacity-100 scale-110' : 'opacity-20 hover:opacity-100'}`}
        >
          ★
        </button>
      </footer>
    </div>
  );
}