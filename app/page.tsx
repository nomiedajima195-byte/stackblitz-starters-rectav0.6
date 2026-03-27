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
  
  // パッドの状態を親で管理することで、Viewerからのアサインを可能にする
  const [pads, setPads] = useState<(any | null)[]>(Array(8).fill(null));
  const [trackData, setTrackData] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('mainline').select('*');
    if (data) setNodes(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePost = async (type: string, payload: any) => {
    await supabase.from('mainline').insert([{ ...payload, image_url: type, created_at: new Date().toISOString() }]);
    setCreatorMode('NONE');
    setTrackData([]);
    // 投稿後はパッドをクリアしない（連続作成のため）
    fetchData();
  };

  // 素材をパッドにアサインする関数
  const assignToPad = (index: number, node: any) => {
    const newPads = [...pads];
    newPads[index] = { id: node.id, image_url: node.image_url };
    setPads(newPads);
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif overflow-x-hidden selection:bg-black selection:text-white">
      <style jsx global>{`
        .mosaic-wall { column-count: 2; column-gap: 0.5rem; } 
        @media (min-width: 768px) { .mosaic-wall { column-count: 4; column-gap: 0.75rem; } }
        @media (min-width: 1200px) { .mosaic-wall { column-count: 6; column-gap: 0.75rem; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* HEADER */}
      <header className={`fixed top-0 left-0 w-full z-[3000] p-6 transition-opacity duration-500 ${creatorMode !== 'NONE' || viewingNode ? 'opacity-0' : 'opacity-100'}`}>
        <h1 onClick={() => window.location.reload()} className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30 text-center cursor-pointer">Room134</h1>
      </header>

      {/* MAIN WALL */}
      <main className={`p-2 pt-20 transition-all duration-700 ${creatorMode !== 'NONE' || viewingNode ? 'opacity-10 blur-xl scale-95 pointer-events-none' : 'opacity-100'}`}>
        <div className="mosaic-wall max-w-[140rem] mx-auto">
          {nodes.map(node => {
            const isTrack = node.image_url === 'TRACK_TYPE';
            const isBox = node.image_url === 'BOX_TYPE';
            const contents = (isTrack || isBox) ? JSON.parse(node.description || '[]') : [];
            const thumb = (isTrack || isBox) ? contents[0]?.image_url : node.image_url;

            return (
              <div key={node.id} onClick={() => setViewingNode(node)} className="mb-2 break-inside-avoid relative group cursor-pointer active:scale-[0.98] transition-transform">
                <div className="relative z-0 rounded-sm overflow-hidden bg-[#F0EEE4] border border-black/10 shadow-sm">
                  {thumb ? <img src={thumb} className="w-full h-auto grayscale-[20%]" /> : <div className="p-4 min-h-[100px] flex items-center justify-center text-[10px] italic opacity-40">Text Node</div>}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* VIEWER LAYER (Pick to Pad機能追加) */}
      {viewingNode && (
        <div className="fixed inset-0 z-[5000] bg-[#EBE8DB]/95 backdrop-blur-md flex flex-col animate-in fade-in duration-500">
          <div className="flex-grow flex flex-col items-center justify-center overflow-hidden p-6">
            <div className="max-w-4xl w-full text-center">
              {viewingNode.image_url && !['TRACK_TYPE', 'BOX_TYPE'].includes(viewingNode.image_url) ? (
                <>
                  <img src={viewingNode.image_url} className="max-h-[70vh] mx-auto object-contain shadow-2xl rounded-sm mb-8" />
                  {/* アサイン用ツールバー */}
                  <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Assign to Pad</p>
                    <div className="flex gap-2">
                      {pads.map((p, i) => (
                        <button 
                          key={i} 
                          onClick={(e) => { e.stopPropagation(); assignToPad(i, viewingNode); }}
                          className={`w-10 h-10 rounded-full border text-[10px] font-black transition-all ${pads[i]?.image_url === viewingNode.image_url ? 'bg-black text-white border-black shadow-lg scale-110' : 'border-black/10 hover:border-black/40'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xl italic opacity-50">{viewingNode.description}</p>
              )}
            </div>
          </div>
          <div className="h-24 flex items-center justify-center">
            <button onClick={() => setViewingNode(null)} className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center text-2xl shadow-xl active:scale-90 transition-all border border-white/10">◎</button>
          </div>
        </div>
      )}

      {/* MENU ◎ */}
      {!viewingNode && (
        <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[4000] flex flex-col items-center">
          {creatorMode === 'NONE' ? (
            <button onClick={() => setCreatorMode('MENU')} className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-3xl shadow-2xl active:scale-90 transition-all">◎</button>
          ) : (
            <div className="flex space-x-4 bg-white/90 backdrop-blur-2xl p-3 rounded-full shadow-2xl border border-black/5 animate-in slide-in-from-bottom-10">
              <button onClick={() => setCreatorMode('NODE')} className="px-6 py-3 bg-black text-white text-[9px] font-black uppercase rounded-full">Node</button>
              <button onClick={() => setCreatorMode('TRACK')} className="px-6 py-3 bg-black text-white text-[9px] font-black uppercase rounded-full">Track</button>
              <button onClick={() => setCreatorMode('BOX')} className="px-6 py-3 bg-[#EBE8DB] text-black text-[9px] font-black uppercase rounded-full border border-black/5">Box</button>
              <button onClick={() => setCreatorMode('NONE')} className="px-4 py-3 text-[9px] font-black uppercase opacity-20">✕</button>
            </div>
          )}
        </nav>
      )}

      {/* TRACK CREATOR (透過・親の状態を使用) */}
      {creatorMode === 'TRACK' && (
        <div className="fixed inset-0 z-[4500] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white/90 w-full max-w-xs p-8 rounded-[3.5rem] shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-8">
              <button 
                onClick={() => setTrackData(prev => prev.length > 0 ? [] : prev)} 
                className={`text-[9px] font-black uppercase px-5 py-2.5 rounded-full transition-all bg-black text-white`}
              >
                Clear Rec
              </button>
              <div className="text-[10px] font-black opacity-40 tabular-nums">{trackData.length}/32</div>
            </div>
            
            <div className="grid grid-cols-4 gap-3 mb-10">
              {pads.map((p, i) => (
                <div 
                  key={i} 
                  onMouseDown={() => p && setTrackData(prev => [...prev, p])}
                  className={`aspect-square rounded-2xl border transition-all flex items-center justify-center relative overflow-hidden active:scale-90 cursor-pointer ${p ? 'bg-white border-black/10 shadow-md' : 'bg-black/5 border-dashed border-black/10'}`}
                >
                  {p?.image_url ? (
                    <img src={p.image_url} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[8px] opacity-20">Empty</span>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => handlePost('TRACK_TYPE', {description: JSON.stringify(trackData)})} className="w-full py-4 bg-black text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-2xl mb-2 shadow-xl">Release Track</button>
            <button onClick={() => setCreatorMode('NONE')} className="w-full py-2 text-[8px] font-black uppercase opacity-20">Cancel</button>
          </div>
        </div>
      )}

      {/* (NodeCreator, BoxCreator, etc. は前回のロジックを継承) */}
    </div>
  );
}