"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const APP_NAME = "07734";

export default function New07734() {
  const [userNo] = useState("00412"); // 本来はSupabaseから取得
  const [view, setView] = useState('main'); // 'main', 'post', 'scrap'
  const [currentIndex, setCurrentIndex] = useState(0);

  // 仮のデータ構造（Wikipedia由来とユーザー投稿の混合イメージ）
  const [posts] = useState([
    { id: 1, type: 'wiki', title: '三河木綿', content: '愛知県東部の三河地方で生産される木綿...', user_no: null },
    { id: 2, type: 'user', title: '焼肉交差点', content: 'ここを通るたびに腹が減る。', user_no: '09210', byte_count: 5 },
  ]);

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-gray-200 font-mono overflow-hidden">
      {/* HEADER */}
      <header className="flex justify-between items-center p-4 border-b border-gray-900 text-[10px] tracking-[0.2em]">
        <div className="w-20 text-blue-500">USER_NO: {userNo}</div>
        <div className="text-white text-lg font-bold tracking-tighter">{APP_NAME}</div>
        <div className="w-20 text-right text-gray-600">ONLINE</div>
      </header>

      {/* MAIN CONTENT (SLIDE AREA) */}
      <main className="flex-grow relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 p-6 flex flex-col"
          >
            <div className="flex-grow border border-gray-800 p-6 rounded-sm bg-gray-900/20 relative overflow-hidden">
              {/* バイト跡（齧り取り）の演出イメージ */}
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-black rounded-full border border-gray-800" />
              
              <div className="text-[10px] mb-4 text-gray-500 italic">
                {posts[currentIndex].type === 'wiki' ? 'SOURCE: WIKIPEDIA' : `SELECTED BY: NO.${posts[currentIndex].user_no}`}
              </div>
              <h2 className="text-2xl text-white mb-6 border-l-2 border-white pl-3">{posts[currentIndex].title}</h2>
              <p className="text-sm leading-relaxed">{posts[currentIndex].content}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* BOTTOM TOOLBAR */}
      <nav className="h-20 border-t border-gray-900 flex items-center justify-around px-4 bg-black">
        <button onClick={() => setView('main')} className="flex flex-col items-center gap-1 group">
          <div className="w-6 h-6 border-2 border-gray-600 group-hover:border-white transition-colors" />
          <span className="text-[8px]">SURPRISE</span>
        </button>
        
        <button onClick={() => setView('post')} className="flex flex-col items-center gap-1 group">
          <div className="w-8 h-8 rounded-full border-2 border-gray-400 group-hover:border-white flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
          <span className="text-[8px]">DEPOSIT</span>
        </button>

        <button onClick={() => setView('scrap')} className="flex flex-col items-center gap-1 group">
          <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-gray-600 group-hover:border-b-white transition-colors" />
          <span className="text-[8px]">SCRAP</span>
        </button>
      </nav>
    </div>
  );
}