'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Room134_VisualOnly() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [viewingNode, setViewingNode] = useState<any | null>(null);
  const [creatorMode, setCreatorMode] = useState<'NONE' | 'MENU' | 'TRACK' | 'BOX'>('NONE');
  const [pads, setPads] = useState<(any | null)[]>(Array(8).fill(null));
  const [trackData, setTrackData] = useState<any[]>([]);
  const [previewTrack, setPreviewTrack] = useState(false);

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

  const uploadToPad = async (index: number, file: File) => {
    const fileName = `${Date.now()}-${file.name}`;
    await supabase.storage.from('images').upload(fileName, file);
    const url = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    const newPads = [...pads];
    newPads[index] = { id: Date.now(), image_url: url };
    setPads(newPads);
  };

  // --- フィルタリングロジック ---
  const visualNodes = nodes.filter(node => {
    const isTrack = node.image_url === 'TRACK_TYPE';
    const isBox = node.image_url === 'BOX_TYPE';

    // 1. テキスト投稿そのものを除外
    if (node.image_url === 'NODE') return false;

    // 2. トラックまたはBOXの場合のチェック
    if (isTrack || isBox) {
      try {
        const contents = JSON.parse(node.description || '[]');
        const firstItem = contents[0];
        // 1枚目が存在しない、または1枚目が画像URLを持っていない（'NODE'等）なら除外
        if (!firstItem || !firstItem.image_url || firstItem.image_url === 'NODE') {
          return false;
        }
      } catch (e) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#23395d] text-[#e0e6ed] overflow-x-hidden relative selection:bg-orange-500">
      <link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap" rel="stylesheet" />
      
      <style dangerouslySetInnerHTML={{ __html: `
        .pixel-font { font-family: 'DotGothic16', sans-serif; }
        .mosaic-wall { column-count: 2; column-gap: 0.5rem; } 
        @media (min-width: 768px) { .mosaic-wall { column-count: 4; column-gap: 0.75rem; } }
        
        .win-btn {
          background: #2c3e50;
          border-top: 2px solid #5d6d7e;
          border-left: 2px solid #5d6d7e;
          border-right: 2px solid #1a252f;
          border-bottom: 2px solid #1a252f;
        }
        .win-btn:active {
          border-top: 2px solid #1a252f;
          border-left: 2px solid #1a252f;
          border-right: 2px solid #5d6d7e;
          border-bottom: 2px solid #5d6d7e;
          padding-top: 1px; padding-left: 1px;
        }
      `}} />

      <header className="fixed top-0 left-0 w-full z-[3000] p-6 text-center">
        <h1 
          onClick={() => window.location.reload()} 
          className="pixel-font text-3xl italic text-[#ff8c00] cursor-pointer drop-shadow-[0_2px_0px_rgba(0,0,0,0.8)] active:scale-95 transition-transform"
        >
          Room134
        </h1>
      </header>

      <main className={`p-2 pt-24 transition-all duration-500 ${creatorMode !== 'NONE' || viewingNode ? 'blur-md opacity-20 scale-95 pointer-events-none' : 'opacity-100'}`}>
        <div className="mosaic-wall max-w-[140rem] mx-auto">
          {visualNodes.map((node) => {
            const isTrack = node.image_url === 'TRACK_TYPE';
            const isBox = node.image_url === 'BOX_TYPE';
            const contents = JSON.parse(node.description || '[]');
            const thumb = (isTrack || isBox) ? contents[0]?.image_url : node.image_url;

            return (
              <div key={node.id} className="mb-2 break-inside-avoid relative win-btn p-[1px] overflow-hidden group">
                <div 
                  onClick={() => setViewingNode(node)} 
                  className="bg-[#1a252f] relative cursor-pointer min-h-[40px] flex items-center justify-center overflow-hidden"
                >
                  {isBox && <div className="absolute top-1 right-1 z-10 px-1 bg-orange-500 text-[#1a252f] text-[9px] pixel-font">BOX</div>}
                  <img src={thumb} className="w-full h-auto opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
                  {isTrack && <div className="absolute inset-0 flex items-center justify-center bg-orange-500/10 text-orange-500/80 text-xl pixel-font opacity-0 group-hover:opacity-100 transition-all">▷ PLAY</div>}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Viewer */}
      {viewingNode && (
        <div className="fixed inset-0 z-[5000] bg-[#23395d]/98 flex items-center justify-center p-4">
          <div className="win-btn bg-[#2c3e50] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-[#5d6d7e] text-white p-2 px-3 flex justify-between items-center text-[12px] pixel-font">
              <span>Rubbish</span>
              <button onClick={() => setViewingNode(null)} className="win-btn px-4 text-[#ff8c00]">X</button>
            </div>
            <div className="p-4 overflow-auto bg-[#1a252f] flex-grow flex flex-col items-center justify-center min-h-[300px]">
              {viewingNode.image_url === 'TRACK_TYPE' ? (
                <TrackPlayer data={JSON.parse(viewingNode.description)} onComplete={() => setViewingNode(null)} />
              ) : viewingNode.image_url === 'BOX_TYPE' ? (
                <BoxViewer node={viewingNode} />
              ) : (
                <img src={viewingNode.image_url} className="max-h-[75vh] max-w-full border border-[#5d6d7e]" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Nav */}
      {!viewingNode && (
        <nav className="fixed bottom-0 left-0 w-full bg-[#1a252f] border-t border-[#5d6d7e] p-2 flex items-center z-[4000] h-14">
          <button onClick={() => setCreatorMode(creatorMode === 'NONE' ? 'MENU' : 'NONE')} className="win-btn px-6 h-full flex items-center text-[#ff8c00] pixel-font text-lg">
            MENU
          </button>
          <div className="ml-4 flex gap-2">
            {creatorMode === 'MENU' && (
              <>
                <button onClick={() => setCreatorMode('TRACK')} className="win-btn px-5 h-10 text-[11px] pixel-font text-white">TRACK_REC</button>
                <button onClick={() => setCreatorMode('BOX')} className="win-btn px-5 h-10 text-[11px] pixel-font text-white">BOX_PACK</button>
              </>
            )}
          </div>
        </nav>
      )}

      {/* Track Maker UI */}
      {creatorMode === 'TRACK' && (
        <div className="fixed inset-0 z-[4500] bg-black/90 flex items-center justify-center p-4">
          <div className="win-btn p-4 w-full max-w-md bg-[#2c3e50]">
            <div className="bg-[#5d6d7e] p-2 mb-4 text-[12px] pixel-font flex justify-between items-center text-white">
              <span>TRACK_MAKER</span>
              <button onClick={() => setCreatorMode('NONE')}>[X]</button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-6 bg-[#1a252f] p-3">
              {pads.map((p, i) => (
                <div key={i} className="aspect-square win-btn bg-[#23395d] flex items-center justify-center overflow-hidden cursor-pointer relative">
                  {!p ? (
                    <label className="w-full h-full flex items-center justify-center opacity-20 pixel-font text-xs">＋<input type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadToPad(i, e.target.files[0])} /></label>
                  ) : (
                    <div onClick={() => setTrackData(prev => [...prev, p])} className="w-full h-full"><img src={p.image_url} className="w-full h-full object-cover opacity-80" /></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreviewTrack(true)} className="win-btn flex-1 py-3 text-sm pixel-font text-orange-400">PREVIEW</button>
              <button onClick={() => handlePost('TRACK_TYPE', {description: JSON.stringify(trackData)})} className="win-btn flex-1 py-3 text-sm pixel-font text-orange-400">RELEASE</button>
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

function TrackPlayer({data, onComplete}: any) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if(!data || data.length === 0) return;
    const timer = setInterval(() => {
      setIdx(v => {
        if (v >= data.length - 1) { clearInterval(timer); setTimeout(onComplete, 800); return v; }
        return v + 1;
      });
    }, 450);
    return () => clearInterval(timer);
  }, [data, onComplete]);
  const current = data[idx];
  
  // トラック再生中にテキストが含まれていても表示しない（画像のみを表示）
  if (!current?.image_url || current.image_url === 'NODE') return null;

  return (
    <div className="flex items-center justify-center w-full h-full">
      <img key={idx} src={current.image_url} className="max-h-[85vh] object-contain shadow-[0_0_60px_rgba(0,0,0,0.5)]" />
    </div>
  );
}

function BoxViewer({node}: any) {
  const data = JSON.parse(node.description || '[]');
  // Box内でも画像がないものはスキップ
  const visualItems = data.filter((item:any) => item.image_url && item.image_url !== 'NODE');
  
  return (
    <div className="w-full h-full flex items-center overflow-x-auto p-4 space-x-6 scrollbar-hide">
      {visualItems.map((item: any, i: number) => (
        <div key={i} className="flex-shrink-0 win-btn p-[2px] bg-[#23395d]">
          <img src={item.image_url} className="h-[65vh] object-contain" />
        </div>
      ))}
    </div>
  );
}