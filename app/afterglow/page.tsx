"use client";

import React, { useState, useEffect } from 'react';

export default function Engine90s() {
  const [userNo] = useState("00412");
  const [isClosed, setIsClosed] = useState(false);
  const [mode, setMode] = useState('MAIN'); // MAIN, DEPOSIT, SCRAP
  const [currentIndex, setCurrentIndex] = useState(0);

  // 90s的な「粗い」モックデータ
  const [data] = useState([
    { id: '001', title: '焼肉交差点', body: '安中市。看板が焼肉屋なのか交差点名なのか不明。空腹時に通るのは危険。', source: 'USER:09210', bit: true },
    { id: '002', title: '三河木綿', body: '綿。それ以上でも以下でもない。しかし触れればその重みがわかる。', source: 'WIKIPEDIA', bit: false },
    { id: '003', title: '焼きそば弁当', body: '北海道限定。スープを捨てるな。再利用しろ。それが掟だ。', source: 'WIKIPEDIA', bit: true }
  ]);

  useEffect(() => {
    // 45-60分制限
    const limit = (Math.floor(Math.random() * 16) + 45) * 60 * 1000;
    const entry = localStorage.getItem('07734_t');
    const now = Date.now();

    if (!entry) {
      localStorage.setItem('07734_t', now.toString());
    } else if (now - parseInt(entry) > limit) {
      setIsClosed(true);
    }
  }, []);

  if (isClosed) return (
    <div className="bg-black text-white h-screen flex flex-col items-center justify-center font-mono">
      <div className="border-4 border-double border-white p-10 text-center">
        <h1 className="text-4xl mb-4 font-black">07734 ERROR</h1>
        <p className="text-xl">今日は閉店⭐︎</p>
        <p className="mt-4 text-[10px] opacity-50">RE-OPEN AFTER 12 HOURS OF SILENCE</p>
      </div>
    </div>
  );

  const current = data[currentIndex];

  return (
    <div className="bg-black text-gray-400 font-mono h-[100dvh] flex flex-col border-4 border-gray-900 overflow-hidden">
      {/* HEADER: 無機質な情報表示 */}
      <header className="border-b-2 border-gray-900 p-2 flex justify-between items-center text-[10px] bg-gray-950">
        <span className="text-blue-600 font-bold">U_ID: {userNo}</span>
        <span className="text-white tracking-widest uppercase font-black">07734_SYSTEM_v0.7</span>
        <span className="text-red-600 animate-pulse">● REC</span>
      </header>

      {/* CONTENT: 90s的な「枠」のデザイン */}
      <main className="flex-grow p-4 relative flex flex-col">
        {mode === 'DEPOSIT' ? (
          <div className="flex-grow border-2 border-white p-4 bg-black flex flex-col">
            <div className="text-[10px] mb-2 bg-white text-black px-1 self-start">POST_DATA_FRAGMENT</div>
            <input placeholder="TITLE..." className="bg-transparent border-b border-gray-800 mb-4 p-2 text-white outline-none" />
            <textarea placeholder="1000文字以内で記述せよ..." className="bg-transparent border border-gray-800 flex-grow p-4 outline-none text-xs resize-none" />
            <button className="mt-4 bg-white text-black font-bold py-3 hover:bg-gray-300 active:translate-y-1 transition-transform uppercase italic">
              Street に放流する
            </button>
          </div>
        ) : (
          <div className="flex-grow flex flex-col">
            <div className="flex-grow border-2 border-gray-700 p-6 relative bg-gray-950/50">
              {/* 齧り跡: 90s的なドット感のある欠けをイメージ */}
              {current.bit && <div className="absolute -top-1 -left-1 w-8 h-8 bg-black border-b-2 border-r-2 border-gray-700" />}
              
              <div className="text-[9px] mb-4 text-gray-600 uppercase tracking-tighter">[{current.source}] ID: {current.id}</div>
              <h2 className="text-3xl text-white font-black mb-6 tracking-tighter">{current.title}</h2>
              <div className="text-sm leading-relaxed border-t border-gray-900 pt-4">
                {current.body}
              </div>
            </div>

            <button 
              onClick={() => setCurrentIndex((prev) => (prev + 1) % data.length)}
              className="mt-4 border-4 border-white text-white py-6 font-black text-lg hover:bg-white hover:text-black active:bg-blue-600 transition-all uppercase tracking-tighter"
            >
              NEXT_ENCOUNTER →
            </button>
          </div>
        )}
      </main>

      {/* FOOTER: 90sゲーム機のようなボタン群 */}
      <footer className="h-20 border-t-2 border-gray-900 flex items-stretch bg-gray-950">
        <button onClick={() => setMode('MAIN')} className={`flex-1 flex flex-col items-center justify-center border-r border-gray-900 ${mode === 'MAIN' ? 'bg-white text-black' : ''}`}>
          <div className="w-4 h-4 border-2 border-current mb-1" />
          <span className="text-[8px] font-bold">SURPRISE</span>
        </button>
        <button onClick={() => setMode('DEPOSIT')} className={`flex-1 flex flex-col items-center justify-center border-r border-gray-900 ${mode === 'DEPOSIT' ? 'bg-white text-black' : ''}`}>
          <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center mb-1">
            <div className="w-1.5 h-1.5 bg-current rounded-full" />
          </div>
          <span className="text-[8px] font-bold">DEPOSIT</span>
        </button>
        <button onClick={() => setMode('SCRAP')} className={`flex-1 flex flex-col items-center justify-center ${mode === 'SCRAP' ? 'bg-white text-black' : ''}`}>
          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[14px] border-b-current mb-1" />
          <span className="text-[8px] font-bold">SCRAP</span>
        </button>
      </footer>
    </div>
  );
}