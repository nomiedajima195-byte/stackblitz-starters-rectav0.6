"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function Room135() {
  const [mode, setMode] = useState<'HOME' | 'READ' | 'LIST'>('HOME');
  const [content, setContent] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 創作のスパイス（ここが増えるほど爆発力が増す）
  const contexts = ["ライトノベル", "劇画", "格付けチェック", "終末もの", "超低予算B級映画", "異世界転生", "NHK教育", "ドキュメンタリー"];
  const rules = ["全員コウモリ顔", "語尾が『利息』", "常に土下座", "予算が100円", "重力が2倍", "主人公が透明人間", "全員が自分のことを秋田銀行員だと思い込んでいる"];

  useEffect(() => {
    const saved = localStorage.getItem('room135_hybrid_favs');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (mode === 'READ' && scrollRef.current) {
      const el = scrollRef.current;
      const timer = setTimeout(() => {
        if (el.scrollHeight <= el.clientHeight + 10) setCanNext(true);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [content, mode]);

  const fetchNextFragment = async () => {
    setIsLoading(true);
    setCanNext(false);
    
    // 確率: Wiki(45%) / Image(45%) / CLASH(10%)
    const rand = Math.random();
    let nextType = 'WIKI';
    if (rand > 0.45 && rand <= 0.9) nextType = 'IMG';
    if (rand > 0.9) nextType = 'CLASH';

    try {
      if (nextType === 'WIKI') {
        const res = await fetch('https://ja.wikipedia.org/api/rest_v1/page/random/summary');
        const data = await res.json();
        setContent({
          type: 'WIKI',
          title: data.titles.display.replace(/<[^>]*>/g, ''),
          body: data.extract
        });
      } else if (nextType === 'IMG') {
        const seed = Math.random().toString(36).substring(7);
        setContent({ type: 'IMG', image: `https://picsum.photos/seed/${seed}/800/1200` });
      } else {
        // --- 概念衝突 (CLASH) ---
        const res = await fetch('https://ja.wikipedia.org/api/rest_v1/page/random/summary');
        const data = await res.json();
        setContent({
          type: 'CLASH',
          subject: data.title,
          context: contexts[Math.floor(Math.random() * contexts.length)],
          rule: rules[Math.floor(Math.random() * rules.length)]
        });
      }
      setMode('READ');
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } catch (e) { console.error("Signal Lost"); }
    setIsLoading(false);
  };

  return (
    <div className="bg-white text-black font-serif h-[100dvh] flex flex-col overflow-hidden select-none">
      <header className="h-16 flex items-center justify-center border-b border-gray-50 bg-white z-50 shrink-0">
        <h1 className="text-xl tracking-[0.4em] font-light italic cursor-pointer" onClick={() => setMode('HOME')}>room135</h1>
      </header>

      <main className="flex-grow relative overflow-hidden flex flex-col">
        {mode === 'HOME' && (
          <div className="flex-grow flex items-center justify-center">
            <button onClick={fetchNextFragment} className="w-16 h-16 border border-black rounded-full flex items-center justify-center active:scale-90 transition-all">
              <div className="w-1 h-1 bg-black rounded-full" />
            </button>
          </div>
        )}

        {mode === 'READ' && content && (
          <div className="h-full flex flex-col animate-in fade-in duration-700">
            <div ref={scrollRef} onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              if (scrollHeight - scrollTop <= clientHeight + 30) setCanNext(true);
            }} className="flex-grow overflow-y-auto pt-16 pb-40 px-8">
              
              <div className="max-w-md mx-auto">
                {content.type === 'WIKI' && (
                  <article>
                    <div className="text-[10px] tracking-[0.3em] opacity-30 mb-8 uppercase italic">Text Fragment</div>
                    <h2 className="text-3xl font-bold mb-10 leading-snug">{content.title}</h2>
                    <p className="text-lg leading-relaxed text-gray-800">{content.body}</p>
                  </article>
                )}

                {content.type === 'IMG' && (
                  <article>
                    <div className="text-[10px] tracking-[0.3em] opacity-30 mb-8 uppercase italic">Visual Fragment</div>
                    <img src={content.image} className="w-full h-auto grayscale opacity-90 border border-gray-100" />
                  </article>
                )}

                {content.type === 'CLASH' && (
                  <article className="py-12 px-6 bg-black text-white rounded-sm shadow-2xl transform -rotate-1">
                    <div className="text-[9px] tracking-[0.4em] text-orange-500 mb-6 uppercase font-bold">Concept Collision</div>
                    <div className="text-2xl font-black italic mb-6 leading-tight underline decoration-orange-500 underline-offset-8">
                      {content.subject}
                    </div>
                    <div className="text-xl font-bold mb-2">× {content.context}</div>
                    <div className="h-px bg-white/20 w-full my-4" />
                    <div className="text-[10px] opacity-60 leading-relaxed uppercase tracking-widest">
                      Rule: <span className="text-orange-500">{content.rule}</span>
                    </div>
                  </article>
                )}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent flex items-center justify-center z-40">
              <div className="flex gap-16 items-center">
                <button onClick={() => {
                  setFavorites([content, ...favorites]);
                  localStorage.setItem('room135_hybrid_favs', JSON.stringify([content, ...favorites]));
                }} className="text-2xl opacity-10 hover:opacity-100 transition-opacity">★</button>
                <button 
                  onClick={fetchNextFragment} 
                  disabled={!canNext || isLoading} 
                  className={`text-[10px] tracking-[0.4em] uppercase transition-all duration-700 ${canNext ? 'opacity-100' : 'opacity-0 translate-y-4'}`}
                >
                  {isLoading ? '...' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="h-16 border-t border-gray-50 flex items-center px-8 shrink-0 bg-white">
        <button onClick={() => setMode('HOME')} className="text-xl opacity-10">★</button>
      </footer>
    </div>
  );
}