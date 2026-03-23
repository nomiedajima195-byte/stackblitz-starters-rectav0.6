'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIG (FIXED) ---
const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RectaTrackThumbnail() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [pads, setPads] = useState<(any | null)[]>(Array(8).fill(null));
  const [activePad, setActivePad] = useState<number | null>(null);
  const [track, setTrack] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isMPCVisible, setIsMPCVisible] = useState(false);
  const [showInput, setShowInput] = useState<{file: File | null} | null>(null);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<any[] | null>(null);
  const [playIdx, setPlayIdx] = useState(0);

  // 1. DATA FETCH
  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from('mainline')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error("Fetch Error:", error.message);
    if (data) setNodes(data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 2. NORMAL POST
  const handleUpload = async () => {
    if (!showInput && !inputText.trim()) return;
    setIsProcessing(true);
    let publicUrl = null;
    try {
      if (showInput?.file) {
        const file = showInput.file;
        const fileName = `${Date.now()}-${file.name}`;
        const { error: storageError } = await supabase.storage.from('images').upload(fileName, file);
        if (storageError) throw storageError;
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }
      await supabase.from('mainline').insert([{
        image_url: publicUrl,
        description: inputText.trim() || null,
        owner_id: 'guest',
        created_at: new Date().toISOString()
      }]);
      setShowInput(null); setInputText(''); fetchData();
    } catch (e: any) {
      alert(`Archive Failed: ${e.message}`);
    } finally { setIsProcessing(false); }
  };

  // 3. TRACK ARCHIVE
  const archiveTrack = async () => {
    if (track.length === 0) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('mainline').insert([{
        description: JSON.stringify(track),
        image_url: 'TRACK_TYPE',
        owner_id: 'performer',
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      setTrack([]); setIsRecording(false); setIsMPCVisible(false); setPads(Array(8).fill(null)); fetchData();
    } catch (e: any) {
      alert(`Track Archive Failed: ${e.message}`);
    } finally { setIsProcessing(false); }
  };

  // 4. MPC LOGIC
  const triggerPad = (idx: number) => {
    if (!pads[idx]) return;
    setActivePad(idx);
    if (isRecording && track.length < 32) {
      setTrack(prev => [...prev, pads[idx]]);
    }
    setTimeout(() => setActivePad(null), 120);
  };

  // 5. PLAYBACK ENGINE
  useEffect(() => {
    if (playingTrack && playIdx < playingTrack.length) {
      const timer = setTimeout(() => setPlayIdx(prev => prev + 1), 600);
      return () => clearTimeout(timer);
    } else if (playingTrack && playIdx >= playingTrack.length) {
      setPlayingTrack(null);
    }
  }, [playingTrack, playIdx]);

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-x-hidden selection:bg-black selection:text-white">
      <style jsx global>{`
        .stone-wall { column-count: 2; column-gap: 0.5rem; }
        @media (min-width: 768px) { .stone-wall { column-count: 4; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* FLASH LAYER */}
      {(activePad !== null || playingTrack) && (
        <div className="fixed inset-0 z-[3000] bg-black flex items-center justify-center animate-in fade-in duration-75">
          {activePad !== null ? (
            pads[activePad]?.image_url ? 
              <img src={pads[activePad].image_url} className="w-full h-full object-contain" /> : 
              <div className="text-white text-4xl italic px-12 text-center leading-relaxed font-light">{pads[activePad]?.description}</div>
          ) : playingTrack ? (
            playingTrack[playIdx]?.image_url ? 
              <img src={playingTrack[playIdx].image_url} className="w-full h-full object-contain" /> : 
              <div className="text-white text-4xl italic px-12 text-center leading-relaxed font-light">{playingTrack[playIdx]?.description}</div>
          ) : null}
        </div>
      )}

      {/* HEADER */}
      <header className="py-10 flex flex-col items-center sticky top-0 z-[50]">
        <h1 className="text-[10px] tracking-[1.5em] font-black uppercase opacity-20 bg-[#EBE8DB]/60 backdrop-blur-md px-10 py-4 rounded-full border border-black/5">Rubbish</h1>
      </header>

      {/* MAIN WALL: 石垣 */}
      <main className={`p-2 transition-all duration-1000 ${isMPCVisible || showInput ? 'opacity-40 blur-md scale-[0.98]' : 'opacity-100'}`}>
        <div className="stone-wall max-w-[120rem] mx-auto">
          {nodes.map(node => {
            // 💡 トラックタイルの解析ロジック
            let trackThumb = null;
            if (node.image_url === 'TRACK_TYPE') {
              const trackData = JSON.parse(node.description);
              // 1コマ目の画像を取得
              if (trackData.length > 0 && trackData[0].image_url) {
                trackThumb = trackData[0].image_url;
              }
            }

            return (
              <div 
                key={node.id} 
                onClick={() => {
                  if (node.image_url === 'TRACK_TYPE') {
                    setPlayingTrack(JSON.parse(node.description));
                    setPlayIdx(0);
                  } else {
                    setPads(prev => {
                      const next = [...prev];
                      const empty = next.findIndex(p => p === null);
                      next[empty === -1 ? track.length % 8 : empty] = node;
                      return next;
                    });
                    setIsMPCVisible(true);
                  }
                }}
                // 💡 トラックタイルのスタイルを変更：サムネイル背景、シャドウ、そして◀マーク
                className={`mb-2 break-inside-avoid rounded-sm overflow-hidden active:scale-95 transition-all cursor-pointer border border-black/5 relative
                  ${node.image_url === 'TRACK_TYPE' 
                    ? `bg-[#1a1a1a] p-0 h-48 flex flex-col justify-end shadow-2xl` 
                    : 'bg-[#EDE9D9] shadow-sm'}
                `}
              >
                {node.image_url === 'TRACK_TYPE' ? (
                  <>
                    {/* 💡 1コマ目の画像を背景に敷く */}
                    {trackThumb && (
                      <img src={trackThumb} className="absolute inset-0 w-full h-full object-cover grayscale opacity-50 transition-all hover:grayscale-0 hover:opacity-100 duration-500" />
                    ) || (
                      // 画像がなければテキストノードがサムネイルになる、など（テキストは未対応）
                      <div className="absolute inset-0 flex items-center justify-center p-8 bg-black">
                        <div className="text-[12px] italic text-[#EBE8DB]/60">{JSON.parse(node.description)[0]?.description}</div>
                      </div>
                    )}
                    
                    {/* 💡 再生マーク（▶）をオーバーラップ：中央にデカデカと */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white text-7xl font-light opacity-10 hover:opacity-30 transition-opacity">▶</div>
                    </div>

                    {/* 💡 トラック情報（下に小さく） */}
                    <div className="bg-gradient-to-t from-black/80 to-transparent p-6 relative z-10 w-full">
                      <div className="text-[7px] tracking-[0.5em] text-[#EBE8DB] opacity-30 uppercase font-black mb-1">Loop Memory</div>
                      <div className="text-[11px] italic text-[#EBE8DB] opacity-70 leading-tight tracking-tight">Sequence of {JSON.parse(node.description).length} nodes</div>
                    </div>
                  </>
                ) : (
                  <>
                    {node.image_url && <img src={node.image_url} className="w-full h-auto grayscale-[30%] hover:grayscale-0 transition-all duration-700" loading="lazy" />}
                    {node.description && <div className="p-5 text-[12px] italic leading-relaxed opacity-70 tracking-tight whitespace-pre-wrap">{node.description}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* FOOTER NAV */}
      <nav className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center space-x-6 z-[500]">
        <button onClick={() => setShowInput({file: null})} className="bg-white/40 backdrop-blur-3xl w-20 h-20 rounded-full shadow-2xl border border-white/40 text-3xl opacity-40 hover:opacity-100 hover:scale-105 transition-all flex items-center justify-center font-light">◎</button>
        <button 
          onClick={() => setIsMPCVisible(!isMPCVisible)} 
          className={`px-12 py-5 rounded-full shadow-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500
            ${isMPCVisible ? 'bg-white text-black scale-95' : 'bg-black text-white opacity-80 hover:opacity-100'}
          `}
        >
          {isMPCVisible ? 'Close' : 'Studio'}
        </button>
      </nav>

      {/* POST MODAL */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/96 backdrop-blur-3xl z-[2000] flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-500">
          <textarea 
            autoFocus 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)} 
            placeholder="Write fragment..." 
            className="w-full max-w-2xl bg-transparent border-none text-4xl italic outline-none text-center h-64 no-scrollbar placeholder:opacity-10 font-light" 
          />
          <div className="mt-20 flex items-center space-x-20">
            <button onClick={() => setShowInput(null)} className="text-[10px] uppercase tracking-widest opacity-20 hover:opacity-100 transition-opacity font-black">Discard</button>
            <label className="text-4xl opacity-20 cursor-pointer hover:opacity-100 transition-all relative">
              {showInput.file ? '📸' : '📷'}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => setShowInput({file: e.target.files?.[0] || null})} />
            </label>
            <button onClick={handleUpload} className="text-[10px] font-black uppercase tracking-widest border-b-2 border-black/10 hover:border-black transition-all pb-1">Archive</button>
          </div>
        </div>
      )}

      {/* STUDIO MODAL */}
      {isMPCVisible && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center pb-40 p-6 pointer-events-none">
          <div className="bg-white/5 backdrop-blur-3xl w-full max-w-sm p-8 rounded-[3.5rem] shadow-[0_20px_80px_rgba(0,0,0,0.15)] border border-white/20 pointer-events-auto animate-in slide-in-from-bottom-20 duration-700">
            <div className="flex justify-between items-center mb-8 px-2">
              <button 
                onClick={() => setIsRecording(!isRecording)} 
                className={`flex items-center space-x-3 px-5 py-2 rounded-full border transition-all ${isRecording ? 'border-red-500 bg-red-500/10' : 'border-black/5'}`}
              >
                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]' : 'bg-black/10'}`} />
                <span className={`text-[8px] font-black uppercase tracking-widest ${isRecording ? 'text-red-500' : 'text-black/30'}`}>Recording</span>
              </button>
              <div className="text-[9px] text-black/20 font-mono italic">{track.length} / 32</div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              {pads.map((pad, i) => (
                <div 
                  key={i} 
                  onMouseDown={() => triggerPad(i)} 
                  className={`aspect-square rounded-[1.2rem] border transition-all flex items-center justify-center overflow-hidden relative active:scale-90
                    ${pad 
                      ? 'bg-white/60 border-white/80 shadow-md ring-1 ring-black/5' 
                      : 'bg-black/[0.03] border-dashed border-black/5'
                    }
                    ${activePad === i ? 'bg-white scale-95 shadow-2xl ring-4 ring-white/50' : ''}
                  `}
                >
                  {pad?.image_url && <img src={pad.image_url} className="w-full h-full object-cover mix-blend-multiply opacity-60" />}
                  {!pad && <div className="text-[10px] opacity-10 font-black">＋</div>}
                  {pad && <div className="absolute top-2 right-2 w-1 h-1 bg-black/10 rounded-full" />}
                </div>
              ))}
            </div>

            <button 
              onClick={archiveTrack} 
              disabled={track.length === 0} 
              className="w-full py-6 bg-black text-white text-[10px] font-black uppercase tracking-[0.5em] rounded-[1.5rem] active:scale-[0.97] transition-all disabled:opacity-5 disabled:grayscale"
            >
              Save Memory
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL LOADING */}
      {isProcessing && (
        <div className="fixed inset-0 bg-[#EBE8DB]/60 backdrop-blur-md z-[5000] flex flex-col items-center justify-center">
          <div className="text-[10px] tracking-[1.5em] font-black uppercase italic animate-pulse opacity-40">Archiving</div>
        </div>
      )}
    </div>
  );
}