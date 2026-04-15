'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Room134_90s() {
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

  const uploadToPad = async (index: number, file: File) => {
    const fileName = `${Date.now()}-${file.name}`;
    await supabase.storage.from('images').upload(fileName, file);
    const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    const newPads = [...pads];
    newPads[index] = { id: Date.now(), image_url: url };
    setPads(newPads);
  };

  return (
    <div className="min-h-screen text-[#000] font-mono overflow-x-hidden relative">
      <style jsx global>{`
        /* 90s Rainbow & Navy Background */
        body {
          background: linear-gradient(135deg, #1A1A4D 0%, #1A1A4D 25%, #ff9a9e 40%, #fad0c4 50%, #a1c4fd 70%, #ace0f9 100%);
          background-attachment: fixed;
          background-size: cover;
        }
        
        /* Win98 Button UI */
        .win-btn {
          background: #c0c0c0;
          border-top: 2px solid #fff;
          border-left: 2px solid #fff;
          border-right: 2px solid #808080;
          border-bottom: 2px solid #808080;
          box-shadow: inset 1px 1px 0px #dfdfdf;
          font-family: "MS UI Gothic", "Meiryo", sans-serif;
          color: black;
          cursor: pointer;
        }
        .win-btn:active {
          border-top: 2px solid #808080;
          border-left: 2px solid #808080;
          border-right: 2px solid #fff;
          border-bottom: 2px solid #fff;
          padding-top: 2px;
          padding-left: 2px;
        }
        .dot-text { font-family: 'Courier New', Courier, monospace; letter-spacing: -1px; font-weight: bold; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .mosaic-wall { column-count: 2; column-gap: 0.5rem; } 
        @media (min-width: 768px) { .mosaic-wall { column-count: 4; column-gap: 0.75rem; } }
      `}</style>

      {/* Header: 固定位置。Room134(オレンジ) & ◎upload(白) */}
      <header className={`fixed top-0 left-0 w-full z-[3000] p-4 flex items-center justify-center gap-10 transition-opacity duration-500 ${viewingNode ? 'opacity-0' : 'opacity-100'}`}>
        <h1 onClick={() => window.location.reload()} className="text-2xl dot-text italic text-orange-500 cursor-pointer drop-shadow-md">Room134</h1>
        <div className="text-sm dot-text text-white">◎ upload</div>
      </header>

      <main className={`p-2 pt-20 transition-all duration-700 ${creatorMode !== 'NONE' || viewingNode ? 'blur-sm scale-95 pointer-events-none' : 'opacity-100'}`}>
        <div className="mosaic-wall max-w-[140rem] mx-auto">
          {nodes.map(node => {
            const isTrack = node.image_url === 'TRACK_TYPE';
            const isBox = node.image_url === 'BOX_TYPE';
            const contents = (isTrack || isBox) ? JSON.parse(node.description || '[]') : [];
            const thumb = (isTrack || isBox) ? contents[0]?.image_url : node.image_url;

            return (
              <div key={node.id} onClick={() => setViewingNode(node)} className="mb-2 break-inside-avoid relative win-btn p-[2px] group overflow-hidden bg-white">
                <div className="bg-white relative">
                  {isBox && <div className="absolute top-1 right-1 z-10 w-4 h-4 bg-[#c0c0c0] border border-black flex items-center justify-center text-[10px]">▢</div>}
                  {thumb && !['NODE', 'TRACK_TYPE', 'BOX_TYPE'].includes(thumb) ? (
                    <img src={thumb} className="w-full h-auto grayscale-[30%] group-hover:grayscale-0" alt="node" />
                  ) : (
                    <div className="p-3 flex items-center justify-center text-[11px] leading-relaxed text-center min-h-[80px]">{node.description}</div>
                  )}
                  {isTrack && <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white text-4xl">▷</div>}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Viewing Interface: 大きなグレーの四角いウィンドウ */}
      {viewingNode && (
        <div className="fixed inset-0 z-[5000] bg-black/60 flex items-center justify-center p-4">
          <div className="win-btn bg-[#c0c0c0] w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
            <div className="bg-[#000080] text-white p-1 px-2 flex justify-between items-center text-[11px] font-bold">
              <span>VIEWER.EXE</span>
              <button onClick={() => setViewingNode(null)} className="win-btn px-2 text-black transition-colors hover:bg-red-500 hover:text-white">×</button>
            </div>
            <div className="p-6 overflow-auto bg-[#808080] flex-grow flex items-center justify-center relative">
               <div className="bg-white p-1 win-btn max-h-full flex items-center justify-center overflow-hidden">
                {viewingNode.image_url === 'TRACK_TYPE' ? (
                    <TrackPlayer data={JSON.parse(viewingNode.description)} onComplete={() => setViewingNode(null)} />
                ) : viewingNode.image_url === 'BOX_TYPE' ? (
                    <BoxViewer node={viewingNode} onUpdate={() => fetchData()} />
                ) : (
                    <>
                    {viewingNode.image_url !== 'NODE' ? (
                        <img src={viewingNode.image_url} className="max-h-[70vh] object-contain" alt="preview" />
                    ) : (
                        <div className="p-10 text-xl italic text-black">{viewingNode.description}</div>
                    )}
                    </>
                )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer: 背景グレー、テキスト黒、四角いボタン */}
      {!viewingNode && (
        <nav className="fixed bottom-0 left-0 w-full bg-[#c0c0c0] border-t-2 border-white p-1 flex items-center z-[4000] h-12 shadow-[0_-2px_5px_rgba(0,0,0,0.2)]">
          <button onClick={() => setCreatorMode(creatorMode === 'NONE' ? 'MENU' : 'NONE')} className="win-btn px-4 h-full flex items-center gap-2 font-bold text-[12px] text-black italic">
            ◎ Room
          </button>
          
          <div className="ml-2 flex gap-1 h-full items-center">
            {creatorMode === 'MENU' && (
              <div className="flex gap-1 animate-in slide-in-from-left-2">
                <button onClick={() => setCreatorMode('NODE')} className="win-btn px-4 h-8 text-[10px] font-bold text-black">NODE</button>
                <button onClick={() => setCreatorMode('TRACK')} className="win-btn px-4 h-8 text-[10px] font-bold text-black">TRACK</button>
                <button onClick={() => setCreatorMode('BOX')} className="win-btn px-4 h-8 text-[10px] font-bold text-black">Scraps</button>
              </div>
            )}
          </div>

          <div className="win-btn px-3 h-full flex items-center text-[10px] font-mono bg-[#dfdfdf] ml-auto border-inset text-black">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </nav>
      )}

      {creatorMode === 'NODE' && <NodeCreator onPost={(p:any)=>handlePost('NODE', p)} onCancel={()=>setCreatorMode('NONE')} />}
      {creatorMode === 'TRACK' && <TrackSequencer onPost={(p:any)=>handlePost('TRACK_TYPE', p)} onCancel={()=>setCreatorMode('NONE')} pads={pads} setPads={setPads} />}
      {creatorMode === 'BOX' && <BoxCreator onRelease={(p:any)=>handlePost('BOX_TYPE', p)} onCancel={()=>setCreatorMode('NONE')} />}
    </div>
  );
}

/* --- サブコンポーネント (エラー回避修正済み) --- */

function NodeCreator({onPost, onCancel}: any) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<any>(null); // Type safety bypass for build
  const handlePost = async () => {
    let url = null;
    if(file) {
      const fileName = `${Date.now()}-${file.name}`;
      await supabase.storage.from('images').upload(fileName, file);
      url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    }
    onPost({description: text, image_url: url || 'NODE'});
  };
  return (
    <div className="fixed inset-0 z-[4500] bg-black/40 flex items-center justify-center p-4">
      <div className="win-btn p-4 w-full max-w-xl">
        <div className="bg-[#000080] text-white p-1 px-2 mb-4 flex justify-between items-center text-[11px] font-bold">
          <span>NEW_NODE.EXE</span>
          <button onClick={onCancel} className="win-btn px-2 text-black">×</button>
        </div>
        <textarea autoFocus value={text} onChange={e=>setText(e.target.value)} className="w-full h-40 win-btn bg-white p-4 outline-none italic mb-4 text-black border-inset" />
        <div className="flex justify-between items-center">
            <label className="win-btn px-4 py-1 text-[10px] font-bold cursor-pointer">UPLOAD IMG<input type="file" className="hidden" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
            <button onClick={handlePost} className="win-btn px-8 py-2 font-bold text-black">POST</button>
        </div>
        {/* エラー箇所修正: file?.name で安全にアクセス */}
        {file && <p className="text-[8px] text-gray-600 mt-2 italic break-all">>> {file?.name}</p>}
      </div>
    </div>
  );
}

function TrackSequencer({onPost, onCancel, pads, setPads}: any) {
  const [trackData, setTrackData] = useState<any[]>([]);
  const uploadToPad = async (index: number, f: File) => {
    const fileName = `${Date.now()}-${f.name}`;
    await supabase.storage.from('images').upload(fileName, f);
    const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    const newPads = [...pads];
    newPads[index] = { id: Date.now(), image_url: url };
    setPads(newPads);
  };
  return (
    <div className="fixed inset-0 z-[4500] bg-black/40 flex items-center justify-center p-4">
      <div className="win-btn p-4 w-full max-w-sm">
        <div className="bg-[#000080] text-white p-1 px-2 mb-4 flex justify-between items-center text-[11px] font-bold">
          <span>TRACK_GEN.EXE</span>
          <button onClick={onCancel} className="win-btn px-2 text-black">×</button>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4 bg-[#808080] p-2 border-inset">
          {pads.map((p: any, i: number) => (
            <div key={i} className="aspect-square win-btn bg-white relative overflow-hidden flex items-center justify-center">
              {!p ? (
                <label className="cursor-pointer text-xl opacity-20">＋<input type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadToPad(i, e.target.files[0])} /></label>
              ) : (
                <img src={p.image_url} onClick={()=>setTrackData(prev => [...prev, p])} className="w-full h-full object-cover cursor-pointer" alt="pad" />
              )}
            </div>
          ))}
        </div>
        <div className="bg-black text-[#0f0] p-2 text-[9px] mb-4 h-10 overflow-hidden font-mono">BUFF: {trackData.length}/32</div>
        <button onClick={()=>onPost({description: JSON.stringify(trackData)})} className="win-btn w-full py-2 font-bold text-black">RELEASE TRACK</button>
      </div>
    </div>
  );
}

function TrackPlayer({data, onComplete}: any) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if(!data || data.length === 0) return;
    const timer = setInterval(() => {
      setIdx(v => {
        if (v >= data.length - 1) { clearInterval(timer); setTimeout(onComplete, 800); return v; }
        return v + 1;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [data, onComplete]);
  const current = data[idx];
  return <div className="w-full h-full flex items-center justify-center bg-black">{current && <img src={current.image_url} className="max-h-full object-contain" alt="track" />}</div>;
}

function BoxViewer({node, onUpdate}: any) {
  const data = JSON.parse(node.description || '[]');
  return (
    <div className="flex overflow-x-auto gap-4 p-4 no-scrollbar items-center">
      {data.map((item: any, i: number) => (
        <img key={i} src={item.image_url} className="h-[60vh] win-btn p-1 flex-shrink-0" alt="box-item" />
      ))}
    </div>
  );
}

function BoxCreator({onRelease, onCancel}: any) {
  const [items, setItems] = useState<any[]>(Array(6).fill(null));
  const handleFile = async (i: number, f: File) => {
    const fileName = `${Date.now()}-${f.name}`;
    await supabase.storage.from('images').upload(fileName, f);
    const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    const next = [...items];
    next[i] = {id: Date.now(), image_url: url};
    setItems(next);
  };
  return (
    <div className="fixed inset-0 z-[4500] bg-black/40 flex items-center justify-center p-4">
      <div className="win-btn p-4 w-full max-w-xl">
        <div className="bg-[#000080] text-white p-1 px-2 mb-4 flex justify-between items-center text-[11px] font-bold">
          <span>SCRAP_PACK.EXE</span>
          <button onClick={onCancel} className="win-btn px-2 text-black">×</button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {items.map((it, i) => (
            <div key={i} className="aspect-square win-btn bg-white flex items-center justify-center overflow-hidden">
              {!it ? <label className="cursor-pointer text-2xl opacity-10">＋<input type="file" className="hidden" onChange={e=>e.target.files?.[0] && handleFile(i, e.target.files[0])} /></label> : <img src={it.image_url} className="w-full h-full object-cover" alt="scrap" />}
            </div>
          ))}
        </div>
        <button onClick={()=>onRelease({description: JSON.stringify(items.filter(x=>x))})} className="win-btn w-full py-2 font-bold text-black">PACK & RELEASE</button>
      </div>
    </div>
  );
}