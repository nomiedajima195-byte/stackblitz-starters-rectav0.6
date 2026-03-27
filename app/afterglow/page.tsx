"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function Room135() {
  const [mode, setMode] = useState<'HOME' | 'READ' | 'LIST'>('HOME');
  const [content, setContent] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 狂気の文脈プール（大幅増量）
  const contexts = [
    "ライトノベル", "格付けチェック", "火曜サスペンス劇場", "クローズアップ現代", 
    "情熱大陸", "深夜のノリ", "クトゥルフ神話TRPG", "謝罪会見", 
    "恋愛シミュレーション", "NHKのど自慢", "深夜の通販番組", "デスゲーム",
    "ドキュメント72時間", "子供向けアニメ", "裁判の証人喚問", "YouTuberの謝罪動画"
  ];
  
  // 狂気のルールプール（大幅増量）
  const rules = [
    "全員コウモリ顔", "常に土下座", "語尾が『利息』", "予算が100円", 
    "登場人物が全員裏切り者", "急にミュージカルになる", "なぜか最後に爆破オチ", 
    "主人公が記憶喪失", "制限時間5分", "全員が知ったかぶりをしている",
    "物理法則がたまに無視される", "常に見えない観客の笑い声が聞こえる", "服を着たら即死"
  ];

  useEffect(() => {
    const saved = localStorage.getItem('room135_v2.6_favs');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (mode === 'READ' && scrollRef.current) {
      const el = scrollRef.current;
      const timer = setTimeout(() => {
        if (el.scrollHeight <= el.clientHeight + 10) setCanNext(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [content, mode]);

  const fetchNextFragment = async () => {
    setIsLoading(true);
    setCanNext(false);
    setCopied(false);
    
    // 画像を廃止。単一Wiki記事(約70%) か Wiki×Wikiの衝突(約30%) のみ
    const isCollision = Math.random() > 0.7;

    try {
      if (!isCollision) {
        const res = await fetch('https://ja.wikipedia.org/api/rest_v1/page/random/summary');
        const data = await res.json();
        setContent({
          type: 'SINGLE',
          title: data.titles.display.replace(/<[^>]*>/g, ''),
          body: data.extract
        });
      } else {
        // --- Wiki × Wiki の衝突 ---
        // 2つの記事を同時に取得する
        const [resA, resB] = await Promise.all([
          fetch('https://ja.wikipedia.org/api/rest_v1/page/random/summary'),
          fetch('https://ja.wikipedia.org/api/rest_v1/page/random/summary')
        ]);
        const dataA = await resA.json();
        const dataB = await resB.json();

        setContent({
          type: 'COLLISION',
          titleA: dataA.titles.display.replace(/<[^>]*>/g, ''),
          titleB: dataB.titles.display.replace(/<[^>]*>/g, ''),
          context: contexts[Math.floor(Math.random() * contexts.length)],
          rule: rules[Math.floor(Math.random() * rules.length)]
        });
      }
      setMode('READ');
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } catch (e) { console.error("Signal Lost"); }
    setIsLoading(false);
  };

  const handleCopy = () => {
    if (!content) return;
    let textToCopy = "";
    if (content.type === 'COLLISION') {
      textToCopy = `【${content.titleA}】 × 【${content.titleB}】\n舞台・文脈：${content.context}\n特殊条件：${content.rule}`;
    } else {
      textToCopy = `【${content.title}】\n${content.body}`;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white text-black font-serif h-[100dvh] flex flex-col overflow-hidden select-none">
      <header className="h-16 flex items-center justify-center border-b border-gray-50 bg-white/90 z-50 shrink-0">
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
          <div className="h-full flex flex-col animate-in fade-in duration-500">
            <div ref={scrollRef} onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              if (scrollHeight - scrollTop <= clientHeight + 30) setCanNext(true);
            }} className="flex-grow overflow-y-auto pt-20 pb-40 px-8">
              
              <div className="max-w-md mx-auto">
                {content.type === 'SINGLE' && (
                  <article>
                    <div className="text-[10px] tracking-[0.3em] opacity-30 mb-8 uppercase italic">Text Fragment</div>
                    <h2 className="text-3xl font-bold mb-10 leading-snug">{content.title}</h2>
                    <p className="text-lg leading-relaxed text-gray-800">{content.body}</p>
                  </article>
                )}

                {content.type === 'COLLISION' && (
                  <article className="py-4">
                    <div className="text-[10px] tracking-[0.3em] opacity-30 mb-12 uppercase italic text-center">Concept Collision</div>
                    
                    <h2 className="text-3xl font-bold mb-6 leading-tight text-center">{content.titleA}</h2>
                    <div className="text-center text-xl opacity-20 my-6">×</div>
                    <h2 className="text-3xl font-bold mb-12 leading-tight text-center">{content.titleB}</h2>
                    
                    <div className="mt-12 p-6 border border-gray-100 bg-gray-50/50">
                      <div className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="text-[9px] border border-black px-1 opacity-50 uppercase tracking-widest">Context</span>
                        {content.context}
                      </div>
                      <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <span className="text-[9px] border border-black px-1 opacity-50 uppercase tracking-widest">Rule</span>
                        {content.rule}
                      </div>
                    </div>
                  </article>
                )}

                {/* COPY BUTTON */}
                <div className="mt-12 flex justify-center">
                  <button 
                    onClick={handleCopy}
                    className="text-[10px] tracking-[0.2em] border border-gray-200 px-4 py-2 uppercase hover:bg-black hover:text-white transition-colors"
                  >
                    {copied ? 'Copied to Clipboard' : 'Copy Fragment'}
                  </button>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent flex items-center justify-center z-40">
              <div className="flex gap-16 items-center">
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
    </div>
  );
}