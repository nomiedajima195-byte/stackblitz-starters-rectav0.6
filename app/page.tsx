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

  const clearPad = (index: number) => {
    const newPads = [...pads];
    newPads[index] = null;
    setPads(newPads);
  };

  return (
    <div className="min-h-screen text-[#000] font-mono overflow-x-hidden selection:bg-[#000080] selection:text-white relative">
      <style jsx global>{`
        /* 90s Rainbow Background with Noise */
        body {
          background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 10%, #fad0c4 20%, #ffd1ff 30%, #a1c4fd 40%, #c2e9fb 50%, #d4fc79 60%, #96e6a1 70%, #fff1eb 80%, #ace0f9 100%);
          background-attachment: fixed;
        }
        .mosaic-wall { column-count: 2; column-gap: 0.5rem; } 
        @media (min-width: 768px) { .mosaic-wall { column-count: 4; column-gap: 0.75rem; } }
        
        /* Win98 Button Style */
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
        .win-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Dot Font Style */
        .dot-text {
          font-family: 'Courier New', Courier, monospace;
          letter-spacing: -1px;
          font-weight: bold;
          image-rendering: pixelated;
        }
      `}</style>

      {/* Header: Dot感あるRoom134 */}
      <header className={`fixed top-0 left-0 w-full z-[3000] p-4 transition-opacity duration-500 ${viewingNode ? 'opacity-0' : 'opacity-100'}`}>
        <h1 onClick={() => window.location.reload()} className="text-2xl dot-text italic text-black/80 drop-shadow-[2px_2px_0px_rgba(255,255,255,0.8)] text-center cursor-pointer">
          Room134
        </h1>
      </header>

      <main className={`p-2 pt-16 transition-all duration-700 ${creatorMode !== 'NONE' || viewingNode ? 'blur-sm scale-95 pointer-events-none' : 'opacity-100'}`}>
        <div className="mosaic-wall max-w-[140rem] mx-auto">
          {nodes.map(node => {
            const isTrack = node.image_url === 'TRACK_TYPE';
            const isBox = node.image_url === 'BOX_TYPE';
            const contents = (isTrack || isBox) ? JSON.parse(node.description || '[]') : [];
            const thumb = (isTrack || isBox) ? contents[0]?.image_url : node.image_url;

            return (
              <div key={node.id} onClick={() => setViewingNode(node)} className="mb-2 break-inside-avoid relative win-btn p-[2px] overflow-hidden group">
                <div className="bg-white">
                  {isBox && <div className="absolute top-1 right-1 z-10 w-4 h-4 bg-[#c0c0c0] border border-black flex items-center justify-center text-[10px]">▢</div>}
                  {thumb && !['NODE', 'TRACK_TYPE', 'BOX_TYPE'].includes(thumb) ? (
                    <img src={thumb} className="w-full h-auto grayscale-[40%] group-hover:grayscale-0 transition-all duration-300" />
                  ) : (
                    <div className="p-3 flex items-center justify-center text-[11px] leading-relaxed break-words text-center min-h-[80px]">
                      {isTrack || isBox ? contents[0]?.description || node.description : node.description}
                    </div>
                  )}
                  {isTrack && <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white drop-shadow-md text-4xl">▶</div>}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Creator Interface: Track Mode */}
      {creatorMode === 'TRACK' && (
        <div className="fixed inset-0 z-[4500] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="win-btn p-4 w-full max-w-sm">
            <div className="bg-[#000080] text-white p-1 px-2 mb-4 flex justify-between items-center text-[11px] font-bold">
              <span>TRACK_SEQUENCER.EXE</span>
              <button onClick={() => setCreatorMode('NONE')} className="win-btn px-2 text-black">×</button>
            </div>
            
            <div className="grid grid-cols-4 gap-2 mb-6 bg-[#808080] p-2">
              {pads.map((p, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  {i < 4 && <button onClick={() => clearPad(i)} className="text-[10px] win-btn px-1 h-4 leading-none">x</button>}
                  <div className="aspect-square relative w-full win-btn bg-white overflow-hidden flex items-center justify-center">
                    {!p ? (
                      <label className="cursor-pointer text-xl opacity-20">＋<input type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadToPad(i, e.target.files[0])} /></label>
                    ) : (
                      <div onClick={() => setTrackData(prev => [...prev, p])} className="w-full h-full">
                        {p.image_url && !['NODE'].includes(p.image_url) ? <img src={p.image_url} className="w-full h-full object-cover" /> : <span className="text-[8px] p-1 block italic">{p.description?.substring(0,10)}</span>}
                      </div>
                    )}
                  </div>
                  {i >= 4 && <button onClick={() => clearPad(i)} className="text-[10px] win-btn px-1 h-4 leading-none">x</button>}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <div className="bg-black text-[#0f0] p-2 text-[10px] font-mono h-8 overflow-hidden mb-2">
                REC_BUFF: {trackData.length}/32 {trackData.length > 0 && '>> PROCESSING...'}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setPreviewTrack(true)} className="win-btn py-2 text-[10px] font-bold">PREVIEW</button>
                <button onClick={() => handlePost('TRACK_TYPE', {description: JSON.stringify(trackData)})} className="win-btn py-2 text-[10px] font-bold">RELEASE</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer: Win98 Like Navigation */}
      {!viewingNode && (
        <nav className="fixed bottom-0 left-0 w-full bg-[#c0c0c0] border-t-2 border-white p-1 flex items-center z-[4000] h-12">
          <button onClick={() => setCreatorMode(creatorMode === 'NONE' ? 'MENU' : 'NONE')} className="win-btn px-3 h-full flex items-center gap-2 font-bold text-[12px] italic">
            <span className="text-lg">◎</span> Room
          </button>
          
          <div className="ml-2 flex-grow flex gap-1 overflow-x-auto no-scrollbar h-full items-center">
            {creatorMode === 'MENU' && (
              <div className="flex gap-1 animate-in slide-in-from-left-4">
                <button onClick={() => setCreatorMode('NODE')} className="win-btn px-4 h-8 text-[10px] font-bold">NODE</button>
                <button onClick={() => setCreatorMode('TRACK')} className="win-btn px-4 h-8 text-[10px] font-bold">TRACK</button>
                <button onClick={() => setCreatorMode('BOX')} className="win-btn px-4 h-8 text-[10px] font-bold">SCRAPS</button>
              </div>
            )}
          </div>

          <div className="win-btn px-2 h-full flex items-center text-[10px] font-mono bg-[#dfdfdf] ml-auto border-inset">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </nav>
      )}

      {/* --- Rest of the components (ViewingNode, NodeCreator, etc.) maintain 90s style logic --- */}
      {viewingNode && (
        <div className="fixed inset-0 z-[5000] bg-[#808080]/80 flex items-center justify-center p-4">
          <div className="win-btn bg-[#c0c0c0] w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="bg-[#000080] text-white p-1 px-2 flex justify-between items-center text-[11px] font-bold">
              <span>VIEWER.EXE - {viewingNode.image_url}</span>
              <button onClick={() => setViewingNode(null)} className="win-btn px-2 text-black">×</button>
            </div>
            <div className="p-6 overflow-auto bg-white flex-grow flex flex-col items-center justify-center min-h-[300px]">
              {/* Content logic remains same as previous version but wrapped in 90s UI */}
              {viewingNode.image_url === 'TRACK_TYPE' ? (
                <TrackPlayer data={JSON.parse(viewingNode.description)} onComplete={() => setViewingNode(null)} />
              ) : viewingNode.image_url === 'BOX_TYPE' ? (
                <BoxViewer node={viewingNode} onUpdate={() => {}} /> 
              ) : (
                <>
                  {viewingNode.image_url !== 'NODE' ? <img src={viewingNode.image_url} className="max-h-[60vh] border-2 border-black" /> : <div className="text-xl italic">{viewingNode.description}</div>}
                </>
              )}
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

// 既存のコンポーネントも、適宜win-btnなどで装飾して利用
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
    <div className="flex flex-col items-center">
      <div className="win-btn p-1 bg-white">
        {current?.image_url && !['NODE'].includes(current.image_url) ? (
          <img key={idx} src={current.image_url} className="max-h-[70vh] object-contain" />
        ) : (
          <div className="p-20 text-xl italic">{current?.description}</div>
        )}
      </div>
    </div>
  );
}

// BoxViewer, NodeCreator, BoxCreator も同様に win-btn / Win98 スタイルでラップして実装...  