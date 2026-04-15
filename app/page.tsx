'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// クーの画像URL (image_3.png)
const KU_IMAGE_URL = 'https://pfxwhcgdbavycddapqmz.supabase.co/storage/v1/object/public/images/ku.png';

export default function Room134_KuEdition() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [viewingNode, setViewingNode] = useState<any | null>(null);
  const [creatorMode, setCreatorMode] = useState<'NONE' | 'MENU' | 'NODE' | 'TRACK' | 'BOX'>('NONE');
  const [pads, setPads] = useState<(any | null)[]>(Array(8).fill(null));
  const [trackData, setTrackData] = useState<any[]>([]);
  const [previewTrack, setPreviewTrack] = useState(false);

  const kuImageRefs = useRef<any[]>([]);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('mainline').select('*');
    if (data) {
      setNodes(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    const uniqueItems = contents.filter((v: any, i: number, a: any[]) => a.findIndex(t => t.image_url === v.image_url) === i);
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

  const startKuAnimation = (index: number, node: any) => {
    const target = kuImageRefs.current[index];
    if (target) {
      target.classList.add('ku-animate');
      setTimeout(() => {
        target.classList.remove('ku-animate');
        setViewingNode(node);
      }, 800);
    } else {
      setViewingNode(node);
    }
  };

  return (
    <div className="min-h-screen text-[#000] font-mono overflow-x-hidden relative selection:bg-[#000080] selection:text-white">
      <style dangerouslySetInnerHTML={{ __html: `
        body {
          background: linear-gradient(135deg, #1A1A4D 0%, #1A1A4D 10%, #fad0c4 20%, #ffd1ff 30%, #a1c4fd 40%, #c2e9fb 50%, #d4fc79 60%, #96e6a1 70%, #fff1eb 80%, #ace0f9 100%);
          background-attachment: fixed;
          background-size: cover;
        }
        .mosaic-wall { column-count: 2; column-gap: 0.5rem; } 
        @media (min-width: 768px) { .mosaic-wall { column-count: 4; column-gap: 0.75rem; } }
        
        .win-btn {
          background: #c0c0c0;
          border-top: 2px solid #fff;
          border-left: 2px solid #fff;
          border-right: 2px solid #808080;
          border-bottom: 2px solid #808080;
          box-shadow: inset 1px 1px 0px #dfdfdf;
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
        
        @keyframes ku-peek {
          0% { transform: translateY(100%) scale(0.5); opacity: 0; }
          30% { transform: translateY(0) scale(1.1); opacity: 1; }
          70% { transform: translateY(0) scale(1.1); opacity: 1; }
          100% { transform: translateY(100%) scale(0.5); opacity: 0; }
        }
        .ku-animate { animation: ku-peek 0.8s ease-in-out forwards; z-index: 100; }
      `}} />

      <header className="fixed top-0 left-0 w-full z-[3000] p-4">
        <div className="max-w-[140rem] mx-auto flex items-center justify-center gap-12 text-center drop-shadow-[2px_2px_0px_rgba(255,255,255,0.8)]">
          <h1 onClick={() => window.location.reload()} className="text-2xl dot-text italic text-orange-400 cursor-pointer">Room134</h1>
          <p className="text-sm dot-text text-white">◎upload</p>
        </div>
      </header>

      <main className={`p-2 pt-20 transition-all duration-700 ${creatorMode !== 'NONE' || viewingNode ? 'blur-sm scale-95 pointer-events-none' : 'opacity-100'}`}>
        <div className="mosaic-wall max-w-[140rem] mx-auto">
          {nodes.map((node, i) => {
            const isTrack = node.image_url === 'TRACK_TYPE';
            const isBox = node.image_url === 'BOX_TYPE';
            const contents = (isTrack || isBox) ? JSON.parse(node.description || '[]') : [];
            const thumb = (isTrack || isBox) ? contents[0]?.image_url : node.image_url;

            return (
              <div key={node.id} className="mb-2 break-inside-avoid relative win-btn p-[2px] overflow-hidden group">
                <div onClick={() => startKuAnimation(i, node)} className="bg-white relative cursor-pointer min-h-[80px] flex items-center justify-center">
                  {isBox && <div className="absolute top-1 right-1 z-10 w-4 h-4 bg-[#c0c0c0] border border-black flex items-center justify-center text-[10px]">▢</div>}
                  
                  {thumb && !['NODE', 'TRACK_TYPE', 'BOX_TYPE'].includes(thumb) ? (
                    <img src={thumb} className="w-full h-auto grayscale-[40%] group-hover:grayscale-0 transition-all" />
                  ) : (
                    <div className="p-3 text-[11px] leading-relaxed break-words text-center">
                      {node.description}
                    </div>
                  )}

                  {isTrack && <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white text-4xl">▷</div>}

                  {/* 右下の小さなクー */}
                  <img src={KU_IMAGE_URL} className="absolute bottom-1 right-1 w-4 h-4 border border-black p-[1px] bg-[#c0c0c0] z-20" />
                  
                  {/* 飛び出すクー */}
                  <img 
                    ref={el => (kuImageRefs.current[i] = el)} 
                    src={KU_IMAGE_URL} 
                    className="absolute inset-0 m-auto w-3/4 h-3/4 object-contain opacity-0 pointer-events-none" 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {viewingNode && (
        <div className="fixed inset-0 z-[5000] bg-[#808080]/80 flex items-center justify-center p-4">
          <div className="win-btn bg-[#c0c0c0] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative">
            <div className="bg-[#000080] text-white p-1 px-2 flex justify-between items-center text-[11px] font-bold">
              <span>VIEWER.EXE</span>
              <button onClick={() => setViewingNode(null)} className="win-btn px-2 text-black">×</button>
            </div>
            <div className="p-6 overflow-auto bg-white flex-grow flex flex-col items-center justify-center min-h-[300px]">
              {viewingNode.image_url === 'TRACK_TYPE' ? (
                <div className="w-full h-full flex flex-col items-center gap-4">
                  <TrackPlayer data={JSON.parse(viewingNode.description)} onComplete={() => setViewingNode(null)} />
                  <button onClick={() => handleRemix(viewingNode)} className="win-btn px-8 py-2 font-bold text-[10px] text-black italic">⇄ Remix</button>
                </div>
              ) : viewingNode.image_url === 'BOX_TYPE' ? (
                <BoxViewer node={viewingNode} onUpdate={(newC: any[]) => {
                    supabase.from('mainline').update({ description: JSON.stringify(newC) }).eq('id', viewingNode.id).then(() => {
                        setViewingNode((prev: any) => ({ ...prev, description: JSON.stringify(newC) }));
                        fetchData();
                    });
                }} />
              ) : (
                <div className="w-full h-full flex flex-col items-center gap-4">
                  {viewingNode.image_url !== 'NODE' ? (
                    <img src={viewingNode.image_url} className="max-h-[70vh] max-w-full win-btn p-1 border-inset" />
                  ) : (
                    <div className="p-10 text-xl italic text-center">{viewingNode.description}</div>
                  )}
                  <button onClick={() => autoAssignToPad(viewingNode)} className="win-btn px-10 py-2 font-bold text-[10px] text-black italic">↓ PAD</button>
                </div>
              )}
            </div>
            {/* ウィンドウ右下の小さなクー */}
            <img src={KU_IMAGE_URL} className="absolute bottom-2 right-2 w-6 h-6 border border-black p-[1px] bg-[#c0c0c0] z-10" />
          </div>
        </div>
      )}

      {/* Footer Nav */}
      {!viewingNode && (
        <nav className="fixed bottom-0 left-0 w-full bg-[#c0c0c0] border-t-2 border-white p-1 flex items-center z-[4000] h-12">
          <button onClick={() => setCreatorMode(creatorMode === 'NONE' ? 'MENU' : 'NONE')} className="win-btn px-3 h-full flex items-center gap-2 font-bold text-[12px] italic text-black transition-all hover:bg-[#d0d0d0]">
            ◎ Room
          </button>
          <div className="ml-2 flex-grow flex gap-1 items-center">
            {creatorMode === 'MENU' && (
              <>
                <button onClick={() => setCreatorMode('NODE')} className="win-btn px-4 h-8 text-[10px] font-bold text-black">NODE</button>
                <button onClick={() => setCreatorMode('TRACK')} className="win-btn px-4 h-8 text-[10px] font-bold text-black">TRACK</button>
                <button onClick={() => setCreatorMode('BOX')} className="win-btn px-4 h-8 text-[10px] font-bold text-black">Scraps</button>
              </>
            )}
          </div>
          <div className="win-btn px-2 h-full flex items-center text-[10px] font-mono bg-[#dfdfdf] ml-auto">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </nav>
      )}

      {/* Creator Modals */}
      {creatorMode === 'NODE' && <NodeCreator onPost={(p:any)=>handlePost('NODE', p)} onCancel={()=>setCreatorMode('NONE')} />}
      {creatorMode === 'BOX' && <BoxCreator onRelease={(p:any)=>handlePost('BOX_TYPE', p)} onCancel={()=>setCreatorMode('NONE')} />}
      {creatorMode === 'TRACK' && (
        <div className="fixed inset-0 z-[4500] bg-black/40 flex items-center justify-center p-4">
          <div className="win-btn p-4 w-full max-w-sm">
            <div className="bg-[#000080] text-white p-1 px-2 mb-4 flex justify-between items-center text-[11px] font-bold">
              <span>TRACK_SEQUENCER.EXE</span>
              <button onClick={() => setCreatorMode('NONE')} className="win-btn px-2 text-black">×</button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-6 bg-[#808080] p-2">
              {pads.map((p, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="aspect-square relative w-full win-btn bg-white overflow-hidden flex items-center justify-center cursor-pointer">
                    {!p ? (
                      <label className="w-full h-full flex items-center justify-center opacity-20 hover:opacity-100">＋<input type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadToPad(i, e.target.files[0])} /></label>
                    ) : (
                      <div onClick={() => setTrackData(prev => [...prev, p])} className="w-full h-full">
                        <img src={p.image_url} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <button onClick={() => clearPad(i)} className="text-[10px] win-btn px-1 h-4 leading-none">x</button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setPreviewTrack(true)} className="win-btn py-2 text-[10px] font-bold">PREVIEW</button>
                <button onClick={() => handlePost('TRACK_TYPE', {description: JSON.stringify(trackData)})} className="win-btn py-2 text-[10px] font-bold">RELEASE</button>
            </div>
          </div>
        </div>
      )}

      {previewTrack && (
        <div className="fixed inset-0 z-[6000] bg-black flex items-center justify-center">
           <TrackPlayer data={trackData} onComplete={() => setPreviewTrack(false)} />
        </div>
      )}
    </div>
  );
}

// サブコンポーネント
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
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      {current?.image_url && <img key={idx} src={current.image_url} className="max-h-[70vh] object-contain animate-in fade-in" />}
    </div>
  );
}

function BoxViewer({node, onUpdate}: any) {
  const data = JSON.parse(node.description || '[]');
  const handleAdd = async (f: File) => {
    const fileName = `${Date.now()}-${f.name}`;
    await supabase.storage.from('images').upload(fileName, f);
    const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    onUpdate([...data, { id: Date.now(), image_url: url }]);
  };
  return (
    <div className="w-full h-full flex items-center overflow-x-auto p-4 space-x-4 no-scrollbar">
      {data.map((item: any, i: number) => (
        <div key={i} className="flex-shrink-0 win-btn p-1 bg-white relative">
          <img src={item.image_url} className="h-[60vh] object-contain" />
          <img src={KU_IMAGE_URL} className="absolute bottom-1 right-1 w-4 h-4 border border-black p-[1px] bg-[#c0c0c0]" />
        </div>
      ))}
      <label className="flex-shrink-0 h-[60vh] aspect-[3/4] win-btn bg-[#d0d0d0] flex items-center justify-center text-5xl opacity-30 cursor-pointer relative">
        ＋
        <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleAdd(e.target.files[0])} />
        <img src={KU_IMAGE_URL} className="absolute bottom-1 right-1 w-4 h-4 border border-black p-[1px] bg-[#c0c0c0]" />
      </label>
    </div>
  );
}

function NodeCreator({onPost, onCancel}: any) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
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
    <div className="fixed inset-0 z-[4500] bg-[#808080]/80 flex items-center justify-center p-4">
      <div className="win-btn p-4 w-full max-w-xl relative">
        <div className="bg-[#000080] text-white p-1 px-2 mb-4 flex justify-between items-center text-[11px] font-bold">
          <span>NEW_NODE.EXE</span>
          <button onClick={onCancel} className="win-btn px-2 text-black">×</button>
        </div>
        <textarea autoFocus value={text} onChange={e=>setText(e.target.value)} className="w-full h-40 win-btn bg-white p-4 outline-none italic mb-4" />
        <div className="flex justify-between items-center">
            <label className="win-btn px-4 py-1 text-[10px] font-bold cursor-pointer text-black">UPLOAD IMG<input type="file" className="hidden" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
            <button onClick={handlePost} className="win-btn px-8 py-2 font-bold text-[10px] text-black">POST</button>
        </div>
        <img src={KU_IMAGE_URL} className="absolute bottom-2 right-2 w-6 h-6 border border-black p-[1px] bg-[#c0c0c0]" />
      </div>
    </div>
  );
}

function BoxCreator({onRelease, onCancel}: any) {
  const [boxItems, setBoxItems] = useState<(any|null)[]>(Array(12).fill(null));
  const handleFile = async (i: number, f: File) => {
    const fileName = `${Date.now()}-${f.name}`;
    await supabase.storage.from('images').upload(fileName, f);
    const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    const next = [...boxItems];
    next[i] = {id: Date.now()+i, image_url: url};
    setBoxItems(next);
  };
  return (
    <div className="fixed inset-0 z-[4500] bg-[#808080]/80 flex items-center justify-center p-4">
      <div className="win-btn p-4 w-full max-w-4xl relative">
        <div className="bg-[#000080] text-white p-1 px-2 mb-4 flex justify-between items-center text-[11px] font-bold">
          <span>SCRAP_PACKER.EXE</span>
          <button onClick={onCancel} className="win-btn px-2 text-black">×</button>
        </div>
        <div className="grid grid-cols-6 gap-2 mb-6 h-60 overflow-y-auto p-2 bg-[#808080]">
          {boxItems.map((item, i) => (
            <div key={i} className="aspect-[3/4] win-btn bg-white overflow-hidden flex items-center justify-center relative">
              {item ? <img src={item.image_url} className="w-full h-full object-cover" /> : <label className="w-full h-full flex items-center justify-center opacity-10 cursor-pointer">＋<input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFile(i, e.target.files[0])} /></label>}
              <img src={KU_IMAGE_URL} className="absolute bottom-1 right-1 w-4 h-4 border border-black p-[1px] bg-[#c0c0c0]" />
            </div>
          ))}
        </div>
        <button onClick={()=>onRelease({description: JSON.stringify(boxItems.filter(i=>i!==null))})} className="win-btn w-full py-4 font-bold text-[10px] text-black">RELEASE AS SCRAPS</button>
        <img src={KU_IMAGE_URL} className="absolute bottom-2 right-2 w-6 h-6 border border-black p-[1px] bg-[#c0c0c0]" />
      </div>
    </div>
  );
}