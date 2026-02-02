'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tnwtmuvtpbklcwwsenvc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRud3RtdXZ0cGJrbGN3d3NlbnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1ODA2OTgsImV4cCI6MjA4NTE1NjY5OH0.V1Dy5SL8pFvWWa2gD7R8xkq4XEuxdMFbp9t_Zri0Yds'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RubbishScrapbook() {
  const [groupedMasters, setGroupedMasters] = useState<Record<string, any[]>>({});
  const [myId, setMyId] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('jd_my_id') || `ID-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    localStorage.setItem('jd_my_id', id);
    setMyId(id);
    fetchAndGroupCards();
  }, []);

  const fetchAndGroupCards = async () => {
    const { data } = await supabase
      .from('jd_masters')
      .select('*, jd_instances(*)')
      .order('created_at', { ascending: false });

    if (data) {
      const groups = data.reduce((acc: any, item: any) => {
        const date = new Date(item.created_at).toLocaleDateString('ja-JP', {
          year: 'numeric', month: '2-digit', day: '2-digit'
        });
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
      }, {});
      setGroupedMasters(groups);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white/90 font-serif pb-64">
      {/* 看板は Rubbish */}
      <header className="p-8 border-b border-white/5 sticky top-0 bg-[#080808]/90 backdrop-blur-xl z-[1000] flex justify-between items-baseline">
        <h1 className="text-4xl font-black italic tracking-tighter">Rubbish</h1>
        <div className="text-[10px] tracking-[0.5em] uppercase opacity-20 italic font-mono">{myId}</div>
      </header>

      <main className="flex flex-col">
        {Object.entries(groupedMasters).map(([date, cards], index) => (
          <section 
            key={date} 
            className="sticky bg-[#080808] border-t border-white/10 pt-10 pb-20 shadow-[0_-30px_50px_rgba(0,0,0,0.9)] transition-all duration-700"
            style={{ 
              top: `${96 + index * 4}px`, // ヘッダーの下に少しずつズレて重なる
              zIndex: 100 - index 
            }}
          >
            {/* 日付ラベル（地層の境目） */}
            <div className="px-10 mb-8 flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[12px] font-black italic tracking-widest opacity-60">LAYER_{Object.keys(groupedMasters).length - index}</span>
                <span className="text-[10px] font-mono opacity-30 uppercase tracking-widest">{date.replace(/\//g, ' . ')}</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
            </div>

            {/* 横並びのカード列（スクラップブックの広がり） */}
            <div className="flex overflow-x-auto gap-10 px-10 no-scrollbar pb-10 mask-fade-right">
              {cards.map((m) => (
                <div key={m.id} className="flex-shrink-0 transition-all duration-500 hover:scale-110 hover:-translate-y-4">
                  <CardSurface m={m} myId={myId} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* 儀式への入り口 */}
      <footer className="fixed bottom-10 left-0 right-0 flex justify-center z-[1001]">
         <div className="bg-[#E5E5DE] text-black px-10 py-4 rounded-sm border-2 border-black font-black uppercase italic text-[11px] tracking-[0.5em] shadow-[0_20px_60px_rgba(0,0,0,0.8)] cursor-pointer hover:bg-white active:scale-95 transition-all">
            Open Junk Yard
         </div>
      </footer>
    </div>
  );
}

function CardSurface({ m, myId }: { m: any, myId: string }) {
  const cardHue = parseInt(m?.title || '270');
  const color = `hsl(${cardHue}, 30%, 25%)`;
  const myInstance = m.jd_instances?.find((i: any) => i.owner_id === myId);

  return (
    <div className="w-[220px] aspect-[1/1.618] bg-[#FAFAFA] rounded-[10px] p-[7px] shadow-[0_25px_50px_rgba(0,0,0,0.7)] flex flex-col relative overflow-hidden group border border-black/5">
      <div className="absolute inset-[7px] rounded-[4px] bg-[#111]" />
      <div className="relative z-10 flex flex-col h-full gap-1">
        
        {/* カード内：90年代区画ヘッダー */}
        <div className="flex gap-1 h-10">
          <div className="bg-[#E5E5DE] text-black w-10 flex items-center justify-center font-black text-[10px] border border-black italic">
            {myInstance ? `#${String(myInstance.serial_number).padStart(3, '0')}` : '??'}
          </div>
          <div className="bg-[#E5E5DE] text-black flex-1 flex items-center px-3 border border-black font-black text-[10px] italic tracking-tighter uppercase">
            Rubbish
          </div>
        </div>
        
        {/* 修正：色を生かす画像領域 */}
        <div className="bg-black p-1 border border-black">
          <img 
            src={m.image_url} 
            className="w-full aspect-[1.2/1] object-cover saturate-100 contrast-110 brightness-105 transition-transform duration-700 group-hover:scale-110" 
          />
        </div>

        {/* 修正：地層に馴染むグラデーションデータ領域 */}
        <div className="flex-1 border border-black p-3 relative overflow-hidden" style={{ background: `linear-gradient(165deg, ${color} 0%, #000 100%)` }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 0.5px, transparent 0)', backgroundSize: '6px 6px' }}></div>
          <div className="relative z-10 flex flex-col h-full justify-between uppercase font-mono text-[7px] tracking-tighter">
            <div className="space-y-1 opacity-50">
              <p className="border-b border-white/10 pb-1 truncate">Origin: {m.creator_id}</p>
              <p>Stamp: {new Date(m.created_at).toLocaleDateString()}</p>
            </div>
            <div className="text-[9px] italic font-black text-right opacity-30 leading-none">
               {myInstance ? "COLLECTED" : "UNOWNED"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}