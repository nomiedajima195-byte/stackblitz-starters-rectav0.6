'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- FIXED CONFIG (そのまま使用) ---
const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RectaBulletproofPost() {
  const [nodes, setNodes] = useState<any[]>([]);
  // ... (他のStateはそのまま)
  const [pads, setPads] = useState<(any | null)[]>(Array(4).fill(null));
  const [activePad, setActivePad] = useState<number | null>(null);
  const [track, setTrack] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isMPCVisible, setIsMPCVisible] = useState(false);
  const [showInput, setShowInput] = useState<{file: File | null} | null>(null);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<any[] | null>(null);
  const [playIdx, setPlayIdx] = useState(0);

  // 1. データ取得
  const fetchData = useCallback(async () => {
    console.log("🛰 Fetching nodes...");
    const { data, error } = await supabase
      .from('mainline')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("❌ Fetch Error:", error.message);
    } else {
      console.log("✅ Fetched Nodes:", data?.length);
      setNodes(data || []);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 2. 新規投稿 (防弾仕様)
  const handleUpload = async () => {
    if (!showInput && !inputText.trim()) return;
    setIsProcessing(true);
    let publicUrl = null;

    console.log("🚀 Starting upload process...");

    try {
      // --- STEP 1: 画像アップロード ---
      if (showInput?.file) {
        console.log("📸 Uploading image...");
        const file = showInput.file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`; // ユニークなファイル名

        const { error: storageError, data: storageData } = await supabase.storage
          .from('images') // 💡 バケット名が 'images' であることを確認
          .upload(fileName, file);

        if (storageError) {
          console.error("❌ Storage Error:", storageError.message);
          alert(`Image Upload Failed: ${storageError.message}`);
          throw storageError;
        }

        console.log("✅ Image Uploaded:", storageData.path);

        // 公開URLを取得
        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);
        
        publicUrl = urlData.publicUrl;
        console.log("🔗 Public URL:", publicUrl);
      }

      // --- STEP 2: DBへの書き込み ---
      console.log("📝 Inserting into DB...");
      
      const insertData = {
        image_url: publicUrl,
        description: inputText.trim() || null,
        owner_id: 'guest',
        created_at: new Date().toISOString() // フロント側で時間を刻印
      };

      console.log("📄 Insert Data:", insertData);

      const { data: insertedData, error: dbError } = await supabase
        .from('mainline')
        .insert([insertData])
        .select(); // 💡 挿入されたデータを返すように要求

      if (dbError) {
        console.error("❌ DB Error:", dbError.message);
        // 🚨 ここでエラーが出る場合、RLSのINSERTポリシーが設定されていません
        alert(`Database Post Failed: ${dbError.message}\n(Check RLS Policies)`);
        throw dbError;
      }

      console.log("💎 Successfully Inserted:", insertedData);
      alert("✅ Post Success!"); // 成功したらアラートを出す（デバッグ用）

      setShowInput(null);
      setInputText('');
      fetchData(); // リロード

    } catch (e: any) {
      console.error("🔥 Global Error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // ... (他の関数 archiveTrack, triggerPad はそのまま)
  const archiveTrack = async () => {
    if (track.length === 0) return;
    setIsProcessing(true);
    try {
      await supabase.from('mainline').insert([{
        description: JSON.stringify(track),
        image_url: 'TRACK_TYPE',
        owner_id: 'performer',
        created_at: new Date().toISOString()
      }]);
      setTrack([]); setIsRecording(false); setIsMPCVisible(false); fetchData();
    } finally { setIsProcessing(false); }
  };

  const triggerPad = (idx: number) => {
    if (!pads[idx]) return;
    setActivePad(idx);
    if (isRecording && track.length < 24) setTrack(prev => [...prev, pads[idx]]);
    setTimeout(() => setActivePad(null), 120);
  };

  useEffect(() => {
    if (playingTrack && playIdx < playingTrack.length) {
      const timer = setTimeout(() => setPlayIdx(prev => prev + 1), 600);
      return () => clearTimeout(timer);
    } else if (playingTrack && playIdx >= playingTrack.length) {
      setPlayingTrack(null);
    }
  }, [playingTrack, playIdx]);

  // --- UI (前回と同じ) ---
  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-x-hidden">
      <style jsx global>{`
        .stone-wall { column-count: 2; column-gap: 0.5rem; }
        @media (min-width: 768px) { .stone-wall { column-count: 4; } }
      `}</style>

      {/* FLASH LAYER */}
      {(activePad !== null || playingTrack) && (
        <div className="fixed inset-0 z-[3000] bg-black flex items-center justify-center animate-in fade-in duration-100">
          {activePad !== null ? (
            pads[activePad].image_url ? <img src={pads[activePad].image_url} className="w-full h-full object-contain" /> : <div className="text-white text-3xl italic px-10 text-center">{pads[activePad].description}</div>
          ) : playingTrack ? (
            playingTrack[playIdx]?.image_url ? <img src={playingTrack[playIdx].image_url} className="w-full h-full object-contain" /> : <div className="text-white text-3xl italic px-10 text-center">{playingTrack[playIdx]?.description}</div>
          ) : null}
        </div>
      )}

      {/* HEADER */}
      <header className="py-8 flex flex-col items-center sticky top-0 z-[50]">
        <h1 className="text-[10px] tracking-[1.2em] font-black uppercase opacity-20 bg-[#EBE8DB]/60 backdrop-blur-md px-8 py-3 rounded-full border border-black/5">Rubbish</h1>
      </header>

      {/* MAIN WALL */}
      <main className={`p-2 transition-all duration-700 ${isMPCVisible || showInput ? 'opacity-20 blur-xl scale-95' : 'opacity-100'}`}>
        <div className="stone-wall">
          {nodes.map(node => (
            <div 
              key={node.id} 
              onClick={() => node.image_url === 'TRACK_TYPE' ? (setPlayingTrack(JSON.parse(node.description)), setPlayIdx(0)) : (
                setPads(prev => {
                  const next = [...prev];
                  const empty = next.findIndex(p => p === null);
                  next[empty === -1 ? 0 : empty] = node;
                  return next;
                }),
                setIsMPCVisible(true)
              )}
              className={`mb-2 break-inside-avoid rounded-sm overflow-hidden active:scale-95 transition-all cursor-pointer border border-black/5
                ${node.image_url === 'TRACK_TYPE' ? 'bg-black text-white p-6 h-40 flex flex-col justify-between' : 'bg-[#EDE9D9]'}
              `}
            >
              {node.image_url === 'TRACK_TYPE' ? (
                <>
                  <div className="text-[7px] tracking-[0.4em] opacity-40 uppercase font-black">Track Loop</div>
                  <div className="text-[11px] italic opacity-70">Sequence {JSON.parse(node.description).length} nodes</div>
                  <div className="text-xl self-end opacity-20">▶</div>
                </>
              ) : (
                node.image_url ? <img src={node.image_url} className="w-full h-auto" /> : <div className="p-4 text-[11px] italic leading-relaxed">{node.description}</div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* FOOTER */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center space-x-4 z-[500]">
        <button onClick={() => setShowInput({file: null})} className="bg-white/80 backdrop-blur-xl w-16 h-16 rounded-full shadow-2xl border border-black/5 text-2xl opacity-60 hover:opacity-100 transition-all">◎</button>
        <button onClick={() => setIsMPCVisible(!isMPCVisible)} className="bg-black text-white px-10 py-5 rounded-full shadow-2xl text-[10px] font-black uppercase tracking-[0.3em] opacity-90 transition-all">{isMPCVisible ? 'Close Studio' : 'Open Studio'}</button>
      </nav>

      {/* POST MODAL */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/98 backdrop-blur-3xl z-[2000] flex flex-col items-center justify-center p-8">
          <textarea autoFocus value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="..." className="w-full max-w-xl bg-transparent border-none text-3xl italic outline-none text-center h-48 no-scrollbar" />
          <div className="mt-12 flex items-center space-x-12">
            <button onClick={() => setShowInput(null)} className="text-[10px] uppercase opacity-20">Cancel</button>
            <label className="text-3xl opacity-30 cursor-pointer">{showInput.file ? '📸' : '◎'}<input type="file" className="hidden" onChange={(e) => setShowInput({file: e.target.files?.[0] || null})} /></label>
            <button onClick={handleUpload} className="text-[10px] font-black border-b-2 border-black/20">Archive</button>
          </div>
        </div>
      )}

      {/* STUDIO MODAL */}
      {isMPCVisible && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center pb-32 p-4 pointer-events-none">
          <div className="bg-black/95 w-full max-w-sm p-6 rounded-[2.5rem] shadow-2xl border border-white/10 pointer-events-auto">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setIsRecording(!isRecording)} className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${isRecording ? 'border-red-500 bg-red-500/10' : 'border-white/10'}`}>
                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
                <span className="text-[8px] text-white/50 font-black uppercase tracking-tighter">Rec</span>
              </button>
              <div className="text-[9px] text-white/30 font-mono">{track.length} / 24</div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {pads.map((pad, i) => (
                <div key={i} onMouseDown={() => triggerPad(i)} className={`aspect-square rounded-2xl border-b-4 transition-all flex items-center justify-center overflow-hidden ${pad ? 'bg-[#1a1a1a] border-black active:border-b-0 active:translate-y-1' : 'bg-white/5 border-transparent opacity-20'} ${activePad === i ? 'bg-white scale-90' : ''}`}>
                  {pad?.image_url && <img src={pad.image_url} className="w-full h-full object-cover opacity-60" />}
                </div>
              ))}
            </div>
            <button onClick={archiveTrack} disabled={track.length === 0} className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.4em] rounded-full active:scale-95 transition-all disabled:opacity-10">Archive Track</button>
          </div>
        </div>
      )}

      {isProcessing && <div className="fixed inset-0 bg-[#EBE8DB]/80 backdrop-blur-md z-[4000] flex items-center justify-center text-[10px] tracking-[1em] font-black uppercase italic animate-pulse">Processing</div>}
    </div>
  );
}