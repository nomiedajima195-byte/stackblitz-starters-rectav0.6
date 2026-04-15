'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* --- 高速リサイズ (最大320px / JPEG) --- */
const resizeImage = (file: File): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxSide = 320;
        if (width > height) {
          if (width > maxSide) { height *= maxSide / width; width = maxSide; }
        } else {
          if (height > maxSide) { width *= maxSide / height; height = maxSide; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, 0, 0, width, height); }
        canvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/jpeg', 0.7);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export default function Room134_Final_v2() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [viewingNode, setViewingNode] = useState<any | null>(null);
  const [creatorMode, setCreatorMode] = useState<'NONE' | 'MENU' | 'NODE' | 'TRACK' | 'BOX'>('NONE');
  const [pads, setPads] = useState<(any | null)[]>(Array(8).fill(null));

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('mainline').select('*');
    if (data) setNodes(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePost = async (type: string, payload: any) => {
    const { error } = await supabase.from('mainline').insert([{ ...payload, image_url: type, created_at: new Date().toISOString() }]);
    if (error) console.error("Post Error:", error);
    setCreatorMode('NONE');
    setTimeout(fetchData, 500); // 反映待ち
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col relative text-[#000] font-mono bg-[#000080]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DotGothic16&display=swap');
        body { background: #000080; margin: 0; overflow: hidden; position: fixed; width: 100%; height: 100%; }
        .win-btn { background: #c0c0c0; border-top: 2px solid #fff; border-left: 2px solid #fff; border-right: 2px solid #808080; border-bottom: 2px solid #808080; box-shadow: inset 1px 1px 0px #dfdfdf; font-family: sans-serif; color: black; cursor: pointer; }
        .win-btn:active { border-top: 2px solid #808080; border-left: 2px solid #808080; border-right: 2px solid #fff; border-bottom: 2px solid #fff; }
        .rough-dot-text { font-family: 'DotGothic16', sans-serif; text-shadow: 2px 2px 0px #000; }
        .frame-scroll::-webkit-scrollbar { width: 12px; }
        .frame-scroll::-webkit-scrollbar-track { background: #dfdfdf; }
        .frame-scroll::-webkit-scrollbar-thumb { background: #c0c0c0; border: 1px solid #808080; }
        .mosaic-wall { column-count: 2; column-gap: 0.5rem; } 
        @media (min-width: 768px) { .mosaic-wall { column-count: 4; column-gap: 0.75rem; } }
      `}</style>

      <header className="h-[60px] md:h-[80px] flex items-center justify-center shrink-0">
        <h1 onClick={() => window.location.reload()} className="text-3xl md:text-5xl rough-dot-text text-[#FF8C00] cursor-pointer">Room134</h1>
      </header>

      <main className="flex-grow frame-scroll overflow-y-auto mx-2 md:mx-4 mb-2 bg-[#000080] p-2"
            style={{ border: '2px solid', borderColor: '#808080 #fff #fff #808080', boxShadow: 'inset 2px 2px 0px #000' }}>
        <div className={`transition-all ${creatorMode !== 'NONE' || viewingNode ? 'blur-sm scale-95 opacity-50' : ''}`}>
          <div className="mosaic-wall max-w-[140rem] mx-auto pb-10">
            {nodes.map(node => {
              const isTrack = node.image_url === 'TRACK_TYPE';
              const isBox = node.image_url === 'BOX_TYPE';
              const contents = (isTrack || isBox) ? JSON.parse(node.description || '[]') : [];
              const thumb = (isTrack || isBox) ? contents[0]?.image_url : node.image_url;
              return (
                <div key={node.id} onClick={() => setViewingNode(node)} className="mb-2 break-inside-avoid win-btn p-[1px] bg-white">
                  <div className="bg-white relative">
                    {isBox && <div className="absolute top-1 right-1 z-10 w-4 h-4 bg-[#c0c0c0] border border-black flex items-center justify-center text-[8px]">▢</div>}
                    {thumb && !['NODE', 'TRACK_TYPE', 'BOX_TYPE'].includes(thumb) ? (
                      <img src={thumb} className="w-full h-auto" alt="node" />
                    ) : (
                      <div className="p-3 text-[10px] text-center min-h-[60px]">{node.description}</div>
                    )}
                    {isTrack && <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white text-3xl">▷</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <nav className="h-[50px] shrink-0 bg-[#c0c0c0] border-t-2 border-white p-1 flex items-center z-[4000]">
        <button onClick={() => setCreatorMode(creatorMode === 'NONE' ? 'MENU' : 'NONE')} className="win-btn px-3 h-full font-bold text-[11px] italic">◎ upload</button>
        <div className="ml-1 flex gap-1 h-full items-center overflow-x-auto no-scrollbar">
          {creatorMode === 'MENU' && (
            <>
              <button onClick={() => setCreatorMode('NODE')} className="win-btn px-3 h-[32px] text-[9px] shrink-0">NODE</button>
              <button onClick={() => setCreatorMode('TRACK')} className="win-btn px-3 h-[32px] text-[9px] shrink-0">TRACK</button>
              <button onClick={() => setCreatorMode('BOX')} className="win-btn px-3 h-[32px] text-[9px] shrink-0">Scraps</button>
            </>
          )}
        </div>
        <div className="win-btn px-2 h-full flex items-center text-[9px] bg-[#dfdfdf] ml-auto">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </nav>

      {/* Viewing / Editors */}
      {viewingNode && (
        <div className="fixed inset-0 z-[5000] bg-black/80 flex items-center justify-center p-2">
          <div className="win-btn bg-[#c0c0c0] w-full max-w-5xl h-[90dvh] flex flex-col">
            <div className="bg-[#000080] text-white p-1 px-2 flex justify-between items-center text-[10px] font-bold shrink-0">
              <span>VIEWER.EXE</span><button onClick={() => setViewingNode(null)} className="win-btn px-2">×</button>
            </div>
            <div className="p-2 md:p-6 overflow-auto bg-[#808080] flex-grow flex items-center justify-center">
               <div className="bg-white p-1 win-btn max-h-full flex items-center justify-center">
                {viewingNode.image_url === 'TRACK_TYPE' ? <TrackPlayer data={JSON.parse(viewingNode.description)} onComplete={() => setViewingNode(null)} /> 
                : viewingNode.image_url === 'BOX_TYPE' ? <BoxViewer node={viewingNode} /> 
                : (viewingNode.image_url !== 'NODE' ? <img src={viewingNode.image_url} className="max-h-[75dvh] object-contain" /> : <div className="p-6 text-lg italic">{viewingNode.description}</div>)}
               </div>
            </div>
          </div>
        </div>
      )}

      {creatorMode === 'NODE' && <NodeCreator onPost={(p:any)=>handlePost('NODE', p)} onCancel={()=>setCreatorMode('NONE')} />}
      {creatorMode === 'TRACK' && <TrackSequencer onPost={(p:any)=>handlePost('TRACK_TYPE', p)} onCancel={()=>setCreatorMode('NONE')} pads={pads} setPads={setPads} />}
      {creatorMode === 'BOX' && <BoxCreator onRelease={(p:any)=>handlePost('BOX_TYPE', p)} onCancel={()=>setCreatorMode('NONE')} />}
    </div>
  );
}

/* --- Editors --- */

function NodeCreator({onPost, onCancel}: any) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    setLoading(true);
    let url = null;
    if(file) {
      const resized = await resizeImage(file);
      const fName = `${Date.now()}.jpg`;
      const { data } = await supabase.storage.from('images').upload(fName, resized);
      if(data) url = supabase.storage.from('images').getPublicUrl(fName).data.publicUrl;
    }
    onPost({description: text, image_url: url || 'NODE'});
  };

  return (
    <div className="fixed inset-0 z-[4500] bg-black/60 flex items-center justify-center p-4">
      <div className="win-btn p-4 w-full max-w-xl">
        <div className="bg-[#000080] text-white p-1 px-2 mb-4 flex justify-between items-center text-[11px] font-bold"><span>NEW_NODE.EXE</span><button onClick={onCancel}>×</button></div>
        <textarea autoFocus value={text} onChange={e=>setText(e.target.value)} className="w-full h-32 win-btn bg-white p-4 outline-none italic mb-4 text-sm" />
        <div className="flex justify-between items-center">
            <label className="win-btn px-3 py-1 text-[9px] font-bold cursor-pointer">UPLOAD IMG<input type="file" className="hidden" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
            <button onClick={handlePost} disabled={loading} className="win-btn px-6 py-2 font-bold">{loading ? '...' : 'POST'}</button>
        </div>
        {file && <p className="text-[8px] text-[#000080] mt-2 font-bold">Attached: {file.name}</p>}
      </div>
    </div>
  );
}

function TrackSequencer({onPost, onCancel, pads, setPads}: any) {
  const [trackData, setTrackData] = useState<any[]>([]);
  const [uploadingPad, setUploadingPad] = useState<number | null>(null);

  const uploadToPad = async (index: number, f: File) => {
    setUploadingPad(index);
    const resized = await resizeImage(f); // パッド読み込み時にリサイズ完了させておく
    const fName = `track-${Date.now()}-${index}.jpg`;
    const { data } = await supabase.storage.from('images').upload(fName, resized);
    if(data) {
      const url = supabase.storage.from('images').getPublicUrl(fName).data.publicUrl;
      const newPads = [...pads];
      newPads[index] = { id: Date.now(), image_url: url };
      setPads(newPads);
    }
    setUploadingPad(null);
  };

  return (
    <div className="fixed inset-0 z-[4500] bg-black/60 flex items-center justify-center p-2">
      <div className="win-btn p-3 w-full max-w-md bg-[#c0c0c0]">
        <div className="bg-[#000080] text-white p-1 px-2 mb-2 flex justify-between items-center text-[10px] font-bold"><span>TRACK_RECORDER.EXE</span><button onClick={onCancel}>×</button></div>
        
        {/* PREVIEW AREA */}
        <div className="h-16 bg-black border-inset mb-2 flex gap-1 overflow-x-auto p-1 items-center no-scrollbar">
          {trackData.length === 0 && <span className="text-[#0f0] text-[9px] animate-pulse ml-2">WAITING REC...</span>}
          {trackData.map((t, i) => (
            <img key={i} src={t.image_url} className="h-full w-auto border border-[#0f0]" />
          ))}
        </div>

        {/* PADS */}
        <div className="grid grid-cols-4 gap-1 mb-2 bg-[#808080] p-1 border-inset">
          {pads.map((p, i) => (
            <div key={i} className="aspect-square win-btn bg-white relative flex items-center justify-center overflow-hidden">
              {uploadingPad === i ? <span className="text-[8px] animate-spin">...</span> :
               !p ? <label className="cursor-pointer text-lg opacity-20">＋<input type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadToPad(i, e.target.files[0])} /></label> :
               <div className="w-full h-full flex flex-col">
                 <img src={p.image_url} className="w-full h-2/3 object-cover" />
                 <button onClick={() => setTrackData(v => [...v, p])} className="w-full h-1/3 bg-red-600 text-white text-[8px] font-bold active:bg-red-800">● REC</button>
               </div>
              }
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setTrackData([])} className="win-btn flex-grow py-2 text-[10px]">CLEAR</button>
          <button onClick={() => onPost({description: JSON.stringify(trackData)})} disabled={trackData.length === 0} className="win-btn flex-[2] py-2 font-bold text-red-600">● RELEASE TRACK</button>
        </div>
      </div>
    </div>
  );
}

function TrackPlayer({data, onComplete}: any) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if(!data.length) return;
    const timer = setInterval(() => {
      setIdx(v => {
        if (v >= data.length - 1) { clearInterval(timer); setTimeout(onComplete, 1000); return v; }
        return v + 1;
      });
    }, 400); // 90sっぽいカクカク感
    return () => clearInterval(timer);
  }, [data, onComplete]);
  return <div className="w-full h-full flex items-center justify-center bg-black">{data[idx] && <img src={data[idx].image_url} className="max-h-full" />}</div>;
}

function BoxViewer({node}: any) {
  const data = JSON.parse(node.description || '[]');
  return (
    <div className="flex overflow-x-auto gap-4 p-4 no-scrollbar items-center">
      {data.map((item: any, i: number) => <img key={i} src={item.image_url} className="h-[50dvh] win-btn p-1 flex-shrink-0" />)}
    </div>
  );
}

function BoxCreator({onRelease, onCancel}: any) {
  const [items, setItems] = useState<any[]>(Array(6).fill(null));
  const [upIdx, setUpIdx] = useState<number | null>(null);

  const handleFile = async (i: number, f: File) => {
    setUpIdx(i);
    const resized = await resizeImage(f);
    const fName = `scrap-${Date.now()}-${i}.jpg`;
    const { data } = await supabase.storage.from('images').upload(fName, resized);
    if(data) {
      const url = supabase.storage.from('images').getPublicUrl(fName).data.publicUrl;
      const next = [...items];
      next[i] = {id: Date.now(), image_url: url};
      setItems(next);
    }
    setUpIdx(null);
  };

  return (
    <div className="fixed inset-0 z-[4500] bg-black/60 flex items-center justify-center p-4">
      <div className="win-btn p-4 w-full max-w-xl">
        <div className="bg-[#000080] text-white p-1 px-2 mb-4 flex justify-between items-center text-[11px] font-bold"><span>SCRAP_PACK.EXE</span><button onClick={onCancel}>×</button></div>
        <div className="grid grid-cols-3 gap-1 mb-4">
          {items.map((it, i) => (
            <div key={i} className="aspect-square win-btn bg-white flex items-center justify-center overflow-hidden">
              {upIdx === i ? <span className="animate-spin">...</span> : 
               !it ? <label className="cursor-pointer text-xl opacity-10">＋<input type="file" className="hidden" onChange={e=>e.target.files?.[0] && handleFile(i, e.target.files[0])} /></label> : 
               <img src={it.image_url} className="w-full h-full object-cover" />}
            </div>
          ))}
        </div>
        <button onClick={()=>onRelease({description: JSON.stringify(items.filter(x=>x))})} className="win-btn w-full py-2 font-bold">PACK & RELEASE</button>
      </div>
    </div>
  );
}