'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PAD_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];

export default function NodeMPC() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [pads, setPads] = useState<(any | null)[]>(Array(8).fill(null));
  const [activePad, setActivePad] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [track, setTrack] = useState<any[]>([]);
  const [flashNode, setFlashNode] = useState<any | null>(null);

  // 初回データ読み込み
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('mainline').select('*').order('created_at', { ascending: false }).limit(40);
      if (data) setNodes(data);
    };
    fetchData();
  }, []);

  // パッド演奏ロジック
  const playPad = useCallback((idx: number) => {
    const node = pads[idx];
    if (!node) return;

    setActivePad(idx);
    setFlashNode(node);
    
    if (isRecording) {
      setTrack(prev => [...prev, { nodeId: node.id, timestamp: Date.now() }]);
    }

    // 瞬時に消す（キレのいいビートのため）
    setTimeout(() => {
      setActivePad(null);
      setFlashNode(null);
    }, 120);
  }, [pads, isRecording]);

  // キーボードイベント
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = PAD_KEYS.indexOf(e.key.toLowerCase());
      if (idx !== -1) playPad(idx);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playPad]);

  // サンプリング（パッドに割り当て）
  const assignPad = (node: any) => {
    const firstEmpty = pads.findIndex(p => p === null);
    const targetIdx = firstEmpty === -1 ? 0 : firstEmpty;
    const newPads = [...pads];
    newPads[targetIdx] = node;
    setPads(newPads);
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#EBE8DB] font-serif overflow-hidden flex flex-col">
      <style jsx global>{`
        .stone-wall { column-count: 3; column-gap: 0.5rem; }
        @media (min-width: 1024px) { .stone-wall { column-count: 5; } }
        .pixelated { image-rendering: pixelated; }
      `}</style>

      {/* 1. 演奏フラッシュ（MPCの中核視覚体験） */}
      {flashNode && (
        <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center animate-in fade-in zoom-in duration-75">
          {flashNode.image_url ? (
            <img src={flashNode.image_url} className="w-full h-full object-cover opacity-80" />
          ) : (
            <div className="text-4xl italic text-center px-12 leading-relaxed">{flashNode.description}</div>
          )}
        </div>
      )}

      {/* 2. 石垣：素材の海（ディグる場所） */}
      <header className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0F0F0F] z-[100]">
        <h1 className="text-[10px] tracking-[0.8em] uppercase opacity-40">Digger's Wall</h1>
        <div className="text-[9px] opacity-30 italic">Click node to Sample into Pad</div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-2 no-scrollbar">
        <div className="stone-wall max-w-[100rem] mx-auto">
          {nodes.map(node => (
            <div 
              key={node.id} 
              onClick={() => assignPad(node)}
              className="mb-2 break-inside-avoid group cursor-crosshair relative overflow-hidden bg-[#1A1A1A] rounded-sm transition-all hover:ring-2 hover:ring-white/20"
            >
              {node.image_url ? (
                <img src={node.image_url} className="w-full grayscale opacity-50 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-500" />
              ) : (
                <div className="p-4 text-[11px] italic opacity-40 group-hover:opacity-100">{node.description}</div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* 3. MPC インターフェース */}
      <footer className="h-80 bg-[#151515] border-t border-white/10 p-6 flex flex-col items-center z-[200] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        <div className="w-full max-w-2xl flex justify-between items-end mb-6">
          <div className="flex space-x-4">
            <button 
              onClick={() => { setIsRecording(!isRecording); if(!isRecording) setTrack([]); }}
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${isRecording ? 'bg-red-600 border-red-600 animate-pulse text-white' : 'border-white/10 text-white/20'}`}
            >
              ●
            </button>
            <div className="flex flex-col justify-center">
              <span className="text-[8px] uppercase tracking-widest opacity-30">Status</span>
              <span className="text-[10px] font-bold uppercase">{isRecording ? 'Recording Sequence' : 'Standby'}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[8px] uppercase tracking-widest opacity-30">Steps</span>
            <div className="text-xl font-mono opacity-80">{track.length.toString().padStart(3, '0')}</div>
          </div>
        </div>

        {/* パッド 2x4 */}
        <div className="grid grid-cols-4 gap-3 w-full max-w-2xl flex-1">
          {pads.map((pad, i) => (
            <div 
              key={i}
              onMouseDown={() => playPad(i)}
              className={`relative rounded-md border-b-4 transition-all duration-75 flex flex-col items-center justify-end p-2 cursor-pointer active:translate-y-1 active:border-b-0
                ${pad ? 'bg-[#222] border-[#333] hover:bg-[#2a2a2a]' : 'bg-[#111] border-[#181818] opacity-30'}
                ${activePad === i ? 'bg-white/20 border-white/40' : ''}
              `}
            >
              <div className="absolute top-2 left-2 text-[8px] font-black opacity-20 uppercase">{PAD_KEYS[i]}</div>
              {pad && pad.image_url && <img src={pad.image_url} className="absolute inset-0 w-full h-full object-cover opacity-20 rounded-md grayscale" />}
              <span className="relative text-[7px] font-black tracking-widest uppercase opacity-40 truncate w-full text-center">
                {pad ? (pad.description?.slice(0, 10) || pad.id.slice(-4)) : 'empty'}
              </span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}