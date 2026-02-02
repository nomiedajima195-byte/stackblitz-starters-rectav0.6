'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tnwtmuvtpbklcwwsenvc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRud3RtdXZ0cGJrbGN3d3NlbnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1ODA2OTgsImV4cCI6MjA4NTE1NjY5OH0.V1Dy5SL8pFvWWa2gD7R8xkq4XEuxdMFbp9t_Zri0Yds'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ScrapbookPage() {
  const [groupedMasters, setGroupedMasters] = useState<Record<string, any[]>>({});
  const [myId, setMyId] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('jd_my_id') || 'GUEST';
    setMyId(id);
    fetchAndGroupCards();
  }, []);

  const fetchAndGroupCards = async () => {
    const { data } = await supabase
      .from('jd_masters')
      .select('*, jd_instances(*)')
      .order('created_at', { ascending: false });

    if (data) {
      // 日付ごとにグループ化
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
    <div className="min-h-screen bg-[#0a0a0a] text-white/90 font-serif pb-32">
      <header className="p-8 border-b border-white/5 sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-[100] flex justify-between items-baseline">
        <h1 className="text-3xl font-black italic tracking-tighter">John.D</h1>
        <div className="text-[10px] tracking-[0.5em] uppercase opacity-30 italic">Time Layered Archive</div>
      </header>

      <main className="flex flex-col">
        {Object.entries(groupedMasters).map(([date, cards], index) => (
          <section 
            key={date} 
            className="relative border-t border-white/5 pt-6 pb-12 transition-all hover:bg-white/[0.02]"
            style={{ 
              zIndex: 50 - index, // 新しい日付ほど上に重なる
              marginTop: index === 0 ? '0' : '-40px' // 少し重ねる演出
            }}
          >
            {/* 日付ラベル */}
            <div className="px-8 mb-6 flex items-center gap-4">
              <span className="text-[11px] font-mono tracking-[0.4em] opacity-40">{date}</span>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            {/* 横並びのカード列 */}
            <div className="flex overflow-x-auto gap-8 px-8 no-scrollbar pb-6 mask-fade-right">
              {cards.map((m) => (
                <div key={m.id} className="flex-shrink-0 transition-transform hover:translate-y-[-10px] duration-500">
                  <CardSurface m={m} myId={myId} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* ナビゲーション等が必要ならここに追加 */}
    </div>
  );
}

function CardSurface({ m, myId }: { m: any, myId: string }) {
  const cardHue = parseInt(m?.title || '270');
  const color = `hsl(${cardHue}, 30%, 25%)`;
  const myInstance = m.jd_instances?.find((i: any) => i.owner_id === myId);

  return (
    <div className="w-[200px] aspect-[1/1.618] bg-[#FAFAFA] rounded-[8px] p-[6px] shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden">
      <div className="absolute inset-[6px] rounded-[3px] bg-[#111]" />
      <div className="relative z-10 flex flex-col h-full gap-1">
        <div className="flex gap-0.5 h-8">
          <div className="bg-[#E5E5DE] text-black w-8 flex items-center justify-center font-black text-[10px] border border-black italic">
            {myInstance ? `#${String(myInstance.serial_number).padStart(3, '0')}` : '---'}
          </div>
          <div className="bg-[#E5E5DE] text-black flex-1 flex items-center px-2 border border-black font-black text-[8px] italic tracking-tighter uppercase">
            Rubbish
          </div>
        </div>
        <div className="bg-black p-0.5 border border-black">
          <img src={m.image_url} className="w-full aspect-[1.2/1] object-cover saturate-90 contrast-110" />
        </div>
        <div className="flex-1 border border-black p-2 relative overflow-hidden" style={{ background: `linear-gradient(165deg, ${color} 0%, #000 100%)` }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 0.5px, transparent 0)', backgroundSize: '4px 4px' }}></div>
          <div className="text-[6px] text-white/40 font-mono space-y-1 uppercase">
            <p className="truncate">ID: {m.creator_id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}