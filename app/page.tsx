'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* --- 画像リサイズ用ヘルパー (最大240px & ジャギ感) --- */
const resizeImage = (file: File): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxSide = 240; 
        if (width > height) {
          if (width > maxSide) { height *= maxSide / width; width = maxSide; }
        } else {
          if (height > maxSide) { width *= maxSide / height; height = maxSide; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false; 
          ctx.drawImage(img, 0, 0, width, height);
        }
        canvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/jpeg', 0.7);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export default function Room134_PureKoo() {
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
    await supabase.from('mainline').insert([{ ...payload, image_url: type, created_at: new Date().toISOString(), koo_count: 0 }]);
    setCreatorMode('NONE');
    setTrackData([]);
    fetchData();
  };

  const handleKoo = async (node: any) => {
    const newCount = (node.koo_count || 0) + 1;
    await supabase.from('mainline').update({ koo_count: newCount }).eq('id', node.id);
    setNodes(prev => prev.map(n => n.id === node.id ? {...n, koo_count: newCount} : n));
    if(viewingNode?.id === node.id) setViewingNode({...viewingNode, koo_count: newCount});
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
    uniqueItems.slice(0, 8).forEach((item: any, idx: number) => { newPads[idx] = item; });
    setPads(newPads);
    setTrackData([]); 
    setCreatorMode('TRACK');
    setViewingNode(null);
  };

  const clearPad = (index: number) => {
    const newPads = [...pads];
    newPads[index] = null;
    setPads(newPads);
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col relative text-black font-mono bg-[#000080]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DotGothic16&display=swap');
        body { background-color: #000080; margin: 0; overflow: hidden; position: fixed; width: 100%; height: 100%; }
        .win-btn {
          background: #c0c0c0;
          border-top: 2px solid #fff; border-left: 2px solid #fff;
          border-right: 2px solid #808080; border-bottom: 2px solid #808080;
          box-shadow: inset 1px 1px 0px #dfdfdf;
          font-family: sans-serif; cursor: pointer;
          position: relative; /* KooFloat用 */
        }
        .win-btn:active {
          border-top: 2px solid #808080; border-left: 2px solid #808080;
          border-right: 2px solid #fff; border-bottom: 2px solid #fff;
          padding-top: 2px; padding-left: 2px;
        }
        .rough-dot-text { font-family: 'DotGothic16', sans-serif; text-shadow: 2px 2px 0px #000; }
        .frame-scroll::-webkit-scrollbar { width: 14px; }
        .frame-scroll::-webkit-scrollbar-track { background: #dfdfdf; }
        .frame-scroll::-webkit-scrollbar-thumb { background: #c0c0c0; border: 1px solid #808080; box-shadow: inset 1px 1px 0px #fff; }
        .mosaic-wall { column-count: 2; column-gap: 0.5rem; } 
        @media (min-width: 768px) { .mosaic-wall { column-count: 4; column-gap: 0.75rem; } }

        /* koo 浮かび上がるアニメーション */
        @keyframes kooFloat {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-40px) scale(1.5); opacity: 0; }
        }
        .koo-telepathy {
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          font-family: 'DotGothic16', sans-serif;
          font-weight: bold;
          color: #FF8C00;
          pointer-events: none;
          animation: kooFloat 0.8s ease-out forwards;
          white-space: nowrap;
        }
      `}</style>

      {/* Header */}
      <header className="h-[60px] md:h-[80px] w-full shrink-0 flex items-center justify-center z-[3000]">
        <h1 onClick={() => window.location.reload()} className="text-3xl md:text-5xl rough-dot-text text-[#FF8C00] cursor-pointer italic">Room134</h1>
      </header>

      {/* Main Grid */}
      <main className="flex-grow frame-scroll overflow-y-auto z-[1000] mx-2 md:mx-4 mb-2 bg-[#000080] p-2"
            style={{ border: '2px solid', borderColor: '#808080 #fff #fff #808080', boxShadow: 'inset 2px 2px 0px #000' }}>
        <div className={`transition-all duration-700 ${creatorMode !== 'NONE' || viewingNode ? 'blur-sm scale-95 pointer-events-none' : 'opacity-100'}`}>
          <div className="mosaic-wall max-w-[140rem] mx-auto pb-4">
            {nodes.map(node => {
              const isTrack = node.image_url === 'TRACK_TYPE';
              const isBox = node.image_url === 'BOX_TYPE';
              const contents = (isTrack || isBox) ? JSON.parse(node.description || '[]') : [];
              const thumb = (isTrack || isBox) ? contents[0]?.image_url : node.image_url;
              return (
                <div key={node.id} onClick={() => setViewingNode(node)} className="mb-2 break-inside-avoid relative win-btn p-[1px] overflow-hidden bg-white">
                  <div className="bg-white relative">
                    {isBox && <div className="absolute top-1 right-1 z-10 w-4 h-4 bg-[#c0c0c0] border border-black flex items-center justify-center text-[8px]">▢</div>}
                    {thumb && !['NODE', 'TRACK_TYPE', 'BOX_TYPE'].includes(thumb) ? (
                      <img src={thumb} className="w-full h-auto grayscale-[20%]" alt="node" loading="lazy" />
                    ) : (
                      <div className="p-3 flex items-center justify-center text-[10px] leading-tight text-center min-h-[60px]">{node.description}</div>
                    )}
                    {isTrack && <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white text-3xl opacity-30 italic">koo?</div>}
                    {/* 修正: 数のカウントは出さず、kooのみ表示 */}
                    {node.koo_count > 0 && (
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-yellow-400 text-black text-[9px] font-bold border border-black rough-dot-text text-shadow-none">koo</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer Nav */}
      <nav className="h-[50px] w-full shrink-0 bg-[#c0c0c0] border-t-2 border-white p-1 flex items-center z-[4000]">
        <button onClick={() => setCreatorMode(creatorMode === 'NONE' ? 'MENU' : 'NONE')} className="win-btn px-3 h-[38px] flex items-center gap-1 font-bold text-[11px] italic">◎ upload</button>
        <div className="ml-1 flex gap-1 h-full items-center">
          {creatorMode === 'MENU' && (
            <>
              <button onClick={() => setCreatorMode('NODE')} className="win-btn px-3 h-[32px] text-[9px] font-bold">NODE</button>
              <button onClick={() => setCreatorMode('TRACK')} className="win-btn px-3 h-[32px] text-[9px] font-bold">TRACK</button>
              <button onClick={() => setCreatorMode('BOX')} className="win-btn px-3 h-[32px] text-[9px] font-bold bg-[#dfdfdf]">SCRAPS</button>
            </>
          )}
        </div>
        <div className="win-btn px-2 h-[38px] flex items-center text-[9px] bg-[#dfdfdf] ml-auto border-inset shrink-0 italic">
          Planet-Pluke
        </div>
      </nav>

      {/* Viewer Interface */}
      {viewingNode && (
        <div className="fixed inset-0 z-[5000] bg-black/80 flex items-center justify-center p-2">
          <div className="win-btn bg-[#c0c0c0] w-full max-w-5xl h-[90dvh] flex flex-col shadow-2xl">
            <div className="bg-[#000080] text-white p-1 px-2 flex justify-between items-center text-[10px] font-bold shrink-0">
              {/* 修正: VIEWERのヘッダーからもカウントを撤廃 */}
              <span>VIEWER.EXE</span>
              <button onClick={() => setViewingNode(null)} className="win-btn px-2 text-black">×</button>
            </div>
            <div className="p-2 md:p-4 overflow-auto bg-[#808080] flex-grow flex items-center justify-center relative">
               <div className="bg-white p-1 win-btn max-h-full flex flex-col items-center justify-center overflow-hidden">
                {viewingNode.image_url === 'TRACK_TYPE' ? (
                    // 修正: 再生後は自動で閉じる仕様
                    <TrackPlayer data={JSON.parse(viewingNode.description)} onComplete={() => setViewingNode(null)} />
                ) : viewingNode.image_url === 'BOX_TYPE' ? (
                    <BoxViewer node={viewingNode} onUpdate={fetchData} />
                ) : (
                    <div className="flex flex-col items-center">
                      {viewingNode.image_url !== 'NODE' ? (
                          <img src={viewingNode.image_url} className="max-h-[60dvh] object-contain" alt="p" />
                      ) : (
                          <div className="p-10 text-xl italic text-black leading-relaxed">{viewingNode.description}</div>
                      )}
                    </div>
                )}
               </div>
               
               {/* 修正: koo! ボタンのアニメーション実装 */}
               <div className="absolute bottom-4 left-4 flex gap-2">
                 <KooButton onKoo={() => handleKoo(viewingNode)} />
                 <button onClick={() => autoAssignToPad(viewingNode)} className="win-btn px-3 py-3 text-[10px] font-bold">↓ PAD</button>
               </div>
               {viewingNode.image_url === 'TRACK_TYPE' && (
                 <button onClick={() => handleRemix(viewingNode)} className="absolute bottom-4 right-4 win-btn px-4 py-3 text-[10px] font-bold italic">REMIX</button>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Track Sequencer */}
      {creatorMode === 'TRACK' && (
        <div className="fixed inset-0 z-[4500] bg-black/60 flex items-center justify-center p-4">
          <div className="win-btn p-4 w-full max-w-md bg-[#c0c0c0]">
            <div className="bg-[#000080] text-white p-1 px-2 mb-4 flex justify-between items-center text-[11px] font-bold">
              <span>TRACK_SEQUENCER.EXE</span>
              <button onClick={() => setCreatorMode('NONE')} className="win-btn px-2 text-black">×</button>
            </div>
            
            <div className="flex justify-between items-center mb-2 px-1">
               <button onClick={() => setTrackData([])} className="win-btn px-2 py-1 text-[8px] font-bold">CLEAR REC</button>
               <div className="text-[10px] font-mono font-bold text-red-700 italic">● REC {trackData.length}/32</div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6 p-2 bg-[#808080] border-inset">
              {pads.map((p, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div onMouseDown={() => p && setTrackData(prev => prev.length < 32 ? [...prev, p] : prev)} className="aspect-square w-full win-btn bg-white relative overflow-hidden flex items-center justify-center active:bg-yellow-200">
                    {!p ? <label className="cursor-pointer text-xl opacity-20">＋<input type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadToPad(i, e.target.files[0], setPads, pads)} /></label> : <img src={p.image_url} className="w-full h-full object-cover pointer-events-none" />}
                  </div>
                  <button onClick={() => {const n=[...pads]; n[i]=null; setPads(n);}} className={`text-[8px] mt-1 ${!p && 'invisible'}`}>clr</button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPreviewTrack(true)} disabled={trackData.length === 0} className="win-btn py-3 text-[10px] font-bold italic">▶ PREVIEW</button>
              <button onClick={() => handlePost('TRACK_TYPE', {description: JSON.stringify(trackData)})} disabled={trackData.length === 0} className="win-btn py-3 text-[10px] font-bold bg-[#008000] text-white">RELEASE</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal: 再生後は閉じる */}
      {previewTrack && (
        <div className="fixed inset-0 z-[6000] bg-black flex flex-col items-center justify-center">
          <TrackPlayer data={trackData} onComplete={() => setPreviewTrack(false)} />
          <button onClick={() => setPreviewTrack(false)} className="win-btn mt-8 px-8 py-2 text-sm font-bold">STOP PREVIEW</button>
        </div>
      )}

      {creatorMode === 'NODE' && <NodeCreator onPost={(p:any)=>handlePost('NODE', p)} onCancel={()=>setCreatorMode('NONE')} />}
      {creatorMode === 'BOX' && <BoxCreator onRelease={(p:any)=>handlePost('BOX_TYPE', p)} onCancel={()=>setCreatorMode('NONE')} />}
    </div>
  );
}

/* --- Kooのアニメーションボタン --- */
function KooButton({onKoo}: {onKoo: () => void}) {
  const [showTelepathy, setShowTelepathy] = useState(false);
  const handlePress = () => {
    onKoo();
    setShowTelepathy(false); // 一旦リセット
    setTimeout(() => setShowTelepathy(true), 10); // 再描画でアニメーション発火
    setTimeout(() => setShowTelepathy(false), 800); // 終わったら消す
  };
  return (
    <button onClick={handlePress} className="win-btn px-6 py-3 text-sm font-black text-black bg-yellow-400 active:bg-yellow-600">
      koo!
      {showTelepathy && <span className="koo-telepathy">koo!</span>}
    </button>
  );
}

/* --- サポート機能 (修正済み仕様を維持) --- */
async function uploadToPad(index: number, file: File, setPads: any, pads: any[]) {
  const resized = await resizeImage(file);
  const fileName = `${Date.now()}-${file.name}`;
  await supabase.storage.from('images').upload(fileName, resized);
  const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
  const newPads = [...pads];
  newPads[index] = { id: Date.now(), image_url: url };
  setPads(newPads);
}

// 修正: onCompleteを確実に呼ぶ仕様
function TrackPlayer({data, onComplete}: any) {
  const [idx, setIdx] = useState(0);
  const dataRef = useRef(data);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    if(!dataRef.current || dataRef.current.length === 0) { 
        onCompleteRef.current?.();
        return; 
    }
    const timer = setInterval(() => {
      setIdx(v => {
        if (v >= dataRef.current.length - 1) { 
            clearInterval(timer); 
            // 最後の画像を表示した後、少し余韻を残して閉じる
            setTimeout(() => onCompleteRef.current?.(), 800); 
            return v; 
        }
        return v + 1;
      });
    }, 450); // 90sっぽいカクカク感
    return () => clearInterval(timer);
  }, []);
  return <div className="w-full h-full flex items-center justify-center">{data[idx] && <img src={data[idx].image_url} className="max-h-full object-contain" alt="koo" />}</div>;
}

function NodeCreator({onPost, onCancel}: any) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const handlePost = async () => {
    let url = null;
    if(file) {
      const resized = await resizeImage(file);
      const fileName = `${Date.now()}-${file.name}`;
      await supabase.storage.from('images').upload(fileName, resized);
      url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    }
    onPost({description: text, image_url: url || 'NODE'});
  };
  return (
    <div className="fixed inset-0 z-[4500] bg-black/60 flex items-center justify-center p-4">
      <div className="win-btn p-4 w-full max-w-xl">
        <div className="bg-[#000080] text-white p-1 px-2 mb-4 flex justify-between items-center text-[11px] font-bold"><span>NODE_ENTRY.EXE</span><button onClick={onCancel} className="win-btn px-2 text-black">×</button></div>
        <textarea autoFocus value={text} onChange={e=>setText(e.target.value)} className="w-full h-40 win-btn bg-white p-4 outline-none italic mb-4 text-black border-inset text-sm" placeholder="Tell something..." />
        <div className="flex justify-between items-center">
            <label className="win-btn px-3 py-1 text-[9px] font-bold cursor-pointer">IMG<input type="file" className="hidden" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
            <button onClick={handlePost} className="win-btn px-6 py-2 font-bold">POST</button>
        </div>
      </div>
    </div>
  );
}

function BoxCreator({onRelease, onCancel}: any) {
  const [items, setItems] = useState<any[]>(Array(6).fill(null));
  const handleFile = async (i: number, f: File) => {
    const resized = await resizeImage(f);
    const fileName = `${Date.now()}-${f.name}`;
    await supabase.storage.from('images').upload(fileName, resized);
    const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    const next = [...items];
    next[i] = {id: Date.now(), image_url: url};
    setItems(next);
  };
  return (
    <div className="fixed inset-0 z-[4500] bg-black/60 flex items-center justify-center p-4">
      <div className="win-btn p-4 w-full max-w-xl">
        <div className="bg-[#000080] text-white p-1 px-2 mb-4 flex justify-between items-center text-[11px] font-bold"><span>SCRAP_PACKER.EXE</span><button onClick={onCancel} className="win-btn px-2 text-black">×</button></div>
        <div className="grid grid-cols-3 gap-1 mb-4">
          {items.map((it, i) => (
            <div key={i} className="aspect-square win-btn bg-white flex items-center justify-center overflow-hidden">
              {!it ? <label className="cursor-pointer text-xl opacity-10">＋<input type="file" className="hidden" onChange={e=>e.target.files?.[0] && handleFile(i, e.target.files[0])} /></label> : <img src={it.image_url} className="w-full h-full object-cover" />}
            </div>
          ))}
        </div>
        <button onClick={()=>onRelease({description: JSON.stringify(items.filter(x=>x))})} className="win-btn w-full py-2 font-bold">RELEASE PACK</button>
      </div>
    </div>
  );
}

function BoxViewer({node, onUpdate}: any) {
  const data = JSON.parse(node.description || '[]');
  const handleAdd = async (f: File) => {
    const resized = await resizeImage(f);
    const fileName = `${Date.now()}-${f.name}`;
    await supabase.storage.from('images').upload(fileName, resized);
    const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    await supabase.from('mainline').update({ description: JSON.stringify([...data, { id: Date.now(), image_url: url }]) }).eq('id', node.id);
    onUpdate();
  };
  return (
    <div className="flex overflow-x-auto gap-4 p-4 items-center">
      {data.map((item: any, i: number) => (
        <img key={i} src={item.image_url} className="h-[50dvh] win-btn p-1 flex-shrink-0" alt="box" />
      ))}
      <div className="h-[50dvh] aspect-[3/4] win-btn bg-[#dfdfdf] flex items-center justify-center flex-shrink-0">
        <label className="cursor-pointer text-3xl opacity-30 hover:opacity-100">＋<input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleAdd(e.target.files[0])} /></label>
      </div>
    </div>
  );
}