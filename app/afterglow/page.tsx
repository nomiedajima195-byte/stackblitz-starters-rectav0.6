"use client";

import React, { useState, useEffect } from 'react';

export default function New07734() {
  const [userNo] = useState("00412");
  const [limit, setLimit] = useState(0);
  const [isClosed, setIsClosed] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 仮のデータ（本来はWikipedia/Supabaseから取得）
  const [items, setItems] = useState([
    { id: 1, type: 'user', title: '焼肉交差点', content: '群馬県安中市。看板のインパクトが強すぎて事故りそうになる。', user_no: '09210', bytes: 12 },
    { id: 2, type: 'wiki', title: '焼きそば弁当', content: '北海道のソウルフード。戻し湯でスープを作るシステムを考えた人は天才。', user_no: null, bytes: 0 },
    { id: 3, type: 'user', title: 'アルフォス', content: 'スペイン。歴史が積み重なりすぎて、もはや何層目か分からない石の街。', user_no: '00388', bytes: 3 },
  ]);

  useEffect(() => {
    const randomLimit = Math.floor(Math.random() * (60 - 45 + 1)) + 45;
    setLimit(randomLimit);
    const entryTime = localStorage.getItem('07734_entry_time');
    const now = new Date().getTime();

    if (!entryTime) {
      localStorage.setItem('07734_entry_time', now.toString());
    } else {
      const elapsed = (now - parseInt(entryTime)) / (1000 * 60);
      if (elapsed > randomLimit) setIsClosed(true);
    }
  }, []);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  if (isClosed) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white font-mono p-10 text-center">
        <h1 className="text-6xl mb-8 tracking-tighter opacity-20 italic">07734</h1>
        <div className="border border-white/30 p-8">
          <p className="text-xl mb-4">今日は閉店⭐︎</p>
          <p className="text-[10px] text-gray-500 tracking-[0.3em]">RE-OPEN_IN_12H</p>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-gray-200 font-mono overflow-hidden">
      {/* HEADER */}
      <header className="flex justify-between items-center p-4 border-b border-gray-900 text-[10px] tracking-widest">
        <div className="text-blue-500">NO.{userNo}</div>
        <div className="text-white text-lg font-bold">07734</div>
        <div className="text-gray-600">LMT:{limit}m</div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-grow relative flex flex-col p-6 overflow-hidden">
        {isDepositing ? (
          /* DEPOSIT画面 */
          <div className="absolute inset-0 z-50 bg-black p-6 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-8 border-b border-gray-900 pb-2">
              <span className="text-[10px] tracking-[0.3em]">DEPOSIT_FRAGMENTS</span>
              <button onClick={() => setIsDepositing(false)} className="text-2xl">×</button>
            </div>
            <input type="text" placeholder="TITLE" className="bg-transparent border-b border-gray-800 p-2 mb-6 outline-none text-white font-bold placeholder:text-gray-800" />
            <textarea 
              placeholder="1000文字以内で「何か」を落とせ..." 
              maxLength={1000} 
              className="bg-transparent border border-gray-800 flex-grow p-4 outline-none resize-none text-sm text-gray-400 placeholder:text-gray-800"
            ></textarea>
            <button className="mt-6 border border-white py-4 hover:bg-white hover:text-black active:scale-95 transition-all uppercase tracking-widest text-xs">
              Street に捨てる
            </button>
          </div>
        ) : (
          /* 表示画面 */
          <div className="flex flex-col h-full">
            <div className="flex-grow border border-gray-800 p-6 bg-gray-900/10 relative rounded-sm">
              {/* BITE MARK */}
              {currentItem.bytes > 0 && (
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-black border border-gray-800 rounded-full" />
              )}
              
              <div className="text-[9px] mb-4 text-gray-600">
                {currentItem.type === 'wiki' ? 'SOURCE: WIKIPEDIA' : `SELECTED BY NO.${currentItem.user_no}`}
              </div>
              <h2 className="text-2xl text-white mb-6 font-bold">{currentItem.title}</h2>
              <p className="text-sm leading-relaxed text-gray-400">{currentItem.content}</p>
            </div>

            <button 
              onClick={handleNext} 
              className="mt-6 w-full border border-gray-600 py-6 text-xs tracking-[0.5em] hover:border-white hover:text-white active:bg-white active:text-black transition-all"
            >
              NEXT_FRAGMENT →
            </button>
          </div>
        )}
      </main>

      {/* BOTTOM TOOLBAR */}
      <nav className="h-20 border-t border-gray-900 flex items-center justify-around px-4 bg-black">
        <button onClick={() => {setIsDepositing(false); handleNext();}} className="flex flex-col items-center gap-1 group">
          <div className="w-5 h-5 border-2 border-gray-600 group-hover:border-white" />
          <span className="text-[8px]">SURPRISE</span>
        </button>
        <button onClick={() => setIsDepositing(true)} className="flex flex-col items-center gap-1 group">
          <div className={`w-10 h-10 rounded-full border-2 ${isDepositing ? 'border-white' : 'border-gray-600'} flex items-center justify-center`}>
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
          <span className="text-[8px]">DEPOSIT</span>
        </button>
        <button className="flex flex-col items-center gap-1 opacity-40">
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[18px] border-b-gray-600" />
          <span className="text-[8px]">SCRAP</span>
        </button>
      </nav>
    </div>
  );
}