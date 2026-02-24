"use client";

import React, { useState, useEffect } from 'react';

export default function EngineWhite() {
  const [userNo] = useState("00412");
  const [mode, setMode] = useState('MAIN'); // MAIN, POST, WIKI, KEEP
  const [timeLeft, setTimeLeft] = useState(45);
  const [isClosed, setIsClosed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // モックデータ：他人のポスト
  const [feed] = useState([
    { id: '101', title: '焼肉交差点', body: '看板のフォントが90年代のままで止まっている。', user_no: '08821', bit: false },
    { id: '102', title: '三河木綿', body: 'この手触りは、デジタルでは絶対に再現できない。', user_no: '00321', bit: true }
  ]);

  useEffect(() => {
    // 45分カウントダウン
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
      {/* HEADER */}
      <header className="border-b-4 border-black p-4 flex justify-between items-baseline bg-white">
        <span className="text-xs font-bold tracking-tighter">NO.{userNo}</span>
        <h1 className="text-2xl font-black italic tracking-tighter">07734</h1>
        <span className="text-xs font-bold">{timeLeft}M LEFT</span>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow p-4 relative flex flex-col overflow-y-auto">
        
        {/* POST MODE: 画像とテキスト */}
        {mode === 'POST' && (
          <div className="flex flex-col h-full space-y-4">
            <div className="text-[10px] font-bold bg-black text-white px-2 self-start uppercase">New_Post</div>
            <div className="w-full aspect-video border-2 border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400">
              IMAGE_CLICK_TO_UPLOAD
            </div>
            <input type="text" placeholder="TITLE" className="border-b-2 border-black p-2 outline-none font-bold placeholder:text-gray-300" />
            <textarea placeholder="WHAT IS IT? (MAX 1000)" className="flex-grow border-2 border-black p-4 outline-none text-sm resize-none" />
            <div className="flex space-x-2">
              <button onClick={() => setMode('MAIN')} className="flex-1 border-2 border-black py-4 font-bold text-xl active:bg-black active:text-white">×</button>
              <button className="flex-[3] border-2 border-black py-4 font-bold text-xl active:bg-black active:text-white uppercase">Post</button>
            </div>
          </div>
        )}

        {/* MAIN/FEED MODE: 他人のポスト */}
        {mode === 'MAIN' && (
          <div className="flex flex-col h-full">
            <div className="flex-grow border-4 border-black p-6 relative">
              <div className="text-[9px] mb-2 font-bold opacity-30">BY_NO.{feed[currentIndex].user_no}</div>
              <h2 className="text-2xl font-black mb-4 underline decoration-4">{feed[currentIndex].title}</h2>
              <p className="text-sm leading-relaxed mb-8">{feed[currentIndex].body}</p>
              
              {/* ACTION BUTTONS */}
              <div className="flex flex-col space-y-2">
                <button className="border-2 border-black py-2 text-[10px] font-black hover:bg-black hover:text-white">KEEP</button>
                <button className="border-2 border-black py-2 text-[10px] font-black hover:bg-black hover:text-white">SHARE</button>
                <button className="border-2 border-black py-2 text-[10px] font-black hover:bg-black hover:text-white italic">BITE</button>
              </div>
            </div>
            <button onClick={() => setCurrentIndex((prev) => (prev + 1) % feed.length)} className="mt-4 border-4 border-black py-6 font-black text-xl hover:bg-black hover:text-white active:invert uppercase">Next_Fragment</button>
          </div>
        )}

        {/* WIKI MODE: Wikipediaランダム */}
        {mode === 'WIKI' && (
          <div className="flex flex-col h-full">
            <div className="flex-grow border-2 border-black p-6 bg-gray-50">
              <div className="text-[10px] mb-2 font-bold italic underline">WIKIPEDIA_RANDOM</div>
              <h2 className="text-xl font-bold mb-4">Wikipedia項目名</h2>
              <p className="text-xs text-gray-600">ここにはAPIから取得した概要テキストが表示されます...</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button className="col-span-2 border-4 border-black py-4 font-black">NEXT_WIKI</button>
              <button className="border-4 border-black py-4 font-black">KEEP</button>
            </div>
          </div>
        )}

        {/* KEEP MODE: 保存済みリスト */}
        {mode === 'KEEP' && (
          <div className="flex flex-col h-full">
            <div className="text-[10px] font-bold bg-black text-white px-2 self-start mb-2 uppercase">Your_Keep_Box</div>
            <div className="flex-grow border-2 border-black p-4">
              <p className="text-xs italic text-center text-gray-400 mt-20">一画面に一枚表示。左右スライド、もしくは上下ボタンで閲覧。</p>
            </div>
            <div className="flex space-x-2 mt-4">
              <button className="flex-1 border-2 border-black py-2 text-xs font-bold">SHARE</button>
              <button className="flex-1 border-2 border-red-600 text-red-600 py-2 text-xs font-bold italic">DELETE</button>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER BAR */}
      <footer className="h-20 border-t-4 border-black flex items-stretch bg-white">
        <button onClick={() => setMode('MAIN')} className={`flex-1 flex flex-col items-center justify-center ${mode === 'MAIN' ? 'bg-black text-white' : ''}`}>
          <div className="w-5 h-5 border-2 border-current mb-1" />
          <span className="text-[8px] font-black">STREET</span>
        </button>
        <button onClick={() => setMode('POST')} className={`flex-1 flex flex-col items-center justify-center ${mode === 'POST' ? 'bg-black text-white' : ''}`}>
          <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center mb-1"><div className="w-2 h-2 bg-current rounded-full" /></div>
          <span className="text-[8px] font-black">POST</span>
        </button>
        <button onClick={() => setMode('WIKI')} className={`flex-1 flex flex-col items-center justify-center ${mode === 'WIKI' ? 'bg-black text-white' : ''}`}>
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[18px] border-b-current mb-1" />
          <span className="text-[8px] font-black">WIKI</span>
        </button>
        <button onClick={() => setMode('KEEP')} className={`flex-1 flex flex-col items-center justify-center ${mode === 'KEEP' ? 'bg-black text-white' : ''}`}>
          <div className="w-4 h-4 border-2 border-current bg-current mb-1" />
          <span className="text-[8px] font-black">KEEP</span>
        </button>
      </footer>
    </div>
  );
}