'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Room134Final() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [viewingNode, setViewingNode] = useState<any | null>(null);
  
  // Creator States
  const [creatorMode, setCreatorMode] = useState<'NONE' | 'NODE' | 'TRACK' | 'BOX'>('NONE');
  const [pads, setPads] = useState<(any | null)[]>(Array(8).fill(null));
  const [trackData, setTrackData] = useState<any[]>([]);
  const [boxData, setBoxData] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [previewTrack, setPreviewTrack] = useState<any[] | null>(null);
  const [playIdx, setPlayIdx] = useState(0);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('mainline').select('*');
    if (data) setNodes(data.sort(() => Math.random() - 0.5)); // ランダム表示
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- 再生ロジック ---
  useEffect(() => {
    if (previewTrack && playIdx < previewTrack.length) {
      const timer = setTimeout(() => setPlayIdx(prev => prev + 1), 500);
      return () => clearTimeout(timer);
    } else if (previewTrack && playIdx >= previewTrack.length) {
      setPreviewTrack(null);
    }
  }, [previewTrack, playIdx]);

  // --- 汎用アップロード ---
  const uploadToSupabase = async (file: File) => {
    const fileName = `${Date.now()}-${file.name}`;
    await supabase.storage.from('images').upload(fileName, file);
    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handlePost = async (type: string, payload: any) => {
    await supabase.from('mainline').insert([{
      ...payload,
      image_url: type, // NODE, TRACK_TYPE, BOX_TYPE
      created_at: new Date().toISOString()
    }]);
    setCreatorMode('NONE');
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-x-hidden selection:bg-black selection:text-white">
      <style jsx global>{`
        .mosaic-wall { column-count: 2; column-gap: 0.5rem; }
        @media (min-width: 768px) { .mosaic-wall { column-count: 4; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* 1. MAIN WALL (MOSAIC) */}
      <main className={`p-2 transition-all duration-700 ${creatorMode !== 'NONE' || viewingNode ? 'opacity-10 blur-2xl scale-95' : 'opacity-100'}`}>
        <div className="mosaic-wall max-w-[120rem] mx-auto">
          {nodes.map(node => {
            const isTrack = node.image_url === 'TRACK_TYPE';
            const isBox = node.image_url === 'BOX_TYPE';
            const contents = (isTrack || isBox) ? JSON.parse(node.description || '[]') : [];
            const thumb = (isTrack || isBox) ? contents[0]?.image_url : node.image_url;

            return (
              <div key={node.id} onClick={() => setViewingNode(node)} className="mb-2 break-inside-avoid rounded-sm overflow-hidden active:scale-95 transition-all cursor-pointer border border-black/5 relative bg-[#EDE9D9]">
                {thumb && <img src={thumb} className="w-full h-auto grayscale-[20%]" />}
                {!thumb && node.description && <div className="p-4 text-[11px] italic opacity-50">{node.description}</div>}
                
                {/* Overlays */}
                {isTrack && <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white text-3xl">▷</div>}
                {isBox && <div className="absolute inset-0 flex items-center justify-center bg-white/10 text-black text-3xl">▢</div>}
                
                {/* Re Button for short tracks */}
                {isTrack && contents.length < 32 && (
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setCreatorMode('TRACK');
                    setTrackData([...contents]);
                    const unique = Array.from(new Set(contents.map((s:any)=>s.id))).map(id=>contents.find((s:any)=>s.id===id)).slice(0,8);
                    setPads(prev => { const n = [...prev]; unique.forEach((u,i)=>n[i]=u); return n; });
                  }} className="absolute bottom-2 right-2 bg-black text-white text-[8px] px-2 py-1 rounded-full font-black uppercase opacity-60 hover:opacity-100">re</button>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* 2. VIEWER LAYER */}
      {viewingNode && (
        <div className="fixed inset-0 z-[5000] bg-[#EBE8DB] flex flex-col items-center justify-center p-4 animate-in fade-in" onClick={() => setViewingNode(null)}>
          {viewingNode.image_url === 'TRACK_TYPE' ? (
             <TrackPlayer data={JSON.parse(viewingNode.description)} />
          ) : viewingNode.image_url === 'BOX_TYPE' ? (
             <BoxViewer data={JSON.parse(viewingNode.description)} />
          ) : (
            <div className="max-w-4xl w-full text-center space-y-8">
              {viewingNode.image_url && <img src={viewingNode.image_url} className="max-h-[80vh] mx-auto object-contain shadow-2xl" />}
              {viewingNode.description && <p className="text-xl italic opacity-60">{viewingNode.description}</p>}
            </div>
          )}
        </div>
      )}

      {/* 3. UNIVERSAL CREATOR ◎ */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[4000] flex flex-col items-center">
        {creatorMode === 'NONE' ? (
          <button onClick={() => setCreatorMode('NODE')} className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-3xl shadow-2xl active:scale-90 transition-all">◎</button>
        ) : (
          <div className="flex space-x-6 animate-in slide-in-from-bottom-10">
            <button onClick={() => setCreatorMode('TRACK')} className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase rounded-full">Track</button>
            <button onClick={() => setCreatorMode('BOX')} className="px-6 py-3 bg-white text-black text-[10px] font-black uppercase rounded-full shadow-lg border border-black/5">Box</button>
            <button onClick={() => setCreatorMode('NONE')} className="px-6 py-3 text-[10px] font-black uppercase opacity-30">Cancel</button>
          </div>
        )}
      </nav>

      {/* 4. CREATOR MODALS (NODE / TRACK / BOX) */}
      {creatorMode === 'NODE' && <NodeCreator onPost={(p:any)=>handlePost('NODE', p)} onCancel={()=>setCreatorMode('NONE')} />}
      {creatorMode === 'TRACK' && (
        <TrackCreator 
          pads={pads} setPads={setPads} 
          trackData={trackData} setTrackData={setTrackData} 
          onRelease={(p:any)=>handlePost('TRACK_TYPE', p)} 
          onCancel={()=>setCreatorMode('NONE')} 
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
  return (
    <div className="fixed inset-0 z-[4500] bg-[#EBE8DB] flex flex-col items-center justify-center p-8">
      <textarea autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="..." className="w-full max-w-xl bg-transparent border-none text-3xl italic outline-none text-center h-48" />
      <div className="mt-12 flex items-center space-x-12">
        <label className="text-3xl opacity-20 cursor-pointer">📷<input type="file" className="hidden" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
        <button onClick={onCancel} className="text-[9px] font-black uppercase opacity-30">Cancel</button>
        <button onClick={async ()=>{
          let url = null;
          if(file) {
             const fileName = `${Date.now()}-${file.name}`;
             await supabase.storage.from('images').upload(fileName, file);
             url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
          }
          onPost({description: text, image_url: url});
        }} className="text-[10px] font-black uppercase border-b border-black/20">Post</button>
      </div>
    </div>
  );
}

function TrackCreator({pads, setPads, trackData, setTrackData, onRelease, onCancel}: any) {
  const [isRecording, setIsRecording] = useState(false);
  const triggerPad = (i: number) => {
    if(!pads[i]) return;
    if(isRecording && trackData.length < 32) setTrackData([...trackData, pads[i]]);
  };
  return (
    <div className="fixed inset-0 z-[4500] bg-black/10 backdrop-blur-3xl flex items-center justify-center p-4">
      <div className="bg-white/90 w-full max-w-xs p-8 rounded-[3rem] shadow-2xl border border-white/20">
        <div className="flex justify-between mb-8">
           <button onClick={()=>setIsRecording(!isRecording)} className={`text-[9px] font-black uppercase px-4 py-2 rounded-full ${isRecording ? 'bg-red-500 text-white' : 'border'}`}>{isRecording ? 'Rec...' : 'Standby'}</button>
           <div className="text-[9px] font-black opacity-20 tracking-widest">{trackData.length}/32</div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-8">
          {pads.map((p:any, i:number) => (
            <div key={i} onMouseDown={()=>triggerPad(i)} className="aspect-square bg-black/5 rounded-2xl border border-black/5 flex items-center justify-center relative overflow-hidden">
              {p?.image_url ? <img src={p.image_url} className="w-full h-full object-cover opacity-50" /> : <label className="cursor-pointer opacity-10">＋<input type="file" className="hidden" onChange={async e=>{
                const f = e.target.files?.[0]; if(f){
                  const fileName = `${Date.now()}-${f.name}`;
                  await supabase.storage.from('images').upload(fileName, f);
                  const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
                  const next = [...pads]; next[i] = {id: Date.now(), image_url: url}; setPads(next);
                }
              }} /></label>}
            </div>
          ))}
        </div>
        <div className="flex space-x-2">
          <button onClick={onCancel} className="flex-1 py-4 text-[9px] font-black uppercase opacity-20">Cancel</button>
          <button onClick={()=>onRelease({description: JSON.stringify(trackData)})} className="flex-2 px-8 py-4 bg-black text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-2xl">Release</button>
        </div>
      </div>
    </div>
  );
}

function BoxCreator({onRelease, onCancel}: any) {
  const [boxItems, setBoxItems] = useState<(any|null)[]>(Array(24).fill(null));
  return (
    <div className="fixed inset-0 z-[4500] bg-[#EBE8DB] p-10 flex flex-col items-center justify-center">
       <div className="w-full max-w-5xl overflow-x-auto no-scrollbar py-20 flex space-x-4">
         {boxItems.map((item, i) => (
           <div key={i} className="flex-shrink-0 w-48 aspect-[3/4] border border-black/10 bg-white/40 rounded-sm flex items-center justify-center overflow-hidden">
             {item?.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : (
               <label className="text-2xl opacity-10 cursor-pointer">＋<input type="file" className="hidden" onChange={async e => {
                 const f = e.target.files?.[0]; if(f){
                   const fileName = `${Date.now()}-${f.name}`;
                   await supabase.storage.from('images').upload(fileName, f);
                   const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
                   const next = [...boxItems]; next[i] = {id: Date.now()+i, image_url: url}; setBoxItems(next);
                 }
               }} /></label>
             )}
           </div>
         ))}
       </div>
       <div className="mt-10 flex space-x-8">
          <button onClick={onCancel} className="text-[10px] font-black uppercase opacity-20 tracking-widest">Cancel</button>
          <button onClick={()=>onRelease({description: JSON.stringify(boxItems.filter(i=>i!==null))})} className="text-[10px] font-black uppercase border-b border-black pb-1 tracking-widest">Release Box</button>
       </div>
    </div>
  );
}

function TrackPlayer({data}: any) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(v => (v + 1) % data.length), 500);
    return () => clearInterval(t);
  }, [data]);
  const current = data[idx];
  return (
    <div className="w-full h-full flex items-center justify-center p-10">
      {current?.image_url ? <img src={current.image_url} className="max-h-full object-contain shadow-2xl" /> : <p className="text-3xl italic">{current?.description}</p>}
    </div>
  );
}

function BoxViewer({data}: any) {
  return (
    <div className="w-full h-full flex items-center overflow-x-auto px-10 space-x-8 no-scrollbar" onClick={e=>e.stopPropagation()}>
      {data.map((item: any, i: number) => (
        <div key={i} className="flex-shrink-0 h-[70vh] aspect-[3/4] shadow-2xl">
           <img src={item.image_url} className="w-full h-full object-cover rounded-sm" />
        </div>
      ))}
    </div>
  );
}