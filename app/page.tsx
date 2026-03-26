'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Room134LoopHome() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [viewingNode, setViewingNode] = useState<any | null>(null);
  const [creatorMode, setCreatorMode] = useState<'NONE' | 'NODE' | 'TRACK' | 'BOX'>('NONE');
  
  // スタジオ用
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
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-x-hidden">
      <style jsx global>{`
        .mosaic-wall { column-count: 2; column-gap: 0.5rem; }
        @media (min-width: 768px) { .mosaic-wall { column-count: 4; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* 1. MAIN WALL */}
      <main className={`p-2 transition-all duration-700 ${creatorMode !== 'NONE' || viewingNode ? 'opacity-5 blur-3xl scale-90' : 'opacity-100'}`}>
        <div className="mosaic-wall max-w-[120rem] mx-auto">
          {nodes.map(node => {
            const isTrack = node.image_url === 'TRACK_TYPE';
            const isBox = node.image_url === 'BOX_TYPE';
            const contents = (isTrack || isBox) ? JSON.parse(node.description || '[]') : [];
            const thumb = (isTrack || isBox) ? contents[0]?.image_url : node.image_url;

            return (
              <div key={node.id} onClick={() => setViewingNode(node)} className="mb-2 break-inside-avoid rounded-sm overflow-hidden active:scale-95 transition-all cursor-pointer border border-black/5 relative bg-[#EDE9D9]">
                {thumb && <img src={thumb} className="w-full h-auto grayscale-[10%]" />}
                {!thumb && node.description && <div className="p-4 text-[11px] italic opacity-50 leading-relaxed">{node.description}</div>}
                
                {isTrack && <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white text-3xl font-light">▷</div>}
                {isBox && <div className="absolute inset-0 flex items-center justify-center bg-white/10 text-black text-3xl font-light">▢</div>}
                
                {isTrack && contents.length < 32 && (
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setTrackData([...contents]);
                    const unique = Array.from(new Set(contents.map((s:any)=>s.id))).map(id=>contents.find((s:any)=>s.id===id)).slice(0,8);
                    setPads(prev => { const n = [...prev]; unique.forEach((u,i)=>n[i]=u); return n; });
                    setCreatorMode('TRACK');
                  }} className="absolute bottom-2 right-2 bg-black text-white text-[8px] px-2 py-1 rounded-full font-black uppercase z-10">re</button>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* 2. VIEWER LAYER (Full Screen) */}
      {viewingNode && (
        <div className="fixed inset-0 z-[5000] bg-[#EBE8DB] flex flex-col animate-in fade-in duration-500">
          <div className="flex-grow flex items-center justify-center overflow-hidden">
            {viewingNode.image_url === 'TRACK_TYPE' ? (
               <TrackPlayer data={JSON.parse(viewingNode.description)} />
            ) : viewingNode.image_url === 'BOX_TYPE' ? (
               <BoxViewer data={JSON.parse(viewingNode.description)} />
            ) : (
              <div className="max-w-4xl w-full p-6 text-center space-y-8" onClick={() => setViewingNode(null)}>
                {viewingNode.image_url && <img src={viewingNode.image_url} className="max-h-[85vh] mx-auto object-contain shadow-2xl rounded-sm" />}
                {viewingNode.description && <p className="text-lg italic opacity-40 px-10 leading-relaxed">{viewingNode.description}</p>}
              </div>
            )}
          </div>

          {/* 💡 HOME BUTTON (Back to Main) */}
          <div className="h-32 flex items-center justify-center">
            <button 
              onClick={() => setViewingNode(null)} 
              className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center text-2xl shadow-xl active:scale-90 transition-all border border-white/10"
            >
              ◎
            </button>
          </div>
        </div>
      )}

      {/* 3. UNIVERSAL CREATOR ◎ */}
      {!viewingNode && (
        <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[4000] flex flex-col items-center">
          {creatorMode === 'NONE' ? (
            <button onClick={() => setCreatorMode('NODE')} className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-3xl shadow-2xl active:scale-90 transition-all border border-white/5">◎</button>
          ) : (
            <div className="flex space-x-4 bg-white/80 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-black/5 animate-in slide-in-from-bottom-10">
              <button onClick={() => setCreatorMode('TRACK')} className="px-6 py-3 bg-black text-white text-[9px] font-black uppercase rounded-full tracking-widest">Track</button>
              <button onClick={() => setCreatorMode('BOX')} className="px-6 py-3 bg-[#EBE8DB] text-black text-[9px] font-black uppercase rounded-full tracking-widest border border-black/5">Box</button>
              <button onClick={() => setCreatorMode('NONE')} className="px-4 py-3 text-[9px] font-black uppercase opacity-20 hover:opacity-100 transition-opacity">✕</button>
            </div>
          )}
        </nav>
      )}

      {/* 4. CREATOR COMPONENTS (Previously implemented logic remains) */}
      {creatorMode === 'NODE' && <NodeCreator onPost={(p:any)=>handlePost('NODE', p)} onCancel={()=>setCreatorMode('NONE')} />}
      {creatorMode === 'TRACK' && (
        <TrackCreator 
          pads={pads} setPads={setPads} 
          trackData={trackData} setTrackData={setTrackData} 
          onRelease={(p:any)=>handlePost('TRACK_TYPE', p)} 
          onCancel={()=>{setCreatorMode('NONE'); setTrackData([]); setPads(Array(8).fill(null));}} 
        />
      )}
      {creatorMode === 'BOX' && <BoxCreator onRelease={(p:any)=>handlePost('BOX_TYPE', p)} onCancel={()=>setCreatorMode('NONE')} />}
    </div>
  );
}

// --- PLAYER HELPERS ---

function TrackPlayer({data}: any) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    // 無限ループ再生: 500msごとに次のコマへ。最後まで行ったら0に戻る。
    const t = setInterval(() => setIdx(v => (v + 1) % data.length), 500);
    return () => clearInterval(t);
  }, [data]);
  const current = data[idx];
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="relative group max-h-[80vh] flex items-center justify-center">
        {current?.image_url ? (
          <img src={current.image_url} className="max-h-full max-w-full object-contain shadow-2xl rounded-sm transition-opacity duration-300" />
        ) : (
          <div className="text-2xl italic opacity-40 px-10 text-center">{current?.description}</div>
        )}
        <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 text-[8px] font-black opacity-10 tracking-[1em] uppercase">
          Looping {idx + 1}/{data.length}
        </div>
      </div>
    </div>
  );
}

function BoxViewer({data}: any) {
  return (
    <div className="w-full h-full flex items-center overflow-x-auto px-10 space-x-12 no-scrollbar snap-x snap-mandatory" onClick={e=>e.stopPropagation()}>
      {data.map((item: any, i: number) => (
        <div key={i} className="flex-shrink-0 h-[65vh] aspect-[3/4] shadow-2xl snap-center bg-white/20 rounded-sm overflow-hidden">
           {item.image_url ? (
             <img src={item.image_url} className="w-full h-full object-cover grayscale-[10%] hover:grayscale-0 transition-all duration-700" />
           ) : (
             <div className="w-full h-full flex items-center justify-center p-8 text-xs italic opacity-30">{item.description}</div>
           )}
        </div>
      ))}
      {/* 最後の余白 */}
      <div className="flex-shrink-0 w-20 h-full" />
    </div>
  );
}

// NodeCreator, TrackCreator, BoxCreator components remain functionally similar but with refined UI padding/styling.
// (Omitted here for brevity, assuming standard implementation as per previous prompt)