'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KU_IMAGE_URL = 'https://pfxwhcgdbavycddapqmz.supabase.co/storage/v1/object/public/images/ku.png';

export default function Room134_Final() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [viewingNode, setViewingNode] = useState<any | null>(null);
  const [creatorMode, setCreatorMode] = useState<'NONE' | 'MENU' | 'NODE' | 'TRACK' | 'BOX'>('NONE');
  const [pads, setPads] = useState<(any | null)[]>(Array(8).fill(null));
  const [trackData, setTrackData] = useState<any[]>([]);
  const [previewTrack, setPreviewTrack] = useState(false);
  
  // 🏛 アニメーション中のインデックスを管理
  const [animatingIdx, setAnimatingIdx] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('mainline').select('*');
    if (data) {
      setNodes(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
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
        .ku-animate { animation: ku-peek 0.8s ease-in-out forwards; }
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
                <div 
                  onClick={() => setAnimatingIdx(i)} 
                  className="bg-white relative cursor-pointer min-h-[80px] flex items-center justify-center"
                >
                  {isBox && <div className="absolute top-1 right-1 z-10 w-4 h-4 bg-[#c0c0c0] border border-black flex items-center justify-center text-[10px]">▢</div>}
                  
                  {thumb && !['NODE', 'TRACK_TYPE', 'BOX_TYPE'].includes(thumb) ? (
                    <img src={thumb} className="w-full h-auto grayscale-[40%] group-hover:grayscale-0 transition-all" />
                  ) : (
                    <div className="p-3 text-[11px] leading-relaxed break-words text-center">
                      {node.description}
                    </div>
                  )}

                  {isTrack && <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white text-4xl">▷</div>}

                  {/* 🏛 右下の小さなクー */}
                  <img src={KU_IMAGE_URL} className="absolute bottom-1 right-1 w-4 h-4 border border-black p-[1px] bg-[#c0c0c0] z-20" />
                  
                  {/* 🏛 飛び出すクー (Stateでクラスを切り替え) */}
                  <img 
                    src={KU_IMAGE_URL} 
                    className={`absolute inset-0 m-auto w-3/4 h-3/4 object-contain pointer-events-none z-50 opacity-0 ${animatingIdx === i ? 'ku-animate' : ''}`}
                    onAnimationEnd={() => {
                      setAnimatingIdx(null);
                      setViewingNode(node);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Viewer Window */}
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
                </div>
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
            <img src={KU_IMAGE_URL} className="absolute bottom-2 right-2 w-6 h-6 border border-black p-[1px] bg-[#c0c0c0] z-10" />
          </div>
        </div>
      )}

      {/* Footer Nav */}
      {!viewingNode && (
        <nav className="fixed bottom-0 left-0 w-full bg-[#c0c0c0] border-t-2 border-white p-1 flex items-center z-[4000] h-12">
          <button onClick={() => setCreatorMode(creatorMode === 'NONE' ? 'MENU' : 'NONE')} className="win-btn px-3 h-full flex items-center font-bold text-[12px] italic text-black">
            ◎ Room
          </button>
          <div className="ml-2 flex gap-1">
            {creatorMode === 'MENU' && (
              <>
                <button onClick={() => setCreatorMode('NODE')} className="win-btn px-4 h-8 text-[10px] font-bold text-black">NODE</button>
                <button onClick={() => setCreatorMode('TRACK')} className="win-btn px-4 h-8 text-[10px] font-bold text-black">TRACK</button>
              </>
            )}
          </div>
          <div className="win-btn px-2 h-full flex items-center text-[10px] font-mono bg-[#dfdfdf] ml-auto">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </nav>
      )}
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
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      {current?.image_url && <img key={idx} src={current.image_url} className="max-h-[70vh] object-contain" />}
    </div>
  );
}