import React, { useState, useEffect, useRef } from 'react';

const APP_NAME = "07734";

export default function App() {
  const [status, setStatus] = useState('entry'); // entry, loading, content
  const [article, setArticle] = useState({ title: '', extract: '', pageid: null });
  const [canProceed, setCanProceed] = useState(false);
  const scrollRef = useRef(null);

  // Wikipedia APIからランダムな記事を取得
  const fetchRandomArticle = async () => {
    setStatus('loading');
    setCanProceed(false);
    try {
      // 1. ランダムな記事のIDを取得
      const randomRes = await fetch(
        `https://ja.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=1&origin=*`
      );
      const randomData = await randomRes.json();
      const pageid = randomData.query.random[0].id;

      // 2. 記事の内容（要約）を取得
      const contentRes = await fetch(
        `https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&pageids=${pageid}&origin=*`
      );
      const contentData = await contentRes.json();
      const page = contentData.query.pages[pageid];

      setArticle({
        title: page.title,
        extract: page.extract || "（本文なし）",
        pageid: pageid
      });
      setStatus('content');
    } catch (error) {
      console.error("遭遇に失敗しました", error);
      setStatus('entry');
    }
  };

  // スクロール検知ロジック
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    // 下限まで到達したか判定（5pxのバッファ）
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      setCanProceed(true);
    }
  };

  if (status === 'entry') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-mono">
        <h1 className="text-6xl mb-12 tracking-tighter opacity-80">{APP_NAME}</h1>
        <button 
          onClick={fetchRandomArticle}
          className="border border-white px-8 py-2 hover:bg-white hover:text-black transition-all duration-300"
        >
          START ENCOUNTER
        </button>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white font-mono">
        <div className="animate-pulse text-sm">ACCESSING RANDOM NODE...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-gray-300 font-mono p-4 md:p-12">
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-2">
        <span className="text-xs tracking-widest uppercase">Rubbish / Latency: 168h</span>
        <span className="text-xs">ID: {article.pageid}</span>
      </header>

      <main className="flex-grow flex flex-col max-w-2xl mx-auto w-full">
        {/* キャッチコピー（現在は暫定的にタイトルを表示） */}
        <div className="mb-12">
          <span className="text-xs text-gray-600 block mb-2 underline">FRAGMENT:</span>
          <h2 className="text-2xl text-white leading-relaxed">
             {article.title}
          </h2>
        </div>

        {/* 強制スクロールエリア */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-grow overflow-y-scroll mb-8 border-l border-gray-900 pl-6 leading-loose text-sm select-none"
          style={{ maxHeight: '50vh' }}
        >
          {article.extract.split('\n').map((para, i) => (
            <p key={i} className="mb-6">{para}</p>
          ))}
          <div className="h-20" /> {/* 余白 */}
        </div>

        <div className="flex justify-center pb-12">
          {canProceed ? (
            <button 
              onClick={fetchRandomArticle}
              className="border border-white text-white px-12 py-3 hover:bg-white hover:text-black transition-all duration-300 animate-bounce"
            >
              NEXT ENCOUNTER
            </button>
          ) : (
            <span className="text-xs text-gray-700">SCROLL TO THE END TO PROCEED</span>
          )}
        </div>
      </main>
    </div>
  );
}