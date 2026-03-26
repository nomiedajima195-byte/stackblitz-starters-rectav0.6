'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Room134Full() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [viewingNode, setViewingNode] = useState<any | null>(null);
  const [creatorMode, setCreatorMode] = useState<'NONE' | 'NODE' | 'TRACK' | 'BOX'>('NONE');
  
  // 制作データ共有
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
                    const newPads = Array(8).fill(null);
                    unique.forEach((u,i) => { newPads[i] = u; });
                    setPads(newPads);
                    setCreatorMode('TRACK');
                  }} className="absolute bottom-2 right-2 bg-black text-white text-[8px] px-2 py-1 rounded-full font-black uppercase z-10 shadow-lg">re</button>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* 2. VIEWER LAYER */}
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
          <div className="h-32 flex items-center justify-center">
            <button onClick={() => setViewingNode(null)} className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center text-2xl shadow-xl active:scale-90 transition-all">◎</button>
          </div>
        </div>
      )}

      {/* 3. UNIVERSAL CREATOR UI */}
      {!viewingNode && (
        <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[4000] flex flex-col items-center">
          {creatorMode === 'NONE' ? (
            <button onClick={() => setCreatorMode('NODE')} className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-3xl shadow-2xl active:scale-90 transition-all">◎</button>
          ) : (
            <div className="flex space-x-4 bg-white/80 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-black/5 animate-in slide-in-from-bottom-10">
              <button onClick={() => setCreatorMode('TRACK')} className="px-6 py-3 bg-black text-white text-[9px] font-black uppercase rounded-full tracking-widest">Track</button>
              <button onClick={() => setCreatorMode('BOX')} className="px-6 py-3 bg-[#EBE8DB] text-black text-[9px] font-black uppercase rounded-full tracking-widest border border-black/5">Box</button>
              <button onClick={() => { setCreatorMode('NONE'); setTrackData([]); setPads(Array(8).fill(null)); }} className="px-4 py-3 text-[9px] font-black uppercase opacity-20 hover:opacity-100">✕</button>
            </div>
          )}
        </nav>
      )}

      {/* 4. CREATOR COMPONENTS */}
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

// --- SUB COMPONENTS ---

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
        <button onClick={onCancel} className="text-[9px] font-black uppercase opacity-30">Cancel</button>
        <button onClick={handlePost} disabled={loading} className="text-[10px] font-black uppercase border-b border-black/20 pb-1">{loading ? '...' : 'Post'}</button>
      </div>
      {file && <div className="mt-4 text-[8px] opacity-30 uppercase tracking-widest">Image Selected: {file.name}</div>}
    </div>
  );
}

function TrackCreator({pads, setPads, trackData, setTrackData, onRelease, onCancel}: any) {
  const [isRecording, setIsRecording] = useState(false);

  const triggerPad = (i: number) => {
    if(!pads[i]) return;
    if(isRecording && trackData.length < 32) {
      setTrackData((prev: any) => [...prev, pads[i]]);
    }
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
    <div className="fixed inset-0 z-[4500] bg-black/10 backdrop-blur-3xl flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
      <div className="bg-white/90 w-full max-w-xs p-8 rounded-[3.5rem] shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-8">
           <button onClick={()=>setIsRecording(!isRecording)} className={`text-[9px] font-black uppercase px-5 py-2.5 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white shadow-lg animate-pulse' : 'bg-black text-white'}`}>
             {isRecording ? 'Rec...' : 'Start Rec'}
           </button>
           <div className="text-[10px] font-black opacity-20 tabular-nums">{trackData.length}/32</div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-10">
          {pads.map((p:any, i:number) => (
            <div key={i} onMouseDown={()=>triggerPad(i)} className={`aspect-square rounded-2xl border transition-all flex items-center justify-center relative overflow-hidden active:scale-90 cursor-pointer ${p ? 'bg-white border-black/5 shadow-sm' : 'bg-black/5 border-dashed border-black/10'}`}>
              {p?.image_url ? (
                <img src={p.image_url} className="w-full h-full object-cover opacity-60" />
              ) : (
                <label className="w-full h-full flex items-center justify-center cursor-pointer opacity-10 hover:opacity-40 transition-opacity">
                  ＋<input type="file" className="hidden" onChange={e=>e.target.files?.[0] && handleFile(i, e.target.files[0])} />
                </label>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col space-y-3">
          <button onClick={()=>onRelease({description: JSON.stringify(trackData)})} className="w-full py-4 bg-black text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl active:scale-95 transition-all">Release Track</button>
          <button onClick={onCancel} className="w-full py-2 text-[8px] font-black uppercase opacity-20">Discard</button>
        </div>
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
             {item?.image_url ? (
               <img src={item.image_url} className="w-full h-full object-cover" />
             ) : (
               <label className="w-full h-full flex items-center justify-center text-3xl opacity-5 hover:opacity-20 cursor-pointer transition-opacity">
                 ＋<input type="file" className="hidden" onChange={e=>e.target.files?.[0] && handleFile(i, e.target.files[0])} />
               </label>
             )}
             <div className="absolute top-2 left-3 text-[8px] opacity-10 font-mono italic">#{i+1}</div>
           </div>
         ))}
       </div>
       <div className="mt-12 flex items-center space-x-10">
          <button onClick={onCancel} className="text-[10px] font-black uppercase opacity-20 tracking-widest">Cancel</button>
          <button onClick={async ()=>{
            setLoading(true);
            const validItems = boxItems.filter(i => i !== null);
            await onRelease({description: JSON.stringify(validItems)});
          }} disabled={loading} className="px-10 py-4 bg-black text-white text-[10px] font-black uppercase rounded-full tracking-[0.2em] shadow-2xl active:scale-95 transition-all">
            {loading ? '...' : 'Release Box'}
          </button>
       </div>
    </div>
  );
}

function TrackPlayer({data}: any) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if(!data || data.length === 0) return;
    const t = setInterval(() => setIdx(v => (v + 1) % data.length), 500);
    return () => clearInterval(t);
  }, [data]);
  const current = data[idx];
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="relative max-h-[80vh] w-full flex items-center justify-center">
        {current?.image_url ? (
          <img src={current.image_url} className="max-h-full max-w-full object-contain shadow-2xl rounded-sm" />
        ) : (
          <div className="text-2xl italic opacity-40 px-10 text-center">{current?.description}</div>
        )}
      </div>
    </div>
  );
}

function BoxViewer({data}: any) {
  return (
    <div className="w-full h-full flex items-center overflow-x-auto px-10 space-x-12 no-scrollbar snap-x snap-mandatory" onClick={e=>e.stopPropagation()}>
      {data.map((item: any, i: number) => (
        <div key={i} className="flex-shrink-0 h-[65vh] aspect-[3/4] shadow-2xl snap-center bg-white rounded-sm overflow-hidden">
           {item.image_url ? (
             <img src={item.image_url} className="w-full h-full object-cover grayscale-[10%] hover:grayscale-0 transition-all duration-700" />
           ) : (
             <div className="w-full h-full flex items-center justify-center p-8 text-xs italic opacity-30">{item.description}</div>
           )}
        </div>
      ))}
      <div className="flex-shrink-0 w-20 h-full" />
    </div>
  );
}