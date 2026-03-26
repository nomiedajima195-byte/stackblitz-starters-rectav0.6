'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Room134Final() {
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
        .mosaic-wall { column-count: 2; column-gap: 0.5rem; }
        @media (min-width: 768px) { .mosaic-wall { column-count: 4; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* 1. MAIN WALL */}
      <main className={`p-2 transition-all duration-1000 ${creatorMode !== 'NONE' || viewingNode ? 'opacity-5 blur-3xl scale-90 pointer-events-none' : 'opacity-100'}`}>
        <div className="mosaic-wall max-w-[120rem] mx-auto">
          {nodes.map(node => {
            const isTrack = node.image_url === 'TRACK_TYPE';
            const isBox = node.image_url === 'BOX_TYPE';
            const contents = (isTrack || isBox) ? JSON.parse(node.description || '[]') : [];
            
            // 💡 改善: 1コマ目がテキストでも、中身から最初の画像を探してサムネイルにする
            const firstImage = contents.find((c: any) => c.image_url)?.image_url;
            const thumb = (isTrack || isBox) ? firstImage : node.image_url;

            return (
              <div key={node.id} onClick={() => setViewingNode(node)} className="mb-2 break-inside-avoid rounded-sm overflow-hidden active:scale-95 transition-all cursor-pointer border border-black/5 relative bg-[#EDE9D9]">
                {thumb ? (
                  <img src={thumb} className="w-full h-auto grayscale-[10%]" />
                ) : (
                  <div className="p-6 min-h-[120px] flex items-center justify-center bg-black/5">
                    <span className="text-[10px] font-black uppercase opacity-20 tracking-widest">{isTrack ? 'TRACK' : 'NODE'}</span>
                  </div>
                )}
                
                {isTrack && <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white text-3xl font-light">▷</div>}
                {isBox && <div className="absolute inset-0 flex items-center justify-center bg-white/10 text-black text-3xl font-light">▢</div>}
                
                {isTrack && (
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setTrackData([...contents]);
                    const uniqueImages = Array.from(new Set(contents.filter((s:any)=>s.image_url).map((s:any)=>s.image_url))).slice(0,8);
                    const newPads = Array(8).fill(null);
                    uniqueImages.forEach((url, i) => { newPads[i] = { id: Date.now()+i, image_url: url }; });
                    setPads(newPads);
                    setCreatorMode('TRACK');
                  }} className="absolute bottom-2 right-2 bg-black text-white text-[8px] px-2 py-1 rounded-full font-black uppercase z-10 shadow-lg">re</button>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* 2. VIEWER LAYER (One-Shot Track logic included) */}
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
                {viewingNode.description && <p className="mt-8 text-lg italic opacity-40 px-10 leading-relaxed">{viewingNode.description}</p>}
              </div>
            )}
          </div>
          <div className="h-32 flex items-center justify-center">
            <button onClick={() => setViewingNode(null)} className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center text-2xl shadow-xl active:scale-90 transition-all border border-white/10">◎</button>
          </div>
        </div>
      )}

      {/* 3. UNIVERSAL CREATOR ◎ MENU */}
      {!viewingNode && (
        <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[4000] flex flex-col items-center">
          {creatorMode === 'NONE' ? (
            <button onClick={() => setCreatorMode('MENU')} className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-3xl shadow-2xl active:scale-90 transition-all border border-white/5">◎</button>
          ) : creatorMode === 'MENU' ? (
            <div className="flex space-x-4 bg-white/90 backdrop-blur-2xl p-3 rounded-full shadow-2xl border border-black/5 animate-in slide-in-from-bottom-10">
              <button onClick={() => setCreatorMode('NODE')} className="px-6 py-3 bg-black text-white text-[9px] font-black uppercase rounded-full tracking-widest hover:scale-105 active:scale-95 transition-all">Node</button>
              <button onClick={() => setCreatorMode('TRACK')} className="px-6 py-3 bg-black text-white text-[9px] font-black uppercase rounded-full tracking-widest hover:scale-105 active:scale-95 transition-all">Track</button>
              <button onClick={() => setCreatorMode('BOX')} className="px-6 py-3 bg-[#EBE8DB] text-black text-[9px] font-black uppercase rounded-full tracking-widest border border-black/5 hover:scale-105 active:scale-95 transition-all">Box</button>
              <button onClick={() => setCreatorMode('NONE')} className="px-4 py-3 text-[9px] font-black uppercase opacity-20 hover:opacity-100 transition-opacity">✕</button>
            </div>
          ) : null}
        </nav>
      )}

      {/* 4. CREATOR COMPONENTS */}
      {creatorMode === 'NODE' && <NodeCreator onPost={(p:any)=>handlePost('NODE', p)} onCancel={()=>setCreatorMode('NONE')} />}
      {creatorMode === 'TRACK' && <TrackCreator pads={pads} setPads={setPads} trackData={trackData} setTrackData={setTrackData} onRelease={(p:any)=>handlePost('TRACK_TYPE', p)} onCancel={()=>setCreatorMode('NONE')} />}
      {creatorMode === 'BOX' && <BoxCreator onRelease={(p:any)=>handlePost('BOX_TYPE', p)} onCancel={()=>setCreatorMode('NONE')} />}
    </div>
  );
}

// --- SUB COMPONENTS ---

function TrackPlayer({data, onComplete}: any) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if(!data || data.length === 0) { onComplete(); return; }
    const timer = setInterval(() => {
      setIdx(v => {
        if (v >= data.length - 1) {
          clearInterval(timer);
          setTimeout(onComplete, 800); // 最後のコマの余韻
          return v;
        }
        return v + 1;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [data, onComplete]);

  const current = data[idx];
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
        {current?.image_url ? (
          <img key={idx} src={current.image_url} className="max-h-[80vh] max-w-full object-contain shadow-2xl rounded-sm animate-in fade-in duration-300 transition-all scale-100" />
        ) : (
          <div className="text-3xl italic opacity-30 px-10 text-center animate-pulse">{current?.description || "..."}</div>
        )}
    </div>
  );
}

function BoxViewer({data}: any) {
  return (
    <div className="w-full h-full flex items-center overflow-x-auto px-10 space-x-12 no-scrollbar snap-x snap-mandatory" onClick={e=>e.stopPropagation()}>
      {data.map((item: any, i: number) => (
        <div key={i} className="flex-shrink-0 h-[65vh] aspect-[3/4] shadow-2xl snap-center bg-white rounded-sm overflow-hidden border border-black/5">
           {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover grayscale-[10%] hover:grayscale-0 transition-all duration-700" /> : <div className="w-full h-full flex items-center justify-center p-8 text-xs italic opacity-30">{item.description}</div>}
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
      await supabase.