'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ... (Supabaseの設定は前回同様)
const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RectaMPC() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [pads, setPads] = useState<(any | null)[]>(Array(4).fill(null)); // 4パッドに凝縮
  const [activePad, setActivePad] = useState<number | null>(null);
  const [track, setTrack] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isMPCVisible, setIsMPCVisible] = useState(false);

  // データ取得
  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('mainline').select('*').order('created_at', { ascending: false }).limit(30);
    if (data) setNodes(data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // パッドにアサイン (雑に空いてるところに入れる)
  const assignToPad = (node: any) => {
    const emptyIdx = pads.findIndex(p => p === null);
    const targetIdx = emptyIdx === -1 ? 0 : emptyIdx;
    const newPads = [...pads];
    newPads[targetIdx] = node;
    setPads(newPads);
    setIsMPCVisible(true); // アサインしたら勝手にMPCが出る
  };

  // 演奏 (叩く)
  const triggerPad = (idx: number) => {
    if (!pads[idx]) return;
    setActivePad(idx);
    if (isRecording) {
      setTrack(prev => [...prev, { nodeId: pads[idx].id, timestamp: Date.now() }]);
    }
    setTimeout(() => setActivePad(null), 100);
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-hidden">
      <style jsx global>{`
        .stone-wall { column-count: 2; column-gap: 0.25rem; }
        @media (min-width: 768px) { .stone-wall { column-count: 4; } }
      `}</style>

      {/* BACKGROUND: Wall (素材の海) */}
      <main className={`p-1 transition-all duration-500 ${isMPCVisible ? 'blur-sm scale-[0.98] opacity-50' : ''}`}>
        <div className="stone-wall">
          {nodes.map(node => (
            <div 
              key={node.id} 
              onContextMenu={(e) => { e.preventDefault(); assignToPad(node); }} // 右クリック/長押しでアサイン
              onClick={() => assignToPad(node)} // 雑にクリックでもアサイン
              className="mb-1 break-inside-avoid bg-[#EDE9D9] rounded-sm border border-black/5 overflow-hidden active:scale-95 transition-transform"
            >
              {node.image_url ? <img src={node.image_url} className="w-full h-auto" /> : <div className="p-4 text-[10px] italic">{node.description}</div>}
            </div>
          ))}
        </div>
      </main>

      {/* OVERLAY: Flash (演奏の瞬間) */}
      {activePad !== null && pads[activePad] && (
        <div className="fixed inset-0 z-[2000] bg-black flex items-center justify-center animate-in fade-in duration-75">
          {pads[activePad].image_url ? (
            <img src={pads[activePad].image_url} className="w-full h-full object-cover" />
          ) : (
            <div className="text-white text-3xl italic px-10 text-center">{pads[activePad].description}</div>
          )}
        </div>
      )}

      {/* FLOATING UI: MPC Pad (Wallの上に浮く) */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] transition-all duration-500 transform ${isMPCVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className="bg-black/90 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl border border-white/10 flex flex-col items-center">
          
          <div className="flex space-x-2 mb-4">
            <button 
              onClick={() => setIsRecording(!isRecording)}
              className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} 
            />
            <div className="text-[8px] text-white/40 tracking-widest uppercase font-black">REC MODE: {track.length}</div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {pads.map((pad, i) => (
              <div 
                key={i}
                onMouseDown={() => triggerPad(i)}
                className={`w-16 h-16 rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center overflow-hidden
                  ${pad ? 'bg-[#333] border-[#111]' : 'bg-white/5 border-white/5 opacity-20'}
                  ${activePad === i ? 'bg-white scale-95' : ''}
                `}
              >
                {pad?.image_url && <img src={pad.image_url} className="w-full h-full object-cover opacity-50" />}
                {!pad?.image_url && pad && <div className="text-[10px] text-white/50 text-center p-1">TEXT</div>}
              </div>
            ))}
          </div>

          <button 
            onClick={() => setIsMPCVisible(false)}
            className="mt-4 text-[8px] text-white/20 uppercase tracking-[0.4em] hover:text-white transition-colors"
          >
            Close Studio
          </button>
        </div>
      </div>

      {/* TRIGGER: 投稿ボタン（兼、MPC呼び出し） */}
      {!isMPCVisible && (
        <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 flex space-x-4">
           <button onClick={() => setIsMPCVisible(true)} className="bg-black text-white text-[10px] font-black px-8 py-4 rounded-full tracking-widest uppercase shadow-xl active:scale-95 transition-all">Studio</button>
        </nav>
      )}
    </div>
  );
}