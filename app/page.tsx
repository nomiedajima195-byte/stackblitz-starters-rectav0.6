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
  const [previewTrack, setPreviewTrack] = useState(false);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('mainline').select('*');
    if (data) setNodes(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePost = async (type: string, payload: any) => {
    await supabase.from('mainline').insert([{ ...payload, image_url: type, created_at: new Date().toISOString() }]);
    setCreatorMode('NONE');
    setTrackData([]);
    fetchData();
  };

  const autoAssignToPad = (node: any) => {
    const newPads = [...pads];
    const emptyIdx = newPads.findIndex(p => p === null);
    const item = { id: node.id, image_url: node.image_url, description: node.description };
    if (emptyIdx !== -1) { newPads[emptyIdx] = item; } 
    else { newPads.shift(); newPads.push(item); }
    setPads(newPads);
    setViewingNode(null);
  };

  const handleRemix = (node: any) => {
    const contents = JSON.parse(node.description || '[]');
    const newPads = Array(8).fill(null);
    const uniqueItems = contents.filter((v:any, i:number, a:any[]) => a.findIndex(t => t.image_url === v.image_url) === i);
    uniqueItems.slice(0, 8).forEach((item: any, idx: number) => {
      newPads[idx] = item;
    });
    setPads(newPads);
    setTrackData([]); 
    setCreatorMode('TRACK');
    setViewingNode(null);
  };

  const uploadToPad = async (index: number, file: File) => {
    const fileName = `${Date.now()}-${file.name}`;
    await supabase.storage.from('images').upload(fileName, file);
    const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    const newPads = [...pads];
    newPads[index] = { id: Date.now(), image_url: url };
    setPads(newPads);
  };

  const clearPad = (index: number) => {
    const newPads = [...pads];
    newPads[index] = null;
    setPads(newPads);
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-x-hidden selection:bg-black selection:text-white">
      <style jsx global>{`
        .mosaic-wall { column-count: 2; column-gap: 0.5rem; } 
        @media (min-width: 768px) { .mosaic-wall { column-count: 4; column-gap: 0.75rem; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <header className={`fixed top-0 left-0 w-full z-[3000] p-6 transition-opacity duration-500 ${viewingNode ? 'opacity-0' : 'opacity-100'}`}>
        <h1 onClick={() => window.location.reload()} className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30 text-center cursor-pointer hover:opacity-100 transition-opacity italic">Room134</h1>
      </header>

      <main className={`p-2 pt-20 transition-all duration-700 ${creatorMode !== 'NONE' || viewingNode ? 'blur-md scale-95 pointer-events-none' : 'opacity-100'}`}>
        <div className="mosaic-wall max-w-[140rem] mx-auto">
          {nodes.map(node => {
            const isTrack = node.image_url === 'TRACK_TYPE';
            const isBox = node.image_url === 'BOX_TYPE';
            const contents = (isTrack || isBox) ? JSON.parse(node.description || '[]') : [];
            const thumb = (isTrack || isBox) ? contents[0]?.image_url : node.image_url;

            return (
              <div key={node.id} onClick={() => setViewingNode(node)} className="mb-2 break-inside-avoid relative group cursor-pointer active:scale-[0.98] transition-transform overflow-hidden rounded-sm">
                
                {isBox && (
                  <div className="absolute top-2 right-2 z-10 w-5 h-5 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-sm text-[12px] text-black/70 shadow-sm pointer-events-none transition-all group-hover:bg-white group-hover:text-black">
                    ▢
                  </div>
                )}

                <div className="relative z-0 overflow-hidden bg-[#F0EEE4] border border-black/10 shadow-sm min-h-[50px]">
                  {thumb && !['NODE', 'TRACK_TYPE', 'BOX_TYPE'].includes(thumb) ? (
                    <img src={thumb} className="w-full h-auto grayscale-[20%] group-hover:grayscale-0 transition-all duration-500" />
                  ) : (
                    <div className="p-4 flex items-center justify-center text-[11px] leading-relaxed italic opacity-70 break-words text-center min-h-[100px]">
                      {isTrack || isBox ? contents[0]?.description || node.description : node.description}
                    </div>
                  )}
                  {isTrack && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 text-white/40 text-5xl font-light pointer-events-none group-hover:text-white/70 transition-colors">▷</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {viewingNode && (
        <div className="fixed inset-0 z-[5000] bg-[#EBE8DB]/90 backdrop-blur-lg flex flex-col animate-in fade-in duration-500">
          <div className="flex-grow flex flex-col items-center justify-center p-6 overflow-hidden">
            {viewingNode.image_url === 'TRACK_TYPE' ? (
              <div className="w-full h-full flex flex-col items-center">
                <div className="flex-grow w-full flex items-center justify-center">
                   {/* 修正箇所: onCompleteで自動的にnull（メイン）に戻す */}
                   <TrackPlayer data={JSON.parse(viewingNode.description)} onComplete={() => setViewingNode(null)} />
                </div>
                <div className="absolute bottom-32 right-10">
                  <button onClick={() => handleRemix(viewingNode)} className="group flex flex-col items-center gap-2">
                    <span className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl shadow-xl active:scale-90 transition-all">⇄</span>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-opacity">Remix</span>
                  </button>
                </div>
              </div>
            ) : viewingNode.image_url === 'BOX_TYPE' ? (
               <BoxViewer node={viewingNode} onUpdate={(newC: any[]) => {
                 supabase.from('mainline').update({ description: JSON.stringify(newC) }).eq('id', viewingNode.id).then(() => {
                   setViewingNode((prev: any) => ({ ...prev, description: JSON.stringify(newC) }));
                   fetchData();
                 });
               }} />
            ) : (
              <div className="max-w-4xl w-full flex flex-col items-center">
                {viewingNode.image_url && !['NODE'].includes(viewingNode.image_url) ? (
                  <img src={viewingNode.image_url} className="max-h-[60vh] object-contain shadow-2xl rounded-sm mb-10" />
                ) : (
                  <div className="max-h-[60vh] mb-10 px-6 text-2xl italic text-center opacity-80 leading-loose">{viewingNode.description}</div>
                )}
                <button onClick={() => autoAssignToPad(viewingNode)} className="px-10 py-4 bg-black text-white text-[11px] font-black tracking-[0.3em] uppercase rounded-full shadow-2xl active:scale-90 transition-all flex items-center gap-3">↓ PAD</button>
              </div>
            )}
          </div>
          <div className="h-24 flex items-center justify-center">
            <button onClick={() => setViewingNode(null)} className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center text-2xl shadow-xl active:scale-90 border border-white/10">◎</button>
          </div>
        </div>
      )}

      {creatorMode === 'TRACK' && (
        <div className="fixed inset-0 z-[4500] bg-black/10 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white/70 backdrop-blur-2xl w-full max-w-xs p-10 rounded-[3.5rem] shadow-2xl border border-white/40">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setTrackData([])} className="text-[9px] font-black uppercase px-5 py-2.5 bg-black/10 text-black rounded-full shadow-sm hover:bg-black/20 transition-colors">Clear REC</button>
              <div className="text-[10px] font-black opacity-40 tabular-nums flex items-center tracking-widest">
                <span className={`text-red-500 mr-2 text-[8px] ${trackData.length > 0 ? 'animate-pulse' : 'opacity-0'}`}>● REC</span>
                {trackData.length}/32
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mb-12">
              {pads.map((p, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  {i < 4 && (
                    <button onClick={() => clearPad(i)} className={`text-[12px] opacity-20 hover:opacity-100 transition-opacity ${!p ? 'invisible' : ''}`}>✕</button>
                  )}
                  
                  <div className="aspect-square relative w-full">
                    {!p && (
                      <label className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center text-[20px] opacity-10 hover:opacity-30 transition-opacity">
                        ＋<input type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadToPad(i, e.target.files[0])} />
                      </label>
                    )}
                    <div 
                      onMouseDown={() => p && setTrackData(prev => prev.length < 32 ? [...prev, p] : prev)}
                      className={`w-full h-full rounded-2xl border transition-all flex items-center justify-center overflow-hidden active:scale-90 cursor-pointer ${p ? 'bg-white border-black/10 shadow-md ring-2 ring-black/10' : 'bg-black/5 border-dashed border-black/10'}`}
                    >
                      {p?.image_url && !['NODE'].includes(p.image_url) ? (
                        <img src={p.image_url} className="w-full h-full object-cover" />
                      ) : p?.description ? (
                        <span className="text-[6px] p-1 text-center leading-tight overflow-hidden opacity-60 italic">{p.description.substring(0, 20)}...</span>
                      ) : null}
                    </div>
                  </div>

                  {i >= 4 && (
                    <button onClick={() => clearPad(i)} className={`text-[12px] opacity-20 hover:opacity-100 transition-opacity ${!p ? 'invisible' : ''}`}>✕</button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
              <button onClick={() => setPreviewTrack(true)} disabled={trackData.length === 0} className="flex-1 py-4 bg-[#EBE8DB] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-sm border border-black/10 active:scale-95 transition-all disabled:opacity-30">Preview</button>
              <button onClick={() => handlePost('TRACK_TYPE', {description: JSON.stringify(trackData)})} disabled={trackData.length === 0} className="flex-1 py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-30">Release</button>
            </div>
            <button onClick={() => setCreatorMode('NONE')} className="w-full py-3 text-[8px] font-black uppercase opacity-20 hover:opacity-100 transition-opacity">Cancel</button>
          </div>
        </div>
      )}

      {previewTrack && (
        <div className="fixed inset-0 z-[6000] bg-[#EBE8DB] flex flex-col items-center justify-center animate-in fade-in">
          <TrackPlayer data={trackData} onComplete={() => setPreviewTrack(false)} />
          <button onClick={() => setPreviewTrack(false)} className="absolute bottom-10 px-6 py-3 bg-black/10 text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-black hover:text-white transition-colors">Stop Preview</button>
        </div>
      )}

      {creatorMode === 'NODE' && <NodeCreator onPost={(p:any)=>handlePost('NODE', p)} onCancel={()=>setCreatorMode('NONE')} />}
      {creatorMode === 'BOX' && <BoxCreator onRelease={(p:any)=>handlePost('BOX_TYPE', p)} onCancel={()=>setCreatorMode('NONE')} />}

      {!viewingNode && (
        <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[4000]">
          {creatorMode === 'NONE' ? (
            <button onClick={() => setCreatorMode('MENU')} className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-3xl shadow-2xl active:scale-90 transition-all border border-white/5">◎</button>
          ) : creatorMode === 'MENU' ? (
            <div className="flex space-x-4 bg-white/90 backdrop-blur-2xl p-3 rounded-full shadow-2xl border border-black/5 animate-in slide-in-from-bottom-10">
              <button onClick={() => setCreatorMode('NODE')} className="px-6 py-3 bg-black text-white text-[9px] font-black uppercase rounded-full">Node</button>
              <button onClick={() => setCreatorMode('TRACK')} className="px-6 py-3 bg-black text-white text-[9px] font-black uppercase rounded-full">Track</button>
              <button onClick={() => setCreatorMode('BOX')} className="px-6 py-3 bg-[#EBE8DB] text-black text-[9px] font-black uppercase rounded-full border border-black/5">Scraps</button>
              <button onClick={() => setCreatorMode('NONE')} className="px-4 py-3 text-[9px] font-black uppercase opacity-20">✕</button>
            </div>
          ) : null}
        </nav>
      )}
    </div>
  );
}

// --- 以下、Sub Components ---
function TrackPlayer({data, onComplete}: any) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if(!data || data.length === 0) { return; }
    const timer = setInterval(() => {
      setIdx(v => {
        if (v >= data.length - 1) { 
          clearInterval(timer); 
          // 最後のコマを表示してから800ms後にonCompleteを発火（画面を閉じる）
          setTimeout(onComplete, 800); 
          return v; 
        }
        return v + 1;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [data, onComplete]);
  const current = data[idx];
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      {current?.image_url && !['NODE'].includes(current.image_url) ? (
        <img key={idx} src={current.image_url} className="max-h-[80vh] max-w-full object-contain animate-in fade-in duration-300" />
      ) : (
        <div className="text-2xl italic text-center animate-in fade-in duration-300 px-10 break-words leading-relaxed text-black/80">{current?.description}</div>
      )}
    </div>
  );
}

function BoxViewer({node, onUpdate}: any) {
  const data = JSON.parse(node.description || '[]');
  const [loading, setLoading] = useState(false);
  const handleAdd = async (f: File) => {
    setLoading(true);
    const fileName = `${Date.now()}-${f.name}`;
    await supabase.storage.from('images').upload(fileName, f);
    const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    await onUpdate([...data, { id: Date.now(), image_url: url }]);
    setLoading(false);
  };
  return (
    <div className="w-full h-full flex items-center overflow-x-auto px-10 space-x-12 no-scrollbar snap-x snap-mandatory" onClick={e=>e.stopPropagation()}>
      {data.map((item: any, i: number) => (
        <div key={i} className="flex-shrink-0 h-[65vh] aspect-[3/4] shadow-2xl snap-center bg-white rounded-sm overflow-hidden border border-black/5">
           {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <div className="p-12 text-sm italic opacity-40 break-words text-center flex items-center justify-center h-full w-full">{item.description}</div>}
        </div>
      ))}
      <div className="flex-shrink-0 h-[65vh] aspect-[3/4] snap-center bg-black/5 border-2 border-dashed border-black/10 rounded-sm flex items-center justify-center relative hover:bg-black/10 transition-all">
        {loading ? <span className="text-[10px] animate-pulse">...</span> : <label className="w-full h-full flex items-center justify-center cursor-pointer text-4xl opacity-20 hover:opacity-100 transition-opacity">＋<input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleAdd(e.target.files[0])} /></label>}
      </div>
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
    onPost({description: text, image_url: url || 'NODE'});
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
          <button onClick={async ()=>{setLoading(true); await onRelease({description: JSON.stringify(boxItems.filter(i=>i!==null))});}} disabled={loading} className="px-10 py-4 bg-black text-white text-[10px] font-black uppercase rounded-full tracking-[0.2em] shadow-xl active:scale-95 transition-all">{loading ? '...' : 'Release'}</button>
       </div>
    </div>
  );
}