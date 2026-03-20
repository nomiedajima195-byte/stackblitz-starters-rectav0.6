'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RectaCycle() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [pads, setPads] = useState<(any | null)[]>(Array(4).fill(null));
  const [activePad, setActivePad] = useState<number | null>(null);
  const [track, setTrack] = useState<any[]>([]); // { nodeId, type } の配列
  const [isRecording, setIsRecording] = useState(false);
  const [isMPCVisible, setIsMPCVisible] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<any[] | null>(null);
  const [playIdx, setPlayIdx] = useState(0);

  // 1. DATA FETCH
  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (data) setNodes(data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 2. MPC LOGIC
  const assignToPad = (node: any) => {
    const emptyIdx = pads.findIndex(p => p === null);
    const targetIdx = emptyIdx === -1 ? 0 : emptyIdx;
    const newPads = [...pads];
    newPads[targetIdx] = node;
    setPads(newPads);
    setIsMPCVisible(true);
  };

  const triggerPad = (idx: number) => {
    if (!pads[idx]) return;
    setActivePad(idx);
    
    if (isRecording && track.length < 24) {
      setTrack(prev => [...prev, pads[idx]]);
    }
    
    setTimeout(() => setActivePad(null), 120);
  };

  // 3. TRACK ARCHIVE (循環の要)
  const archiveTrack = async () => {
    if (track.length === 0) return;
    setIsArchiving(true);
    
    try {
      // トラック自体を一つのノードとして投稿
      // descriptionにJSONとしてシーケンスをぶち込む（雑で速い実装）
      const { error } = await supabase.from('mainline').insert([{
        id: `TRK-${Date.now()}`,
        description: JSON.stringify(track),
        owner_id: 'performer',
        image_url: 'TRACK_TYPE' // これをフラグにする
      }]);

      if (!error) {
        setTrack([]);
        setIsRecording(false);
        setIsMPCVisible(false);
        fetchData();
      }
    } finally {
      setIsArchiving(false);
    }
  };

  // 4. TRACK PLAYBACK (再演)
  const playTrack = (sequenceStr: string) => {
    const sequence = JSON.parse(sequenceStr);
    setPlayingTrack(sequence);
    setPlayIdx(0);
  };

  useEffect(() => {
    if (playingTrack && playIdx < playingTrack.length) {
      const timer = setTimeout(() => {
        setPlayIdx(prev => prev + 1);
      }, 500); // 0.5秒間隔で自動再生
      return () => clearTimeout(timer);
    } else if (playingTrack && playIdx >= playingTrack.length) {
      setPlayingTrack(null);
    }
  }, [playingTrack, playIdx]);

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-hidden">
      <style jsx global>{`
        .stone-wall { column-count: 2; column-gap: 0.25rem; }
        @media (min-width: 768px) { .stone-wall { column-count: 4; } }
      `}</style>

      {/* VIEW: 再演フラッシュ */}
      {(activePad !== null || playingTrack) && (
        <div className="fixed inset-0 z-[3000] bg-black flex items-center justify-center">
          {activePad !== null ? (
            pads[activePad].image_url ? <img src={pads[activePad].image_url} className="w-full h-full object-cover" /> : <div className="text-white text-3xl italic">{pads[activePad].description}</div>
          ) : playingTrack ? (
            playingTrack[playIdx]?.image_url ? <img src={playingTrack[playIdx].image_url} className="w-full h-full object-cover" /> : <div className="text-white text-3xl italic">{playingTrack[playIdx]?.description}</div>
          ) : null}
        </div>
      )}

      {/* WALL: 石垣レイアウト */}
      <main className={`p-1 transition-opacity duration-500 ${isMPCVisible ? 'opacity-30 blur-sm' : ''}`}>
        <div className="stone-wall">
          {nodes.map(node => (
            <div 
              key={node.id} 
              onClick={() => node.image_url === 'TRACK_TYPE' ? playTrack(node.description) : assignToPad(node)}
              className={`mb-1 break-inside-avoid rounded-sm border border-black/5 overflow-hidden active:scale-95 transition-all
                ${node.image_url === 'TRACK_TYPE' ? 'bg-black text-white p-4 h-32 flex flex-col justify-between' : 'bg-[#EDE9D9]'}
              `}
            >
              {node.image_url === 'TRACK_TYPE' ? (
                <>
                  <div className="text-[8px] tracking-widest opacity-50 uppercase font-black">Track Node</div>
                  <div className="text-[10px] italic opacity-80">Sequence of {JSON.parse(node.description).length} nodes.</div>
                  <div className="text-[18px] self-end">▶</div>
                </>
              ) : (
                node.image_url ? <img src={node.image_url} className="w-full h-auto" /> : <div className="p-4 text-[10px] italic">{node.description}</div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* STUDIO: 浮遊MPC */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[2000] transition-all duration-700 transform ${isMPCVisible ? 'translate-y-0 opacity-100' : 'translate-y-40 opacity-0 pointer-events-none'}`}>
        <div className="bg-black/95 p-6 rounded-[3rem] shadow-2xl border border-white/10 w-[90vw] max-w-md">
          
          <div className="flex justify-between items-center mb-6 px-2">
            <div className="flex items-center space-x-2">
              <button onClick={() => setIsRecording(!isRecording)} className={`w-4 h-4 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
              <span className="text-[9px] text-white/40 font-black uppercase tracking-widest">{isRecording ? 'Recording' : 'Standby'}</span>
            </div>
            <div className="text-[10px] text-white/60 font-mono">{track.length} / 24</div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-8">
            {pads.map((pad, i) => (
              <div 
                key={i}
                onMouseDown={() => triggerPad(i)}
                className={`aspect-square rounded-2xl border-b-4 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center overflow-hidden
                  ${pad ? 'bg-[#222] border-black' : 'bg-white/5 border-transparent opacity-20'}
                  ${activePad === i ? 'bg-white scale-90' : ''}
                `}
              >
                {pad?.image_url && <img src={pad.image_url} className="w-full h-auto opacity-60" />}
              </div>
            ))}
          </div>

          <div className="flex flex-col space-y-3">
             <button 
               onClick={archiveTrack}
               disabled={track.length === 0 || isArchiving}
               className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-full active:scale-95 transition-all disabled:opacity-20"
             >
               {isArchiving ? 'Archiving...' : 'Release Track'}
             </button>
             <button onClick={() => setIsMPCVisible(false)} className="text-[8px] text-white/20 uppercase tracking-widest py-2">Close Studio</button>
          </div>
        </div>
      </div>

      {!isMPCVisible && (
        <button onClick={() => setIsMPCVisible(true)} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-black px-10 py-5 rounded-full tracking-[0.4em] uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all">Studio</button>
      )}
    </div>
  );
}