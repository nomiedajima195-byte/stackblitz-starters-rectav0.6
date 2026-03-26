'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Room134() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [viewingNode, setViewingNode] = useState<any | null>(null);
  const [creatorMode, setCreatorMode] = useState<'NONE' | 'MENU' | 'NODE' | 'TRACK' | 'BOX'>('NONE');
  const [pads, setPads] = useState<(any | null)[]>(Array(8).fill(null));
  const [trackData, setTrackData] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('mainline').select('*');
    if (data) setNodes(data.sort(() => Math.random() - 0.5));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePost = async (type: string, payload: any) => {
    await supabase.from('mainline').insert([{
      ...payload,
      image_url: type,
      created_at: new Date().toISOString()
    }]);
    setCreatorMode('NONE');
    setTrackData([]);
    setPads(Array(8).fill(null));
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-x-hidden selection:bg-black selection:text-white">
      <style jsx global>{`
        /* 間隔を極限まで狭める (0.5rem = 8px) */
        .mosaic-wall { column-count: 2; column-gap: 0.5rem; } 
        @media (min-width: 768px) { .mosaic-wall { column-count: 4; column-gap: 0.75rem; } }
        @media (min-width: 1200px) { .mosaic-wall { column-count: 6; column-gap: 0.75rem; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* 🏛 HEADER */}
      <header className={`fixed top-0 left-0 w-full z-[3000] p-6 transition-all duration-1000 ${creatorMode !== 'NONE' || viewingNode ? 'opacity-0 -translate-y-10 pointer-events-none' : 'opacity-100'}`}>
        <h1 
          onClick={() => window.location.reload()} 
          className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30 text-center cursor-pointer hover:opacity-100 transition-opacity"
        >
          Room134
        </h1>
      </header>

      {/* 1. MAIN WALL */}
      <main className={`p-2 pt-20 transition-all duration-1000 ${creatorMode !== 'NONE' || viewingNode ? 'opacity-5 blur-3xl scale-90 pointer-events-none' : 'opacity-100'}`}>
        <div className="mosaic-wall max-w-[140rem] mx-auto">
          {nodes.map(node => {
            const isTrack = node.image_url === 'TRACK_TYPE';
            const isBox = node.image_url === 'BOX_TYPE';
            const contents = (isTrack || isBox) ? JSON.parse(node.description || '[]') : [];
            
            const firstItem = contents[0];
            const thumb = (isTrack || isBox) ? firstItem?.image_url : node.image_url;
            const previewText = isTrack ? firstItem?.description : node.description;

            return (
              /* mb-2 で上下の間隔も詰め、z-index管理で重なりが下に来るように調整 */
              <div key={node.id} onClick={() => setViewingNode(node)} className="mb-2 break-inside-avoid relative group cursor-pointer active:scale-[0.98] transition-transform">
                
                {/* 📦 BOX限定: 背後の重なりエフェクト (密着に合わせて控えめに調整) */}
                {isBox && contents.length > 1 && (
                  <>
                    <div className="absolute inset-0 bg-black/10 border border-black/5 rounded-sm translate-x-1 translate-y-1 rotate-[1deg] -z-10 group-hover:translate-x-2 group-hover:translate-y-2 group-hover:rotate-[2deg] transition-transform"></div>
                    <div className="absolute inset-0 bg-black/5 border border-black/5 rounded-sm translate-x-2 translate-y-2 rotate-[2deg] -z-20 group-hover:translate-x-3 group-hover:translate-y-3 group-hover:rotate-[3deg] transition-transform"></div>
                  </>
                )}

                {/* メインカード本体 */}
                <div className="relative z-0 rounded-sm overflow-hidden bg-[#F0EEE4] border border-black/10 shadow-sm">
                  {thumb ? (
                    <img src={thumb} className="w-full h-auto grayscale-[20%] group-hover:grayscale-0 transition-all duration-500" />
                  ) : (
                    <div className="p-4 min-h-[120px] flex items-center justify-center text-center">
                      <p className="text-[11px] leading-snug italic opacity-60 group-hover:opacity-100 transition-opacity">
                        {previewText?.length > 40 ? previewText.substring(0, 40) + "..." : previewText}
                      </p>
                    </div>
                  )}
                  
                  {isBox && (
                    <div className="absolute top-1.5 left-1.5 bg-black/80 text-white px-1.5 py-0.5 rounded-sm z-10">
                       <span className="text-[6px] font-black uppercase tracking-tighter leading-none">{contents.length}</span>
                    </div>
                  )}

                  {isTrack && <div className="absolute inset-0 flex items-center justify-center bg-black/5 text-white/30 text-3xl font-light pointer-events-none group-hover:text-white/60 transition-colors">▷</div>}
                  
                  {isTrack && (
                    <button onClick={(e) => {
                      e.stopPropagation();
                      setTrackData([...contents]);
                      const uniqueImages = Array.from(new Set(contents.filter((s:any)=>s.image_url).map((s:any)=>s.image_url))).slice(0,8);
                      const newPads = Array(8).fill(null);
                      uniqueImages.forEach((url, i) => { newPads[i] = { id: Date.now()+i, image_url: url as string }; });
                      setPads(newPads);
                      setCreatorMode('TRACK');
                    }} className="absolute bottom-1.5 right-1.5 bg-black text-white text-[7px] px-1.5 py-0.5 rounded-sm font-black uppercase z-10 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">re</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 2. VIEWER LAYER (変更なし) */}
      {viewingNode && (
        <div className="fixed inset-0 z-[5000] bg-[#EBE8DB] flex flex-col animate-in fade-in duration-700">
          <div className="flex-grow flex items-center justify-center overflow-hidden">
            {viewingNode.image_url === 'TRACK_TYPE' ? (
               <TrackPlayer data={JSON.parse(viewingNode.description)} onComplete={() => setViewingNode(null)} />
            ) : viewingNode.image_url === 'BOX_TYPE' ? (
               <BoxViewer data={JSON.parse(viewingNode.description)} />
            ) : (
              <div className="max-w-4xl w-full p-6 text-center animate-in zoom-in-95" onClick={() => setViewingNode(null)}>
                {viewingNode.image_url && <img src={viewingNode.image_url} className="max-h-[85vh] mx-auto object-contain shadow-2xl rounded-sm" />}
                {viewingNode.description && <p className="mt-8 text-xl italic opacity-50 px-10 leading-relaxed font-light">{viewingNode.description}</p>}
              </div>
            )}
          </div>
          <div className="h-32 flex items-center justify-center">
            <button onClick={() => setViewingNode(null)} className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center text-2xl shadow-xl active:scale-90 transition-all border border-white/10">◎</button>
          </div>
        </div>
      )}

      {/* 3. MENU ◎ (変更なし) */}
      {!viewingNode && (
        <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[4000] flex flex-col items-center">
          {creatorMode === 'NONE' ? (
            <button onClick={() => setCreatorMode('MENU')} className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-3xl shadow-2xl active:scale-90 transition-all border border-white/5">◎</button>
          ) : creatorMode === 'MENU' ? (
            <div className="flex space-x-4 bg-white/90 backdrop-blur-2xl p-3 rounded-full shadow-2xl border border-black/5 animate-in slide-in-from-bottom-10">
              <button onClick={() => setCreatorMode('NODE')} className="px-6 py-3 bg-black text-white text-[9px] font-black uppercase rounded-full tracking-widest transition-all">Node</button>
              <button onClick={() => setCreatorMode('TRACK')} className="px-6 py-3 bg-black text-white text-[9px] font-black uppercase rounded-full tracking-widest transition-all">Track</button>
              <button onClick={() => setCreatorMode('BOX')} className="px-6 py-3 bg-[#EBE8DB] text-black text-[9px] font-black uppercase rounded-full tracking-widest border border-black/5 transition-all">Box</button>
              <button onClick={() => setCreatorMode('NONE')} className="px-4 py-3 text-[9px] font-black uppercase opacity-20">✕</button>
            </div>
          ) : null}
        </nav>
      )}

      {/* 4. CREATORS (変更なし) */}
      {creatorMode === 'NODE' && <NodeCreator onPost={(p:any)=>handlePost('NODE', p)} onCancel={()=>setCreatorMode('NONE')} />}
      {creatorMode === 'TRACK' && <TrackCreator pads={pads} setPads={setPads} trackData={trackData} setTrackData={setTrackData} onRelease={(p:any)=>handlePost('TRACK_TYPE', p)} onCancel={()=>setCreatorMode('NONE')} />}
      {creatorMode === 'BOX' && <BoxCreator onRelease={(p:any)=>handlePost('BOX_TYPE', p)} onCancel={()=>setCreatorMode('NONE')} />}
    </div>
  );
}

// --- SUB COMPONENTS (Logic remains stable) ---

function TrackPlayer({data, onComplete}: any) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if(!data || data.length === 0) { onComplete(); return; }
    const timer = setInterval(() => {
      setIdx(v => {
        if (v >= data.length - 1) { clearInterval(timer); setTimeout(onComplete, 800); return v; }
        return v + 1;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [data, onComplete]);
  const current = data[idx];
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      {current?.image_url ? (
        <img key={idx} src={current.image_url} className="max-h-[80vh] max-w-full object-contain animate-in fade-in duration-300" />
      ) : (
        <div key={idx} className="text-3xl italic opacity-30 text-center px-12 leading-relaxed animate-in fade-in duration-500">{current?.description || "..."}</div>
      )}
    </div>
  );
}

function BoxViewer({data}: any) {
  return (
    <div className="w-full h-full flex items-center overflow-x-auto px-10 space-x-12 no-scrollbar snap-x snap-mandatory" onClick={e=>e.stopPropagation()}>
      {data.map((item: any, i: number) => (
        <div key={i} className="flex-shrink-0 h-[65vh] aspect-[3/4] shadow-2xl snap-center bg-white rounded-sm overflow-hidden border border-black/5">
           {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center p-12 text-center text-sm italic opacity-40 leading-relaxed">{item.description}</div>}
        </div>
      ))}
      <div className="flex-shrink-0 w-20 h-full" />
    </div>
  );
}

function NodeCreator({onPost, onCancel}: any) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const handlePost = async () => {
    setLoading(true);
    let url = null;
    if(file) {
      const fileName = `${Date.now()}-${file.name}`;
      await supabase.storage.from('images').upload(fileName, file);
      url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    }
    onPost({description: text, image_url: url});
  };
  return (
    <div className="fixed inset-0 z-[4500] bg-[#EBE8DB] flex flex-col items-center justify-center p-8 animate-in fade-in">
      <textarea autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="..." className="w-full max-w-xl bg-transparent border-none text-3xl italic outline-none text-center h-48 placeholder:opacity-10" />
      <div className="mt-12 flex items-center space-x-12">
        <label className="text-4xl opacity-20 hover:opacity-100 cursor-pointer transition-opacity">📷<input type="file" className="hidden" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
        <button onClick={onCancel} className="text-[9px] font-black uppercase opacity-30 tracking-widest">Cancel</button>
        <button onClick={handlePost} disabled={loading} className="text-[10px] font-black uppercase border-b border-black/20 pb-1">{loading ? '...' : 'Post'}</button>
      </div>
    </div>
  );
}

function TrackCreator({pads, setPads, trackData, setTrackData, onRelease, onCancel}: any) {
  const [isRecording, setIsRecording] = useState(false);
  const triggerPad = (i: number) => {
    if(!pads[i]) return;
    if(isRecording && trackData.length < 32) setTrackData((prev: any) => [...prev, pads[i]]);
  };
  const handleFile = async (i: number, f: File) => {
    const fileName = `${Date.now()}-${f.name}`;
    await supabase.storage.from('images').upload(fileName, f);
    const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    const next = [...pads];
    next[i] = {id: Date.now() + i, image_url: url};
    setPads(next);
  };
  return (
    <div className="fixed inset-0 z-[4500] bg-black/10 backdrop-blur-3xl flex items-center justify-center p-4">
      <div className="bg-white/95 w-full max-w-xs p-8 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 border border-white/20">
        <div className="flex justify-between items-center mb-8">
           <button onClick={()=>setIsRecording(!isRecording)} className={`text-[9px] font-black uppercase px-5 py-2.5 rounded-full shadow-sm transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-black text-white'}`}>{isRecording ? 'Rec...' : 'Start Rec'}</button>
           <div className="text-[10px] font-black opacity-20 tabular-nums">{trackData.length}/32</div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-10">
          {pads.map((p:any, i:number) => (
            <div key={i} onMouseDown={()=>triggerPad(i)} className={`aspect-square rounded-2xl border transition-all flex items-center justify-center relative overflow-hidden active:scale-90 cursor-pointer ${p ? 'bg-white border-black/10 shadow-sm' : 'bg-black/5 border-dashed border-black/10'}`}>
              {p?.image_url ? <img src={p.image_url} className="w-full h-full object-cover opacity-80" /> : <label className="w-full h-full flex items-center justify-center cursor-pointer opacity-10 hover:opacity-40 transition-opacity">＋<input type="file" className="hidden" onChange={e=>e.target.files?.[0] && handleFile(i, e.target.files[0])} /></label>}
            </div>
          ))}
        </div>
        <button onClick={()=>onRelease({description: JSON.stringify(trackData)})} className="w-full py-4 bg-black text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-2xl mb-2 shadow-xl active:scale-95 transition-all">Release Track</button>
        <button onClick={onCancel} className="w-full py-2 text-[8px] font-black uppercase opacity-20">Cancel</button>
      </div>
    </div>
  );
}

function BoxCreator({onRelease, onCancel}: any) {
  const [boxItems, setBoxItems] = useState<(any|null)[]>(Array(24).fill(null));
  const [loading, setLoading] = useState(false);
  const handleFile = async (i: number, f: File) => {
    const fileName = `${Date.now()}-${f.name}`;
    await supabase.storage.from('images').upload(fileName, f);
    const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    const next = [...boxItems];
    next[i] = {id: Date.now()+i, image_url: url};
    setBoxItems(next);
  };
  return (
    <div className="fixed inset-0 z-[4500] bg-[#EBE8DB] p-4 flex flex-col items-center justify-center animate-in fade-in">
       <div className="w-full max-w-6xl overflow-x-auto no-scrollbar py-10 flex space-x-6 snap-x snap-proximity">
         {boxItems.map((item, i) => (
           <div key={i} className="flex-shrink-0 w-56 aspect-[3/4] border border-black/5 bg-white shadow-sm rounded-sm flex items-center justify-center overflow-hidden snap-center relative">
             {item?.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <label className="w-full h-full flex items-center justify-center text-3xl opacity-5 hover:opacity-20 cursor-pointer transition-opacity">＋<input type="file" className="hidden" onChange={e=>e.target.files?.[0] && handleFile(i, e.target.files[0])} /></label>}
           </div>
         ))}
       </div>
       <div className="mt-12 flex items-center space-x-10">
          <button onClick={onCancel} className="text-[10px] font-black uppercase opacity-20 tracking-widest">Cancel</button>
          <button onClick={async ()=>{setLoading(true); await onRelease({description: JSON.stringify(boxItems.filter(i=>i!==null))});}} disabled={loading} className="px-10 py-4 bg-black text-white text-[10px] font-black uppercase rounded-full tracking-[0.2em] shadow-xl active:scale-95 transition-all">{loading ? '...' : 'Release Box'}</button>
       </div>
    </div>
  );
}