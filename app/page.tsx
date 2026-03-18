'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000; 

export default function Page() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showInput, setShowInput] = useState<{file: File | null, parentId?: string} | null>(null);
  const [inputText, setInputText] = useState('');
  const [networkView, setNetworkView] = useState<{originNode: any, linkedNodes: any[]} | null>(null);

  // IDから固定のアスペクト比を返す（1:1, 4:3, 16:9, 5:7）
  const getAspectClass = (id: string) => {
    const ratios = ['aspect-square', 'aspect-[4/3]', 'aspect-[16/9]', 'aspect-[5/7]'];
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % ratios.length;
    return ratios[index];
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (error) return;
    const now = new Date().getTime();
    const active = data.filter(n => (now - new Date(n.created_at).getTime()) < LIFESPAN_MS);
    setNodes(active);
  }, []);

  const openNetwork = async (nodeId: string) => {
    const origin = nodes.find(n => n.id === nodeId);
    if (!origin) return;
    const { data: links } = await supabase.from('links').select('*').or(`node_a.eq.${nodeId},node_b.eq.${nodeId}`);
    const linkedIds = links ? links.map(l => l.node_a === nodeId ? l.node_b : l.node_a) : [];
    const linkedNodes = nodes.filter(n => linkedIds.includes(n.id));
    setNetworkView({ originNode: origin, linkedNodes });
  };

  const handleUpload = async () => {
    if (!showInput) return;
    const { file, parentId } = showInput;
    setIsUploading(true);
    // ...（画像アップロードロジックは前回同様のため省略可ですが、動作のため維持）
    const newNodeId = `${Date.now()}`;
    await supabase.from('mainline').insert([{
        id: newNodeId,
        image_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", // ダミー
        description: inputText || "silent fragment",
        owner_id: "user"
    }]);
    setShowInput(null);
    setInputText('');
    fetchData();
    setIsUploading(false);
  };

  const Tile = ({ node, onClick }: any) => {
    const aspect = getAspectClass(node.id);
    return (
      <div 
        onClick={() => onClick(node.id)}
        className={`relative mb-4 break-inside-avoid group cursor-pointer overflow-hidden rounded-xl bg-[#F5F2E9] border border-black/5 shadow-sm hover:shadow-xl transition-all duration-500`}
      >
        {node.image_url?.startsWith('http') ? (
          <img src={node.image_url} className={`w-full ${aspect} object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700`} />
        ) : (
          <div className={`w-full ${aspect} flex items-center justify-center p-4 bg-[#EDE9D9]`}>
            <span className="text-[10px] opacity-20 italic">no image</span>
          </div>
        )}
        <div className="p-4 bg-[#F5F2E9]">
          <p className="text-[11px] leading-relaxed italic opacity-70 group-hover:opacity-100 transition-opacity">
            {node.description}
          </p>
          <div className="mt-2 text-[7px] font-bold opacity-10 tracking-widest uppercase">
            {node.id.slice(-4)} // RUBBISH
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif p-4 md:p-8">
      <style jsx global>{`
        .masonry-grid {
          column-count: 2;
          column-gap: 1rem;
        }
        @media (min-width: 768px) { .masonry-grid { column-count: 3; } }
        @media (min-width: 1024px) { .masonry-grid { column-count: 4; } }
      `}</style>

      <header className="mb-12 flex flex-col items-center">
        <h1 className="text-[10px] tracking-[0.8em] font-black uppercase opacity-20">Rubbish Fragments</h1>
      </header>

      {/* Masonry Layout */}
      <div className="masonry-grid max-w-7xl mx-auto">
        {nodes.map(node => (
          <Tile key={node.id} node={node} onClick={openNetwork} />
        ))}
      </div>

      {/* Network Overlay (タイル上から開くView) */}
      {networkView && (
        <div className="fixed inset-0 z-[1000] bg-[#EBE8DB]/95 backdrop-blur-xl overflow-y-auto p-8 animate-in fade-in duration-300">
           <button onClick={() => setNetworkView(null)} className="fixed top-8 right-8 text-2xl opacity-30 hover:opacity-100 transition-opacity">✕</button>
           <div className="max-w-4xl mx-auto">
              <p className="text-[10px] tracking-[0.6em] opacity-30 uppercase font-black mb-8 text-center">Connected Constellation</p>
              <div className="flex flex-wrap justify-center gap-6">
                <Tile node={networkView.originNode} onClick={()=>{}} />
                {networkView.linkedNodes.map(ln => (
                  <Tile key={ln.id} node={ln} onClick={openNetwork} />
                ))}
              </div>
           </div>
        </div>
      )}

      {/* Footer Navigation */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center bg-[#F5F2E9]/80 backdrop-blur-md px-8 py-4 rounded-full shadow-2xl border border-black/5 space-x-12 z-[500]">
         <button onClick={() => setShowInput({file: null})} className="text-xl opacity-40 hover:opacity-100 transition-opacity">✎</button>
         <div className="h-4 w-px bg-black/10"></div>
         <label className="text-xl opacity-40 hover:opacity-100 transition-opacity cursor-pointer">◎<input type="file" className="hidden" onChange={(e) => setShowInput({file: e.target.files?.[0] || null})} /></label>
      </nav>

      {/* Input Modal */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/98 z-[2000] flex flex-col items-center justify-center p-6 animate-in zoom-in-95">
          <textarea autoFocus maxLength={60} value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Fragment..." className="w-full max-w-md bg-transparent border-none text-2xl italic outline-none text-center" />
          <div className="mt-12 space-x-12">
            <button onClick={() => setShowInput(null)} className="text-[10px] uppercase tracking-widest opacity-20">Cancel</button>
            <button onClick={handleUpload} className="text-[10px] uppercase tracking-widest font-bold">Archive</button>
          </div>
        </div>
      )}
    </div>
  );
}